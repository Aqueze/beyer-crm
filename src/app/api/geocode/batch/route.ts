import { NextRequest, NextResponse } from "next/server";
import { geocode, buildAddressString } from "@/lib/services/geocoder";

interface BatchGeocodeRequest {
  addresses: Array<{
    id: string;
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  }>;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as BatchGeocodeRequest;
  const { addresses } = body;
  
  if (!addresses || !Array.isArray(addresses)) {
    return NextResponse.json({ error: "addresses array required" }, { status: 400 });
  }
  
  const results: Array<{
    id: string;
    success: boolean;
    latitude?: number;
    longitude?: number;
    formatted?: string;
    error?: string;
  }> = [];
  
  for (const addr of addresses) {
    const fullAddress = buildAddressString(addr.street, addr.city, addr.postalCode, addr.country);
    
    if (!fullAddress.trim()) {
      results.push({
        id: addr.id,
        success: false,
        error: "No address provided"
      });
      continue;
    }
    
    const result = await geocode({ address: fullAddress });
    
    if (result.success && result.data) {
      results.push({
        id: addr.id,
        success: true,
        latitude: result.data.latitude,
        longitude: result.data.longitude,
        formatted: result.data.formattedAddress
      });
    } else {
      results.push({
        id: addr.id,
        success: false,
        error: result.error || "Geocoding failed"
      });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  
  return NextResponse.json({
    total: addresses.length,
    successful: successCount,
    failed: addresses.length - successCount,
    results
  });
}