import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { domainLookups } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/domains/[id] - Get single domain lookup
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const [record] = await db.select().from(domainLookups).where(eq(domainLookups.id, id)).limit(1);
  
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  
  return NextResponse.json(record);
}

// PUT /api/domains/[id] - Update domain lookup
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { companyName, website, country, manuallyOverridden } = body;
  
  const [record] = await db.update(domainLookups)
    .set({
      companyName: companyName ?? null,
      website: website ?? null,
      country: country ?? null,
      manuallyOverridden: manuallyOverridden ?? true,
      updatedAt: new Date()
    })
    .where(eq(domainLookups.id, id))
    .returning();
  
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  
  return NextResponse.json(record);
}

// DELETE /api/domains/[id] - Delete domain lookup
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const [record] = await db.delete(domainLookups)
    .where(eq(domainLookups.id, id))
    .returning();
  
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  
  return NextResponse.json({ success: true });
}