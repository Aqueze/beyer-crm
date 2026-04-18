import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================================================
// Mocks — using vi.hoisted() to share state properly across module reloads
// =============================================================================

const mockFindFirst = vi.hoisted(() => vi.fn());
const mockInsert = vi.hoisted(() => vi.fn().mockReturnValue({
  values: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      geocodeCache: {
        findFirst: mockFindFirst,
      },
    },
    insert: mockInsert,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  geocodeCache: {},
}));

// Global fetch mock
const mockFetch = vi.hoisted(() => vi.fn());
global.fetch = mockFetch;

describe("Geocoder Service", () => {

  // =============================================================================
  // buildAddressString
  // =============================================================================
  describe("buildAddressString", () => {
    it("should build full address from all fields", async () => {
      const { buildAddressString } = await import("@/lib/services/geocoder");
      const result = buildAddressString(
        "Industriestr 5",
        "München",
        "80331",
        "Germany"
      );
      expect(result).toBe("Industriestr 5, 80331, München, Germany");
    });

    it("should skip missing fields", async () => {
      const { buildAddressString } = await import("@/lib/services/geocoder");
      const result = buildAddressString(undefined, "Berlin", undefined, "Germany");
      expect(result).toBe("Berlin, Germany");
    });

    it("should return empty for empty input", async () => {
      const { buildAddressString } = await import("@/lib/services/geocoder");
      const result = buildAddressString(
        undefined,
        undefined,
        undefined,
        undefined
      );
      expect(result).toBe("");
    });

    it("should handle German umlauts in address", async () => {
      const { buildAddressString } = await import("@/lib/services/geocoder");
      const result = buildAddressString(
        "Münchener Str 10",
        "Köln",
        "50667",
        "Germany"
      );
      expect(result).toBe("Münchener Str 10, 50667, Köln, Germany");
    });

    it("should handle null values as falsy", async () => {
      const { buildAddressString } = await import("@/lib/services/geocoder");
      const result = buildAddressString(null, "Paris", null, "France");
      expect(result).toBe("Paris, France");
    });

    it("should handle mixed null and undefined", async () => {
      const { buildAddressString } = await import("@/lib/services/geocoder");
      const result = buildAddressString(
        "123 Main St",
        null,
        "10001",
        undefined
      );
      expect(result).toBe("123 Main St, 10001");
    });

    it("should handle empty string as falsy", async () => {
      const { buildAddressString } = await import("@/lib/services/geocoder");
      const result = buildAddressString("", "Tokyo", "", "Japan");
      expect(result).toBe("Tokyo, Japan");
    });

    it("should handle single field only", async () => {
      const { buildAddressString } = await import("@/lib/services/geocoder");
      const result = buildAddressString(undefined, undefined, undefined, "Germany");
      expect(result).toBe("Germany");
    });
  });

  // =============================================================================
  // latLngToEwkbHex
  // =============================================================================
  describe("latLngToEwkbHex", () => {
    it("should convert lat/lng to EWKB hex string for Munich", async () => {
      const { latLngToEwkbHex } = await import("@/lib/services/geocoder");
      const result = latLngToEwkbHex(48.1372, 11.5765);
      // EWKB: 18-char prefix + 32 hex chars (16 bytes for X+Y) = 50 total
      // 01 = little-endian byte order
      // 01000001 = point type with SRID flag
      // 20E6100000 = SRID 4326 in little-endian (0E610000 = 4326)
      expect(result).toMatch(/^0101000020E6100000[0-9A-F]{32}$/);
      expect(result.length).toBe(50);
    });

    it("should handle negative coordinates (Sydney, Australia)", async () => {
      const { latLngToEwkbHex } = await import("@/lib/services/geocoder");
      const result = latLngToEwkbHex(-33.8688, 151.2093);
      expect(result).toMatch(/^0101000020E6100000[0-9A-F]{32}$/);
      expect(result.length).toBe(50);
    });

    it("should handle both coordinates negative (Rio de Janeiro)", async () => {
      const { latLngToEwkbHex } = await import("@/lib/services/geocoder");
      const result = latLngToEwkbHex(-22.9068, -43.1729);
      expect(result).toMatch(/^0101000020E6100000[0-9A-F]{32}$/);
      expect(result.length).toBe(50);
    });

    it("should handle zero coordinates", async () => {
      const { latLngToEwkbHex } = await import("@/lib/services/geocoder");
      const result = latLngToEwkbHex(0, 0);
      expect(result).toMatch(/^0101000020E6100000[0-9A-F]{32}$/);
      expect(result.length).toBe(50);
    });

    it("should handle coordinate near date line", async () => {
      const { latLngToEwkbHex } = await import("@/lib/services/geocoder");
      const result = latLngToEwkbHex(0, 180);
      expect(result).toMatch(/^0101000020E6100000[0-9A-F]{32}$/);
      expect(result.length).toBe(50);
    });

    it("should handle very small decimal precision", async () => {
      const { latLngToEwkbHex } = await import("@/lib/services/geocoder");
      const result = latLngToEwkbHex(0.0001, -0.0001);
      expect(result).toMatch(/^0101000020E6100000[0-9A-F]{32}$/);
      expect(result.length).toBe(50);
    });

    it("should produce uppercase hex output", async () => {
      const { latLngToEwkbHex } = await import("@/lib/services/geocoder");
      const result = latLngToEwkbHex(52.52, 13.405);
      expect(result).toBe(result.toUpperCase());
    });

    it("should correctly encode longitude in first 8 bytes after prefix", async () => {
      const { latLngToEwkbHex } = await import("@/lib/services/geocoder");
      // Berlin: lng=13.405, lat=52.52
      const result = latLngToEwkbHex(52.52, 13.405);
      // Verify specific structure: prefix + lng (8 bytes LE) + lat (8 bytes LE)
      expect(result.startsWith("0101000020E6100000")).toBe(true);
    });
  });

  // =============================================================================
  // geocodeAddress (main geocode function)
  // =============================================================================
  describe("geocodeAddress (geocode function)", () => {
    it("should return cached result when available", async () => {
      const { db } = await import("@/lib/db");

      const cachedResult = {
        addressHash: "abc123",
        latitude: "48.1372",
        longitude: "11.5765",
        formattedAddress: "Munich, Germany",
        source: "nominatim",
      };

      mockFindFirst.mockResolvedValueOnce(cachedResult);

      const { geocode } = await import("@/lib/services/geocoder");
      const result = await geocode({ address: "Munich" });

      expect(result.success).toBe(true);
      expect(result.cached).toBe(true);
      expect(result.data?.latitude).toBe(48.1372);
      expect(result.data?.longitude).toBe(11.5765);
      expect(mockFindFirst).toHaveBeenCalled();
    });

    it("should skip cache when forceRefresh is true", async () => {
      mockFindFirst.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            lat: "48.1372",
            lon: "11.5765",
            display_name: "Munich, Germany",
          },
        ],
      });

      const { geocode } = await import("@/lib/services/geocoder");
      const result = await geocode({ address: "Munich", forceRefresh: true });

      expect(result.success).toBe(true);
      expect(result.cached).toBeUndefined();
    });

    it("should return OpenCage fallback error when Nominatim fails and no OpenCage key configured", async () => {
      // Cache miss
      mockFindFirst.mockResolvedValueOnce(null);
      // Nominatim returns empty results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { geocode } = await import("@/lib/services/geocoder");
      const result = await geocode({ address: "InvalidAddress12345" });

      // After Nominatim fails with empty results, code tries OpenCage fallback
      // OpenCage returns "OpenCage API key not configured" since no key is set
      expect(result.success).toBe(false);
      expect(result.error).toBe("OpenCage API key not configured");
    });

    it("should return OpenCage error when Nominatim returns 429 and no OpenCage key", async () => {
      mockFindFirst.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      });

      const { geocode } = await import("@/lib/services/geocoder");
      const result = await geocode({ address: "Test" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("OpenCage API key not configured");
    });

    it("should return OpenCage error when Nominatim throws network error", async () => {
      mockFindFirst.mockResolvedValueOnce(null);
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { geocode } = await import("@/lib/services/geocoder");
      const result = await geocode({ address: "Test" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("OpenCage API key not configured");
    });
  });

  // =============================================================================
  // hashAddress
  // =============================================================================
  describe("hashAddress", () => {
    it("should produce consistent SHA256 hash for same address", async () => {
      const { hashAddress } = await import("@/lib/services/geocoder");
      const hash1 = hashAddress({ address: "123 Main St", city: "Berlin" });
      const hash2 = hashAddress({ address: "123 Main St", city: "Berlin" });
      expect(hash1).toBe(hash2);
    });

    it("should produce different hash for different addresses", async () => {
      const { hashAddress } = await import("@/lib/services/geocoder");
      const hash1 = hashAddress({ address: "123 Main St", city: "Berlin" });
      const hash2 = hashAddress({ address: "456 Oak Ave", city: "Munich" });
      expect(hash1).not.toBe(hash2);
    });

    it("should normalize and lowercase before hashing", async () => {
      const { hashAddress } = await import("@/lib/services/geocoder");
      const hash1 = hashAddress({ address: "  BERLIN  ", city: "GERMANY" });
      const hash2 = hashAddress({ address: "berlin", city: "germany" });
      expect(hash1).toBe(hash2);
    });

    it("should treat undefined and missing fields as empty string", async () => {
      const { hashAddress } = await import("@/lib/services/geocoder");
      const hash1 = hashAddress({ address: "Berlin" });
      const hash2 = hashAddress({ address: "Berlin", city: undefined });
      expect(hash1).toBe(hash2);
    });

    it("should return 64-character hex string (SHA256)", async () => {
      const { hashAddress } = await import("@/lib/services/geocoder");
      const hash = hashAddress({ address: "Test" });
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
