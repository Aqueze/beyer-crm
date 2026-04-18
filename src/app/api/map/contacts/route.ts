import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");
  const radius = parseFloat(searchParams.get("radius") || "50000"); // meters

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  // Get contacts with location
  const results = await db.execute(sql`
    SELECT
      c.id,
      c."firstName",
      c."lastName",
      c.email,
      c.phone,
      c.location,
      ST_X(c.location::geometry) as lng,
      ST_Y(c.location::geometry) as lat,
      ST_Distance(c.location, ST_MakePoint(${lng}, ${lat})::geography) as distance_m
    FROM contacts c
    WHERE c.location IS NOT NULL
      AND ST_DWithin(c.location, ST_MakePoint(${lng}, ${lat})::geography, ${radius})
    ORDER BY distance_m
    LIMIT 50
  `);

  const features = (results as any[]).map((row) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [row.lng, row.lat] },
    properties: {
      id: row.id,
      name: `${row.firstName} ${row.lastName}`,
      email: row.email,
      phone: row.phone,
      distance: Math.round(row.distance_m),
    },
  }));

  return NextResponse.json({ type: "FeatureCollection", features });
}
