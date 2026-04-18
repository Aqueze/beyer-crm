import { NextRequest, NextResponse } from "next/server";
import { geocode, buildAddressString } from "@/lib/services/geocoder";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { street, city, postalCode, country } = body;
  
  const fullAddress = buildAddressString(street, city, postalCode, country);
  
  if (!fullAddress.trim()) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }
  
  const result = await geocode({ address: fullAddress });
  
  if (!result.success || !result.data) {
    return NextResponse.json({ error: result.error || "Geocoding failed" }, { status: 500 });
  }
  
  return NextResponse.json({
    latitude: result.data.latitude,
    longitude: result.data.longitude,
    formatted: result.data.formattedAddress
  });
}