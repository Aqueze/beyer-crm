import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";

export async function GET() {
  const all = await db.select().from(companies).limit(100);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [result] = await db.insert(companies).values(body).returning();
  return NextResponse.json(result, { status: 201 });
}
