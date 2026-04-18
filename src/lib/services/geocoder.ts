/**
 * Geocoder Service
 * 
 * Nominatim (primary, 1 req/sec free) + OpenCage (fallback)
 * Rate-limited token bucket implementation
 * Results cached in geocode_cache DB table
 */

import { createHash } from "crypto";
import { db } from "../db";
import { geocodeCache } from "../db/schema";
import { eq } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  source: "nominatim" | "opencage";
}

export interface GeocodingOptions {
  address: string;
  city?: string;
  postalCode?: string;
  country?: string;
  forceRefresh?: boolean; // Skip cache
}

export interface GeocodeResult {
  success: boolean;
  data?: GeocodingResult;
  error?: string;
  cached?: boolean;
}

// ============================================================================
// Rate Limiter (Token Bucket)
// ============================================================================

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  readonly maxTokens: number;
  readonly refillRate: number; // tokens per second
}

const NOMINATIM_BUCKET: TokenBucket = {
  tokens: 1,
  lastRefill: Date.now(),
  maxTokens: 1,
  refillRate: 1, // 1 request per second
};

const OPENCAGE_BUCKET: TokenBucket = {
  tokens: 10,
  lastRefill: Date.now(),
  maxTokens: 10,
  refillRate: 10, // 10 requests per second (varies by plan)
};

function getTokens(bucket: TokenBucket): number {
  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  const refill = elapsed * bucket.refillRate;
  bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + refill);
  bucket.lastRefill = now;
  return Math.floor(bucket.tokens);
}

