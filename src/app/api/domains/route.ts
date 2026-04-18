import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { domainLookups } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const all = await db.select().from(domainLookups).limit(200);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [result] = await db.insert(domainLookups).values(body).returning();
  return NextResponse.json(result, { status: 201 });
}
