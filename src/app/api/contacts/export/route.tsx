import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "vcard";
  const idsParam = searchParams.get("ids");
  const MAX_EXPORT = 10000; // Safety limit for exports

  // Parse IDs if provided
  const contactIds = idsParam
    ? idsParam.split(",").filter(Boolean).slice(0, MAX_EXPORT)
    : null;

  // Fetch contacts — filter in DB if IDs provided, otherwise limit for safety
  const contactList = contactIds && contactIds.length > 0
    ? await db.select().from(contacts).where(inArray(contacts.id, contactIds))
    : await db.select().from(contacts).limit(MAX_EXPORT);

  if (format === "csv") {
    return exportCsv(contactList);
  } else if (format === "pdf") {
    return exportPdfLabels(contactList);
  } else {
    return exportVCard(contactList);
  }
}

interface ContactRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  companyId: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
  tags: string[] | null;
  notes: string | null;
  locationSource: string | null;
  createdAt: Date | null;
}

function exportVCard(contactList: ContactRow[]) {
  let vcardString = "";

  for (const contact of contactList) {
    // Simple vCard format
    vcardString += "BEGIN:VCARD\r\n";
    vcardString += "VERSION:3.0\r\n";
    vcardString += `N:${contact.lastName};${contact.firstName};;;\r\n`;
    vcardString += `FN:${contact.firstName} ${contact.lastName}\r\n`;

    if (contact.email) {
      vcardString += `EMAIL:${contact.email}\r\n`;
    }
    if (contact.phone) {
      vcardString += `TEL:${contact.phone}\r\n`;
    }

    if (contact.addressStreet || contact.addressCity || contact.addressPostalCode || contact.addressCountry) {
      vcardString += `ADR:;;${contact.addressStreet || ""};${contact.addressCity || ""};${contact.addressPostalCode || ""};${contact.addressCountry || ""}\r\n`;
    }

    if (contact.notes) {
      vcardString += `NOTE:${contact.notes}\r\n`;
    }

    vcardString += "END:VCARD\r\n";
  }

  return new NextResponse(vcardString, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"contacts.vcf\"",
    },
  });
}

function exportCsv(contactList: ContactRow[]) {
  const headers = [
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Company ID",
    "Street",
    "City",
    "Postal Code",
    "Country",
    "Tags",
    "Notes",
    "Location Source",
    "Created At",
  ];

  const escapeCsv = (value: string | null | undefined): string => {
    const str = value ?? "";
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = contactList.map((contact) => [
    escapeCsv(contact.firstName),
    escapeCsv(contact.lastName),
    escapeCsv(contact.email),
    escapeCsv(contact.phone),
    escapeCsv(contact.companyId),
    escapeCsv(contact.addressStreet),
    escapeCsv(contact.addressCity),
    escapeCsv(contact.addressPostalCode),
    escapeCsv(contact.addressCountry),
    escapeCsv((contact.tags || []).join(";")),
    escapeCsv(contact.notes),
    escapeCsv(contact.locationSource),
    escapeCsv(contact.createdAt ? new Date(contact.createdAt).toISOString() : ""),
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"contacts.csv\"",
    },
  });
}

async function exportPdfLabels(contactList: ContactRow[]) {
  const { renderToBuffer, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");

  const styles = StyleSheet.create({
    page: {
      flexDirection: "column",
      padding: 20,
    },
    label: {
      border: "1pt solid #000",
      padding: 10,
      marginBottom: 10,
    },
    name: {
      fontSize: 12,
      fontWeight: "bold",
      marginBottom: 4,
    },
    addressLine: {
      fontSize: 10,
      marginBottom: 2,
    },
    contactInfo: {
      fontSize: 9,
      color: "#444",
      marginTop: 4,
    },
  });

  const LabelDocument = ({ contacts: cts }: { contacts: ContactRow[] }) => (
    <Document>
      <Page size="A4" style={styles.page}>
        {cts.map((contact) => {
          const addressLines = [
            contact.addressStreet,
            contact.addressPostalCode ? `${contact.addressPostalCode} ${contact.addressCity || ""}` : contact.addressCity,
            contact.addressCountry,
          ].filter(Boolean);

          return (
            <View key={contact.id} style={styles.label}>
              <Text style={styles.name}>
                {contact.firstName} {contact.lastName}
              </Text>
              {addressLines.map((line, i) => (
                <Text key={i} style={styles.addressLine}>{line}</Text>
              ))}
              {(contact.email || contact.phone) && (
                <Text style={styles.contactInfo}>
                  {contact.email}{contact.phone ? ` | ${contact.phone}` : ""}
                </Text>
              )}
            </View>
          );
        })}
      </Page>
    </Document>
  );

  const pdfBuffer = await renderToBuffer(<LabelDocument contacts={contactList} />);
  const uint8Array = new Uint8Array(pdfBuffer as unknown as ArrayBuffer);

  return new NextResponse(uint8Array, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"contacts-labels.pdf\"",
    },
  });
}