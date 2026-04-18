import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { domainLookups } from "@/lib/db/schema";
import { lookupDomain } from "@/lib/services/domain-lookup";
import { eq } from "drizzle-orm";

// GET /api/domains/lookup?email=user@domain.com
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  
  if (!email) {
    return NextResponse.json({ error: "email query parameter required" }, { status: 400 });
  }
  
  const result = await lookupDomain({ email });
  
  if (!result) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  
  return NextResponse.json(result);
}

// POST /api/domains/lookup - Create/update domain mapping
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { domain, companyName, website, country } = body;
  
  if (!domain) {
    return NextResponse.json({ error: "domain required" }, { status: 400 });
  }
  
  // Clean domain
  const cleanDomain = domain.toLowerCase().trim();
  
  // Store in database
  const [record] = await db.insert(domainLookups).values({
    domain: cleanDomain,
    companyName: companyName || null,
    website: website || null,
    country: country || null,
    manuallyOverridden: true
  }).returning();
  
  return NextResponse.json(record, { status: 201 });
}