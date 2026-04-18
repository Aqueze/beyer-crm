import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");
  const radius = parseInt(searchParams.get("radius") || "50000"); // meters

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const results = await db.execute(sql`
    SELECT c.*, 
      ST_Distance(c.location::geography, ST_MakePoint(${lng}, ${lat})::geography) AS distance_m
    FROM contacts c
    WHERE c.location IS NOT NULL
      AND ST_DWithin(c.location::geography, ST_MakePoint(${lng}, ${lat})::geography, ${radius})
    ORDER BY distance_m
    LIMIT 50
  `);

  return NextResponse.json(Array.from(results));
}
