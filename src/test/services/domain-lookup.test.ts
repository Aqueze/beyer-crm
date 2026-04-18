import { describe, it, expect } from "vitest";

describe("Domain Lookup Service", () => {
  describe("extractDomain", () => {
    it("should extract domain from email", async () => {
      const { extractDomain } = await import("@/lib/services/domain-lookup");
      expect(extractDomain("john.doe@siemens.com")).toBe("siemens.com");
      expect(extractDomain("info@Bayer.de")).toBe("bayer.de");
    });

    it("should return null for email without @", async () => {
      const { extractDomain } = await import("@/lib/services/domain-lookup");
      expect(extractDomain("notanemail")).toBeNull();
    });

    it("should extract domain from email starting with @", async () => {
      const { extractDomain } = await import("@/lib/services/domain-lookup");
      // extractDomain splits on @ and takes the second part
      expect(extractDomain("@nodomain.com")).toBe("nodomain.com");
    });

    it("should lowercase domain", async () => {
      const { extractDomain } = await import("@/lib/services/domain-lookup");
      expect(extractDomain("Test@EXAMPLE.COM")).toBe("example.com");
    });
  });

  describe("lookupDomain", () => {
    it("should be exported as a function", async () => {
      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      expect(typeof lookupDomain).toBe("function");
    });
  });
});
