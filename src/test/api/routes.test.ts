import { describe, it, expect, vi } from "vitest";

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    NextRequest: actual.NextRequest,
    NextResponse: actual.NextResponse,
  };
});

describe("API Route Exports", () => {
  describe("Contacts API", () => {
    it("should export GET and POST handlers", async () => {
      const mod = await import("@/app/api/contacts/route");
      expect(typeof mod.GET).toBe("function");
      expect(typeof mod.POST).toBe("function");
    });

    it("should export GET for nearby contacts", async () => {
      const mod = await import("@/app/api/contacts/nearby/route");
      expect(typeof mod.GET).toBe("function");
    });
  });

  describe("Companies API", () => {
    it("should export GET and POST for companies", async () => {
      const mod = await import("@/app/api/companies/route");
      expect(typeof mod.GET).toBe("function");
      expect(typeof mod.POST).toBe("function");
    });

    it("should export GET, PUT, DELETE for company by ID", async () => {
      const mod = await import("@/app/api/companies/[id]/route");
      expect(typeof mod.GET).toBe("function");
      expect(typeof mod.PUT).toBe("function");
      expect(typeof mod.DELETE).toBe("function");
    });
  });

  describe("Geocode API", () => {
    it("should export POST for single geocode", async () => {
      const mod = await import("@/app/api/geocode/route");
      expect(typeof mod.POST).toBe("function");
    });

    it("should export POST for batch geocode", async () => {
      const mod = await import("@/app/api/geocode/batch/route");
      expect(typeof mod.POST).toBe("function");
    });
  });

  describe("Domain Lookup API", () => {
    it("should export GET and POST for domain lookup", async () => {
      const mod = await import("@/app/api/domains/lookup/route");
      expect(typeof mod.GET).toBe("function");
      expect(typeof mod.POST).toBe("function");
    });

    it("should export CRUD for domain mapping", async () => {
      const mod = await import("@/app/api/domains/[id]/route");
      expect(typeof mod.GET).toBe("function");
      expect(typeof mod.PUT).toBe("function");
      expect(typeof mod.DELETE).toBe("function");
    });
  });

  describe("Imports API", () => {
    it("should export POST for import execute", async () => {
      const mod = await import("@/app/api/imports/execute/route");
      expect(typeof mod.POST).toBe("function");
    });
  });
});
