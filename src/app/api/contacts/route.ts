import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq, like, or, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  let query = db.select().from(contacts).limit(limit).offset(offset);
  if (q) {
    query = db
      .select()
      .from(contacts)
      .where(
        or(
          like(contacts.firstName, `%${q}%`),
          like(contacts.lastName, `%${q}%`),
          like(contacts.email, `%${q}%`)
        )
      )
      .limit(limit)
      .offset(offset) as any;
  }
  const results = await query;
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [result] = await db.insert(contacts).values(body).returning();
  return NextResponse.json(result, { status: 201 });
}
