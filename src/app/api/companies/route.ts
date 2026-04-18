import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { like, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200); // cap at 200
  const offset = (page - 1) * limit;

  const conditions = q
    ? or(
        like(companies.name, `%${q}%`),
        like(companies.domain, `%${q}%`)
      )
    : undefined;

  const results = await db
    .select()
    .from(companies)
    .where(conditions)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    companies: results,
    page,
    limit,
    hasMore: results.length === limit
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [result] = await db.insert(companies).values(body).returning();
  return NextResponse.json(result, { status: 201 });
}
