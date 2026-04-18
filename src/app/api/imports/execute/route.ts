import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { imports, contacts, companies } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { lookupDomain } from "@/lib/services/domain-lookup";
import { geocode, buildAddressString } from "@/lib/services/geocoder";

interface ColumnMapping {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  addressStreet?: string;
  addressCity?: string;
  addressPostalCode?: string;
  addressCountry?: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mappingStr = formData.get("mapping") as string | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    if (!mappingStr) {
      return NextResponse.json({ error: "No column mapping provided" }, { status: 400 });
    }
    
    const mapping: ColumnMapping = JSON.parse(mappingStr);
    
    // Parse Excel file
    const buffer = await file.arrayBuffer();
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // header: 1 returns array of arrays
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
    
    if (rows.length < 2) {
      return NextResponse.json({ error: "File must have header and data rows" }, { status: 400 });
    }
    
    const headers = rows[0].map(h => String(h ?? ""));
    const dataRows = rows.slice(1).filter(row => row.some(cell => cell != null));
    
    // Create import record
    const [importRecord] = await db.insert(imports).values({
      filename: file.name,
      columnMapping: mapping,
      status: "running",
      totalRows: dataRows.length,
      importedRows: 0,
      errorLog: []
    }).returning();
    
    let importedCount = 0;
    const errors: Array<{row: number, error: string}> = [];
    
    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      try {
        // Extract field values using column mapping
        const getValue = (field: keyof ColumnMapping): string => {
          const colIndex = headers.indexOf(mapping[field] || "");
          return colIndex >= 0 ? String(row[colIndex] ?? "") : "";
        };
        
        const firstName = getValue("firstName").trim();
        const lastName = getValue("lastName").trim();
        const email = getValue("email").trim();
        const phone = getValue("phone").trim();
        const companyName = getValue("company").trim();
        const addressStreet = getValue("addressStreet").trim();
        const addressCity = getValue("addressCity").trim();
        const addressPostalCode = getValue("addressPostalCode").trim();
        const addressCountry = getValue("addressCountry").trim();
        
        if (!firstName && !lastName && !email) {
          errors.push({ row: i + 2, error: "No identifying info (name/email)" });
          continue;
        }
        
        // Handle company
        let companyId: string | null = null;
        let companyLocation: string | null = null;
        
        if (companyName) {
          // Create company (check for existing would be done by name in production)
          const [newCompany] = await db.insert(companies).values({
            name: companyName,
            addressStreet: addressStreet || null,
            addressCity: addressCity || null,
            addressPostalCode: addressPostalCode || null,
            addressCountry: addressCountry || null
          }).returning();
          
          companyId = newCompany.id;
          
          // Geocode company address if provided
          if (addressStreet || addressCity) {
            const companyAddress = buildAddressString(addressStreet, addressCity, addressPostalCode, addressCountry);
            const result = await geocode({ address: companyAddress });
            if (result.success && result.data) {
              // Update company with location (PostGIS EWKB)
              await db.execute(sql`
                UPDATE companies 
                SET location = ST_SetSRID(ST_MakePoint(${result.data.longitude}::float, ${result.data.latitude}::float), 4326)::geography,
                    location_source = 'own_address'
                WHERE id = ${companyId}
              `);
              companyLocation = `SRID=4326;POINT(${result.data.longitude} ${result.data.latitude})`;
            }
          }
        }
        
        // Determine contact location
        let contactLocation: string | null = null;
        let locationSource: "own_address" | "company" | "email_domain" = "own_address";
        
        // Geocode contact address if provided
        if (addressStreet || addressCity) {
          const contactAddress = buildAddressString(addressStreet, addressCity, addressPostalCode, addressCountry);
          const result = await geocode({ address: contactAddress });
          if (result.success && result.data) {
            contactLocation = `SRID=4326;POINT(${result.data.longitude} ${result.data.latitude})`;
            locationSource = "own_address";
          }
        }
        
        // If no contact address but company has location, use company location
        if (!contactLocation && companyId && companyLocation) {
          contactLocation = companyLocation;
          locationSource = "company";
        }
        
        // If still no location, try domain lookup via email
        if (!contactLocation && email) {
          const domainResult = await lookupDomain({ email });
          if (domainResult && domainResult.country) {
            locationSource = "email_domain";
            // Note: Without actual coordinates from domain, we can't set precise location
            // The contact will still be created but may not appear on map
          }
        }
        
        // Create contact
        await db.insert(contacts).values({
          firstName: firstName || "Unknown",
          lastName: lastName || "",
          email: email || null,
          phone: phone || null,
          companyId: companyId,
          addressStreet: addressStreet || null,
          addressCity: addressCity || null,
          addressPostalCode: addressPostalCode || null,
          addressCountry: addressCountry || null,
          location: contactLocation,
          locationSource: locationSource
        });
        
        importedCount++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        errors.push({ row: i + 2, error: errorMsg });
      }
    }
    
    // Update import record with final status
    await db.update(imports)
      .set({
        status: errors.length === dataRows.length ? "failed" : "completed",
        importedRows: importedCount,
        errorLog: errors,
        completedAt: new Date()
      })
      .where(eq(imports.id, importRecord.id));
    
    return NextResponse.json({
      importId: importRecord.id,
      totalRows: dataRows.length,
      importedRows: importedCount,
      failedRows: errors.length,
      errors
    });
    
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}