import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const results = await db
    .select()
    .from(interactions)
    .where(eq(interactions.contactId, id))
    .orderBy(desc(interactions.createdAt))
    .limit(50);
  return NextResponse.json(results);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [result] = await db
    .insert(interactions)
    .values({ ...body, contactId: id })
    .returning();
  return NextResponse.json(result, { status: 201 });
}
