import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Geocoder Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildAddressString", () => {
    it("should build full address from all fields", async () => {
      const { buildAddressString } = await import("@/lib/services/geocoder");
      const result = buildAddressString("Industriestr 5", "München", "80331", "Germany");
      expect(result).toBe("Industriestr 5, 80331, München, Germany");
    });

    it("should skip missing fields", async () => {
      const { buildAddressString } = await import("@/lib/services/geocoder");
      const result = buildAddressString(undefined, "Berlin", undefined, "Germany");
      expect(result).toBe("Berlin, Germany");
    });

    it("should return empty for empty input", async () => {
      const { buildAddressString } = await import("@/lib/services/geocoder");
      const result = buildAddressString(undefined, undefined, undefined, undefined);
      expect(result).toBe("");
    });

    it("should handle German umlauts in address", async () => {
      const { buildAddressString } = await import("@/lib/services/geocoder");
      // All parts present
      const result = buildAddressString("Münchener Str 10", "Köln", "50667", "Germany");
      expect(result).toBe("Münchener Str 10, 50667, Köln, Germany");
    });
  });

  describe("latLngToEwkbHex", () => {
    it("should convert lat/lng to EWKB hex string", async () => {
      const { latLngToEwkbHex } = await import("@/lib/services/geocoder");
      const result = latLngToEwkbHex(48.1372, 11.5765);
      // EWKB: 0101 = little-endian POINT with SRID, 20E6 = SRID 4326
      expect(result).toMatch(/^0101000020E6/);
      expect(result.length).toBeGreaterThan(40);
    });

    it("should handle negative coordinates", async () => {
      const { latLngToEwkbHex } = await import("@/lib/services/geocoder");
      const result = latLngToEwkbHex(-33.8688, -151.2093); // Sydney
      expect(result).toMatch(/^0101000020E6/);
      expect(result.length).toBeGreaterThan(40);
    });
  });
});
