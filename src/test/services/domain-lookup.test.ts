import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================================================
// Mocks — using vi.hoisted() to share state properly across module reloads
// =============================================================================

const mockFindFirst = vi.hoisted(() => vi.fn());
const mockInsert = vi.hoisted(() => vi.fn().mockReturnValue({
  values: vi.fn().mockResolvedValue(undefined),
}));
const mockUpdate = vi.hoisted(() => vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      domainLookups: {
        findFirst: mockFindFirst,
        findMany: vi.fn(),
      },
    },
    insert: mockInsert,
    update: mockUpdate,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  domainLookups: {},
}));

// Global fetch mock
const mockFetch = vi.hoisted(() => vi.fn());
global.fetch = mockFetch;

describe("Domain Lookup Service", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFindFirst.mockReset();
    vi.clearAllMocks();
  });

  // =============================================================================
  // extractDomain
  // =============================================================================
  describe("extractDomain", () => {
    it("should extract domain from standard email", async () => {
      const { extractDomain } = await import("@/lib/services/domain-lookup");
      expect(extractDomain("john.doe@siemens.com")).toBe("siemens.com");
    });

    it("should lowercase domain", async () => {
      const { extractDomain } = await import("@/lib/services/domain-lookup");
      expect(extractDomain("john.doe@SIEMENS.COM")).toBe("siemens.com");
    });

    it("should trim whitespace", async () => {
      const { extractDomain } = await import("@/lib/services/domain-lookup");
      expect(extractDomain("  info@bayer.de  ")).toBe("bayer.de");
    });

    it("should return null for email without @", async () => {
      const { extractDomain } = await import("@/lib/services/domain-lookup");
      expect(extractDomain("notanemail")).toBeNull();
    });

    it("should return null for empty string", async () => {
      const { extractDomain } = await import("@/lib/services/domain-lookup");
      expect(extractDomain("")).toBeNull();
    });

    it("should return null for email with multiple @", async () => {
      const { extractDomain } = await import("@/lib/services/domain-lookup");
      expect(extractDomain("user@domain@extra.com")).toBeNull();
    });

    it("should return null for domain without TLD (no dot)", async () => {
      const { extractDomain } = await import("@/lib/services/domain-lookup");
      expect(extractDomain("user@localhost")).toBeNull();
    });

    it("should handle subdomain emails", async () => {
      const { extractDomain } = await import("@/lib/services/domain-lookup");
      expect(extractDomain("user@mail.company.co.uk")).toBe("mail.company.co.uk");
    });

    it("should handle email with plus sign", async () => {
      const { extractDomain } = await import("@/lib/services/domain-lookup");
      expect(extractDomain("user+tag@gmail.com")).toBe("gmail.com");
    });

    it("should handle email starting with @", async () => {
      const { extractDomain } = await import("@/lib/services/domain-lookup");
      expect(extractDomain("@nodomain.com")).toBe("nodomain.com");
    });
  });

  // =============================================================================
  // lookupDomain
  // =============================================================================
  describe("lookupDomain", () => {
    it("should return null for invalid email", async () => {
      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomain({ email: "notanemail" });
      expect(result).toBeNull();
    });

    it("should return cached result when available", async () => {
      const cachedData = {
        domain: "siemens.com",
        companyName: "Siemens AG",
        website: "www.siemens.com",
        country: "Germany",
        manuallyOverridden: false,
      };

      mockFindFirst.mockResolvedValueOnce(cachedData);

      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomain({ email: "test@siemens.com" });

      expect(result).not.toBeNull();
      expect(result?.domain).toBe("siemens.com");
      expect(result?.companyName).toBe("Siemens AG");
      expect(result?.source).toBe("cache");
    });

    it("should skip cache when forceRefresh is true", async () => {
      const { db } = await import("@/lib/db");

      vi.mocked(db.query.domainLookups.findFirst).mockResolvedValueOnce(null);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "<html><title>Test Company</title></html>",
      });

      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomain({
        email: "test@unknown-domain-xyz123.com",
        forceRefresh: true,
      });

      expect(mockFetch).toHaveBeenCalled();
    });

    it("should use TLD country code for .de domains", async () => {
      const { db } = await import("@/lib/db");

      vi.mocked(db.query.domainLookups.findFirst).mockResolvedValueOnce(null);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomain({ email: "test@bayer.de" });

      expect(result).not.toBeNull();
      expect(result?.country).toBe("Germany");
    });

    it("should use TLD country code for .co.jp domains", async () => {
      const { db } = await import("@/lib/db");

      vi.mocked(db.query.domainLookups.findFirst).mockResolvedValueOnce(null);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomain({ email: "test@toyota.co.jp" });

      expect(result).not.toBeNull();
      expect(result?.country).toBe("Japan");
    });

    it("should return null for generic TLDs without country", async () => {
      const { db } = await import("@/lib/db");

      vi.mocked(db.query.domainLookups.findFirst).mockResolvedValueOnce(null);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomain({ email: "test@gmail.com" });

      expect(result).not.toBeNull();
      expect(result?.country).toBeNull();
      expect(result?.source).toBe("scrape");
    });

    it("should extract company name from website title", async () => {
      const { db } = await import("@/lib/db");

      vi.mocked(db.query.domainLookups.findFirst).mockResolvedValueOnce(null);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          "<html><head><title>Siemens AG | Global Technology Leader</title></head></html>",
      });

      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomain({ email: "test@siemens.com" });

      expect(result).not.toBeNull();
      // Title suffix after | is stripped by the cleaner
      expect(result?.companyName).toBe("Siemens AG");
      expect(result?.source).toBe("scrape");
    });

    it("should strip pipe suffix from title", async () => {
      const { db } = await import("@/lib/db");

      vi.mocked(db.query.domainLookups.findFirst).mockResolvedValueOnce(null);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          "<html><head><title>Bayer AG | Life Science Company</title></head></html>",
      });

      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomain({ email: "test@bayer.de" });

      expect(result?.companyName).toBe("Bayer AG");
    });

    it("should strip dash suffix from title", async () => {
      const { db } = await import("@/lib/db");

      vi.mocked(db.query.domainLookups.findFirst).mockResolvedValueOnce(null);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          "<html><head><title>Bosch Global - Official Site</title></head></html>",
      });

      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomain({ email: "test@bosch.com" });

      expect(result?.companyName).toBe("Bosch Global");
    });

    it("should strip colon suffix from title", async () => {
      const { db } = await import("@/lib/db");

      vi.mocked(db.query.domainLookups.findFirst).mockResolvedValueOnce(null);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          "<html><head><title>ThyssenKrupp: Elevator Technology</title></head></html>",
      });

      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomain({ email: "test@thyssenkrupp.de" });

      expect(result?.companyName).toBe("ThyssenKrupp");
    });

    it("should handle fetch timeout gracefully", async () => {
      const { db } = await import("@/lib/db");

      vi.mocked(db.query.domainLookups.findFirst).mockResolvedValueOnce(null);
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);

      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomain({ email: "test@slow-site.com" });

      expect(result).not.toBeNull();
      expect(result?.companyName).toBeNull();
    });

    it("should handle non-200 response", async () => {
      const { db } = await import("@/lib/db");

      vi.mocked(db.query.domainLookups.findFirst).mockResolvedValueOnce(null);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomain({ email: "test@error-site.com" });

      expect(result).not.toBeNull();
      expect(result?.companyName).toBeNull();
    });

    it("should not overwrite manually overridden cache", async () => {
      const { db } = await import("@/lib/db");

      const manuallyOverriddenCache = {
        domain: "siemens.com",
        companyName: "Siemens (Manual Override)",
        website: "www.siemens.com",
        country: "Germany",
        manuallyOverridden: true,
      };

      vi.mocked(db.query.domainLookups.findFirst).mockResolvedValueOnce(manuallyOverriddenCache);

      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomain({ email: "test@siemens.com" });

      expect(result?.companyName).toBe("Siemens (Manual Override)");
      expect(result?.source).toBe("cache");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return existing non-overridden cache entry without re-scraping", async () => {
      // When cache exists with manuallyOverridden=false, code returns it immediately
      // (does NOT re-scrape or update)
      const existingCache = {
        domain: "unknown-company.com",
        companyName: "Acme Corp",
        website: null,
        country: null,
        manuallyOverridden: false,
      };

      // Only one findFirst needed - code returns cached immediately
      mockFindFirst.mockResolvedValueOnce(existingCache);

      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomain({ email: "test@unknown-company.com" });

      // Returns existing cache without scraping or updating
      expect(result?.companyName).toBe("Acme Corp");
      expect(result?.source).toBe("cache");
      // fetch should NOT have been called
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // TLD country detection (via lookupDomain integration)
  // =============================================================================
  describe("TLD country detection", () => {
    const tldCountryCases = [
      { email: "user@volkswagen.de", expectedCountry: "Germany" },
      { email: "user@toyota.jp", expectedCountry: "Japan" },
      { email: "user@volvo.se", expectedCountry: "Sweden" },
      { email: "user@ikea.se", expectedCountry: "Sweden" },
      { email: "user@shell.co.uk", expectedCountry: "United Kingdom" },
      { email: "user@total.fr", expectedCountry: "France" },
      { email: "user@enel.it", expectedCountry: "Italy" },
      { email: "user@nestle.ch", expectedCountry: "Switzerland" },
      { email: "user@asus.com.tw", expectedCountry: "Taiwan" },
      { email: "user@samsung.co.kr", expectedCountry: "South Korea" },
    ];

    tldCountryCases.forEach(({ email, expectedCountry }) => {
      it(`should detect ${expectedCountry} for ${email}`, async () => {
        mockFindFirst.mockResolvedValueOnce(null);
        mockFetch.mockResolvedValue({
          ok: false,
          status: 404,
        });

        const { lookupDomain } = await import("@/lib/services/domain-lookup");
        const result = await lookupDomain({ email });

        expect(result?.country).toBe(expectedCountry);
      });
    });

    it("should return null country for generic .com/.net/.org TLDs when no scrape", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.query.domainLookups.findFirst).mockResolvedValueOnce(null);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { lookupDomain } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomain({ email: "user@generic-email-provider.com" });

      expect(result?.country).toBeNull();
    });
  });

  // =============================================================================
  // Batch lookupDomain
  // =============================================================================
  describe("lookupDomainBatch", () => {
    it("should process multiple items and report progress", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.query.domainLookups.findFirst).mockResolvedValueOnce(null);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { lookupDomainBatch } = await import("@/lib/services/domain-lookup");
      const progressCallback = vi.fn();

      const result = await lookupDomainBatch(
        [
          { id: "1", email: "test@volkswagen.de" },
          { id: "2", email: "test@toyota.jp" },
        ],
        progressCallback
      );

      expect(result.total).toBe(2);
      expect(result.processed).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(progressCallback).toHaveBeenCalled();
    });

    it("should handle errors gracefully in batch", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.query.domainLookups.findFirst).mockResolvedValueOnce(null);
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);

      const { lookupDomainBatch } = await import("@/lib/services/domain-lookup");
      const result = await lookupDomainBatch([
        { id: "1", email: "test@fail.com" },
      ]);

      // Error is caught internally; result object returned (not thrown)
      expect(result.results[0].result).not.toBeNull();
      expect(result.results[0].result?.companyName).toBeNull();
    });
  });

  // =============================================================================
  // Manual Override Functions
  // =============================================================================
  describe("setDomainOverride", () => {
    it("should be exported as a function", async () => {
      const { setDomainOverride } = await import("@/lib/services/domain-lookup");
      expect(typeof setDomainOverride).toBe("function");
    });
  });

  describe("clearDomainOverride", () => {
    it("should be exported as a function", async () => {
      const { clearDomainOverride } = await import("@/lib/services/domain-lookup");
      expect(typeof clearDomainOverride).toBe("function");
    });
  });

  describe("listDomainOverrides", () => {
    it("should be exported as a function", async () => {
      const { listDomainOverrides } = await import("@/lib/services/domain-lookup");
      expect(typeof listDomainOverrides).toBe("function");
    });
  });
});