async function consumeToken(bucket: TokenBucket): Promise<void> {
  const tokens = getTokens(bucket);
  if (tokens < 1) {
    const waitTime = 1000 / bucket.refillRate;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  bucket.tokens -= 1;
}

// ============================================================================
// Address Hashing
// ============================================================================

export function hashAddress(address: GeocodingOptions): string {
  const normalized = [
    address.address,
    address.city,
    address.postalCode,
    address.country,
  ]
    .map((field) => (field || "").toLowerCase().trim())
    .join("|");

  return createHash("sha256").update(normalized).digest("hex");
}

// ============================================================================
// Nominatim Geocoding
// ============================================================================

async function geocodeNominatim(
  address: GeocodingOptions
): Promise<GeocodeResult> {
  await consumeToken(NOMINATIM_BUCKET);

  const queryParts = [
    address.address,
    address.city,
    address.postalCode,
    address.country,
  ].filter(Boolean);

  const query = encodeURIComponent(queryParts.join(", "));
  const url = `${process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org"}/search?q=${query}&format=json&limit=1&addressdetails=1`;

  const userAgent = "BeyCRM/1.0 (Beyer-Maschinenbau Internal CRM)";

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Nominatim error: ${response.status} ${response.statusText}`,
      };
    }

    const results = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    if (!results || results.length === 0) {
      return { success: false, error: "Address not found" };
    }

    const first = results[0];
    return {
      success: true,
      data: {
        latitude: parseFloat(first.lat),
        longitude: parseFloat(first.lon),
        formattedAddress: first.display_name,
        source: "nominatim",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Nominatim fetch error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}

// ============================================================================
// OpenCage Geocoding
// ============================================================================

async function geocodeOpenCage(address: GeocodingOptions): Promise<GeocodeResult> {
  const apiKey = process.env.OPENCAGE_API_KEY;

  if (!apiKey) {
    return { success: false, error: "OpenCage API key not configured" };
  }

  await consumeToken(OPENCAGE_BUCKET);

  const queryParts = [
    address.address,
    address.city,
    address.postalCode,
    address.country,
  ].filter(Boolean);

  const query = encodeURIComponent(queryParts.join(", "));
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${query}&key=${apiKey}&limit=1`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        error: `OpenCage error: ${response.status} ${response.statusText}`,
      };
    }

    const results = (await response.json()) as {
      results: Array<{
        geometry: { lat: number; lng: number };
        formatted: string;
      }>;
    };

    if (!results.results || results.results.length === 0) {
      return { success: false, error: "Address not found" };
    }

    const first = results.results[0];
    return {
      success: true,
      data: {
        latitude: first.geometry.lat,
        longitude: first.geometry.lng,
        formattedAddress: first.formatted,
        source: "opencage",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `OpenCage fetch error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}

// ============================================================================
// Cache Operations
// ============================================================================

async function getCachedResult(
  addressHash: string
): Promise<GeocodingResult | null> {
  const cached = await db.query.geocodeCache.findFirst({
    where: eq(geocodeCache.addressHash, addressHash),
  });

  if (!cached) return null;

  return {
    latitude: parseFloat(cached.latitude),
    longitude: parseFloat(cached.longitude),
    formattedAddress: cached.formattedAddress || "",
    source: cached.source as "nominatim" | "opencage",
  };
}

async function cacheResult(
  addressHash: string,
  result: GeocodingResult
): Promise<void> {
  await db.insert(geocodeCache).values({
    addressHash,
    latitude: result.latitude.toString(),
    longitude: result.longitude.toString(),
    formattedAddress: result.formattedAddress,
    source: result.source,
  });
}

// ============================================================================
// Main Geocoder Function
// ============================================================================

/**
 * Geocode an address using Nominatim (primary) with OpenCage fallback.
 * Results are cached in the database.
 * 
 * @param options - Address components to geocode
 * @returns Geocoding result with success status
 */
export async function geocode(options: GeocodingOptions): Promise<GeocodeResult> {
  const addressHash = hashAddress(options);

  // Check cache first (unless force refresh)
  if (!options.forceRefresh) {
    const cached = await getCachedResult(addressHash);
    if (cached) {
      return { success: true, data: cached, cached: true };
    }
  }

  // Try Nominatim first
  let result = await geocodeNominatim(options);

  // Fallback to OpenCage if Nominatim fails
  if (!result.success && result.error) {
    console.warn(`Nominatim failed: ${result.error}, trying OpenCage...`);
    result = await geocodeOpenCage(options);
  }

  // Cache successful result
  if (result.success && result.data) {
    try {
      await cacheResult(addressHash, result.data);
    } catch (error) {
      console.error("Failed to cache geocoding result:", error);
    }
  }

  return result;
}

// ============================================================================
// Batch Geocoding
// ============================================================================

export interface BatchGeocodingItem {
  id: string; // Contact or Company ID
  address: GeocodingOptions;
}

export interface BatchGeocodingProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    result?: GeocodingResult;
    error?: string;
  }>;
}

export type ProgressCallback = (progress: BatchGeocodingProgress) => void;

/**
 * Batch geocode multiple addresses with rate limiting.
 * 
 * @param items - Array of items to geocode
 * @param onProgress - Optional callback for progress updates
 * @returns Final progress state
 */
export async function geocodeBatch(
  items: BatchGeocodingItem[],
  onProgress?: ProgressCallback
): Promise<BatchGeocodingProgress> {
  const progress: BatchGeocodingProgress = {
    total: items.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    results: [],
  };

  for (const item of items) {
    try {
      const result = await geocode(item.address);

      if (result.success && result.data) {
        progress.succeeded++;
        progress.results.push({ id: item.id, success: true, result: result.data });
      } else {
        progress.failed++;
        progress.results.push({ id: item.id, success: false, error: result.error });
      }
    } catch (error) {
      progress.failed++;
      progress.results.push({
        id: item.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    progress.processed++;
    onProgress?.(progress);
  }

  return progress;
}

// ============================================================================
// Utility: Build EWKB Hex from Lat/Lng
// ============================================================================

/**
 * Convert latitude/longitude to PostGIS EWKB hex string (GEOGRAPHY(POINT, 4326))
 * 
 * EWKB format for POINT with SRID 4326:
 * 0101000020E6100000 + X (8 bytes little endian) + Y (8 bytes little endian)
 */
export function latLngToEwkbHex(lat: number, lng: number): string {
  // Create X coordinate buffer (longitude)
  const xBuffer = Buffer.alloc(8);
  xBuffer.writeDoubleLE(lng, 0);
  
  // Create Y coordinate buffer (latitude)
  const yBuffer = Buffer.alloc(8);
  yBuffer.writeDoubleLE(lat, 0);
  
  // Standard EWKB hex string: byteorder(1) + type(4) + srid(4) + X + Y
  // 01 = little endian
  // 01000001 = point type with SRID flag (0x20000000 | 0x00000001)
  // 0E610000 = SRID 4326 in little endian
  const hexStr = `0101000020E6100000${xBuffer.toString("hex")}${yBuffer.toString("hex")}`;
  return hexStr.toUpperCase();
}

/**
 * Build a full address string from components
 */
export function buildAddressString(
  street?: string | null,
  city?: string | null,
  postalCode?: string | null,
  country?: string | null
): string {
  const parts = [street, postalCode, city, country].filter(Boolean);
  return parts.join(", ");
}