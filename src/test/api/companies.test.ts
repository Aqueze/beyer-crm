import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Mocks
// ============================================================================

// Mock the db module
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

// Mock NextRequest and NextResponse
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    NextRequest: actual.NextRequest,
    NextResponse: actual.NextResponse,
  };
});

// ============================================================================
// Test Data
// ============================================================================

// Use ISO strings instead of Date objects since NextResponse.json serializes dates
const mockCompany = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Siemens AG",
  domain: "siemens.com",
  website: "https://www.siemens.com",
  addressStreet: "Werner-von-Siemens-Straße 1",
  addressCity: "München",
  addressPostalCode: "80333",
  addressCountry: "Germany",
  location: null,
  locationSource: null,
  createdAt: "2024-01-15T10:00:00.000Z",
  updatedAt: "2024-01-15T10:00:00.000Z",
};

const mockCompanyInput = {
  name: "Siemens AG",
  domain: "siemens.com",
  website: "https://www.siemens.com",
  addressStreet: "Werner-von-Siemens-Straße 1",
  addressCity: "München",
  addressPostalCode: "80333",
  addressCountry: "Germany",
};

// ============================================================================
// Companies API Tests
// ============================================================================

describe("Companies API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/companies", () => {
    it("should return list of companies", async () => {
      mockDb.limit.mockResolvedValue([mockCompany]);

      const { GET } = await import("@/app/api/companies/route");
      const response = await GET();

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json).toEqual([mockCompany]);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(100);
    });

    it("should return empty array when no companies exist", async () => {
      mockDb.limit.mockResolvedValue([]);

      const { GET } = await import("@/app/api/companies/route");
      const response = await GET();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual([]);
    });
  });

  describe("POST /api/companies", () => {
    it("should create a new company", async () => {
      mockDb.returning.mockResolvedValue([mockCompany]);

      const { POST } = await import("@/app/api/companies/route");
      const request = new NextRequest("http://localhost/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockCompanyInput),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json).toEqual(mockCompany);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(mockCompanyInput);
      expect(mockDb.returning).toHaveBeenCalled();
    });

    it("should create company even with minimal data (DB handles validation)", async () => {
      // Empty body - validation happens at DB level
      const emptyCompany = { id: "new-id", name: "", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" };
      mockDb.returning.mockResolvedValue([emptyCompany]);

      const { POST } = await import("@/app/api/companies/route");
      const request = new NextRequest("http://localhost/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      // Route doesn't validate - DB would reject, but route returns what DB returns
      expect(response.status).toBe(201);
    });
  });

  describe("GET /api/companies/[id]", () => {
    it("should return a single company by id", async () => {
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockCompany]);

      const { GET } = await import("@/app/api/companies/[id]/route");
      const request = new NextRequest("http://localhost/api/companies/550e8400-e29b-41d4-a716-446655440000", {
        method: "GET",
      });

      const response = await GET(request, {
        params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual(mockCompany);
    });

    it("should return 404 when company not found", async () => {
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      const { GET } = await import("@/app/api/companies/[id]/route");
      const request = new NextRequest("http://localhost/api/companies/nonexistent-id", {
        method: "GET",
      });

      const response = await GET(request, {
        params: Promise.resolve({ id: "nonexistent-id" }),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json).toEqual({ error: "Not found" });
    });
  });

  describe("PUT /api/companies/[id]", () => {
    it("should update an existing company", async () => {
      const updatedCompany = { ...mockCompany, name: "Siemens Updated" };
      mockDb.where.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.update.mockReturnThis();
      mockDb.returning.mockResolvedValue([updatedCompany]);

      const { PUT } = await import("@/app/api/companies/[id]/route");
      const request = new NextRequest("http://localhost/api/companies/550e8400-e29b-41d4-a716-446655440000", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Siemens Updated" }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.name).toBe("Siemens Updated");
    });

    it("should return 404 when updating non-existent company", async () => {
      mockDb.where.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.update.mockReturnThis();
      mockDb.returning.mockResolvedValue([]);

      const { PUT } = await import("@/app/api/companies/[id]/route");
      const request = new NextRequest("http://localhost/api/companies/nonexistent-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "nonexistent-id" }),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json).toEqual({ error: "Not found" });
    });
  });

  describe("DELETE /api/companies/[id]", () => {
    it("should delete an existing company", async () => {
      mockDb.where.mockReturnThis();
      mockDb.delete.mockReturnThis();
      mockDb.returning.mockResolvedValue([mockCompany]);

      const { DELETE } = await import("@/app/api/companies/[id]/route");
      const request = new NextRequest("http://localhost/api/companies/550e8400-e29b-41d4-a716-446655440000", {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should return success even when company not found (idempotent delete)", async () => {
      mockDb.where.mockReturnThis();
      mockDb.delete.mockReturnThis();
      mockDb.returning.mockResolvedValue([]);

      const { DELETE } = await import("@/app/api/companies/[id]/route");
      const request = new NextRequest("http://localhost/api/companies/nonexistent-id", {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "nonexistent-id" }),
      });

      // DELETE returns 200 even if not found (idempotent)
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({ success: true });
    });
  });
});
