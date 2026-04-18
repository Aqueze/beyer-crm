import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq, like, or, and, inArray, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const tags = searchParams.getAll("tag");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  const conditions = [];
  if (q) {
    conditions.push(
      or(
        like(contacts.firstName, `%${q}%`),
        like(contacts.lastName, `%${q}%`),
        like(contacts.email, `%${q}%`),
        like(contacts.phone, `%${q}%`)
      )
    );
  }
  if (tags.length > 0) {
    for (const tag of tags) {
      conditions.push(sql`${contacts.tags} @> ARRAY[${tag}]`);
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const results = await db
    .select()
    .from(contacts)
    .where(whereClause)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    contacts: results,
    page,
    limit,
    hasMore: results.length === limit
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [result] = await db.insert(contacts).values(body).returning();
  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.getAll("id");
  if (ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }
  await db.delete(contacts).where(inArray(contacts.id, ids));
  return NextResponse.json({ success: true, deleted: ids.length });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { ids, tags } = body;
  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }
  await db
    .update(contacts)
    .set({ tags, updatedAt: new Date() })
    .where(inArray(contacts.id, ids));
  return NextResponse.json({ success: true, updated: ids.length });
}