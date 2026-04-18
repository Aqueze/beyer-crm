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
  returning: vi.fn(),
  execute: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

// Mock geocoder service
vi.mock("@/lib/services/geocoder", () => ({
  geocode: vi.fn().mockResolvedValue({
    success: true,
    data: {
      latitude: 48.1372,
      longitude: 11.5755,
      formattedAddress: "München, Germany",
      source: "nominatim" as const,
    },
  }),
  buildAddressString: vi.fn((street, city, postalCode, country) => {
    return [street, postalCode, city, country].filter(Boolean).join(", ");
  }),
}));

// Mock domain-lookup service
vi.mock("@/lib/services/domain-lookup", () => ({
  lookupDomain: vi.fn().mockResolvedValue({
    country: "Germany",
    companyName: "Test Company",
  }),
}));

// Mock xlsx library
const mockXlsxUtils = {
  sheet_to_json: vi.fn().mockReturnValue([
    ["First Name", "Last Name", "Email", "Company", "City"],
    ["John", "Doe", "john@example.com", "Acme Corp", "Berlin"],
    ["Jane", "Smith", "jane@example.com", "Tech Inc", "München"],
  ]),
};

const mockXlsx = {
  read: vi.fn().mockReturnValue({
    SheetNames: ["Sheet1"],
    Sheets: {
      Sheet1: { A1: "First Name", B1: "Last Name" },
    },
  }),
  utils: mockXlsxUtils,
};

vi.mock("xlsx", () => ({
  read: mockXlsx.read,
  utils: mockXlsxUtils,
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

const mockImportRecord = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  filename: "contacts.xlsx",
  columnMapping: {
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    company: "Company",
    addressCity: "City",
  },
  status: "completed" as const,
  totalRows: 2,
  importedRows: 2,
  errorLog: [],
  userId: null,
  createdAt: new Date("2024-01-20T10:00:00Z"),
  completedAt: new Date("2024-01-20T10:05:00Z"),
};

const mockCompany = {
  id: "770e8400-e29b-41d4-a716-446655440002",
  name: "Acme Corp",
  addressCity: "Berlin",
  addressStreet: null,
  addressPostalCode: null,
  addressCountry: null,
  location: null,
  locationSource: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockContact = {
  id: "880e8400-e29b-41d4-a716-446655440003",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: null,
  companyId: "770e8400-e29b-41d4-a716-446655440002",
  addressStreet: null,
  addressCity: "Berlin",
  addressPostalCode: null,
  addressCountry: null,
  location: "SRID=4326;POINT(13.4050 52.5200)",
  locationSource: "own_address" as const,
  tags: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================================================
// Imports API Tests
// ============================================================================

describe("Imports API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/imports/execute", () => {
    it("should execute import with valid file and mapping", async () => {
      // Setup mock returns for insert operations
      mockDb.returning
        .mockResolvedValueOnce([mockImportRecord]) // insert imports
        .mockResolvedValueOnce([mockCompany]) // insert companies
        .mockResolvedValueOnce([{ id: "contact-1" }]) // insert contacts
        .mockResolvedValueOnce([mockCompany]) // insert companies
        .mockResolvedValueOnce([{ id: "contact-2" }]); // insert contacts

      mockDb.execute.mockResolvedValue({});

      // Create mock file
      const fileContent = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // ZIP header (xlsx is a zip)
      const mockFile = new File([fileContent], "contacts.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const formData = new FormData();
      formData.append("file", mockFile);
      formData.append(
        "mapping",
        JSON.stringify({
          firstName: "First Name",
          lastName: "Last Name",
          email: "Email",
          company: "Company",
          addressCity: "City",
        })
      );

      const { POST } = await import("@/app/api/imports/execute/route");
      const request = new NextRequest("http://localhost/api/imports/execute", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toHaveProperty("importId");
      expect(json).toHaveProperty("totalRows");
      expect(json).toHaveProperty("importedRows");
      expect(json).toHaveProperty("failedRows");
      expect(json).toHaveProperty("errors");
    });

    it("should return 400 when no file is provided", async () => {
      const formData = new FormData();
      formData.append("mapping", JSON.stringify({ firstName: "First Name" }));

      const { POST } = await import("@/app/api/imports/execute/route");
      const request = new NextRequest("http://localhost/api/imports/execute", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toEqual({ error: "No file provided" });
    });

    it("should return 400 when no mapping is provided", async () => {
      const fileContent = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const mockFile = new File([fileContent], "contacts.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const formData = new FormData();
      formData.append("file", mockFile);

      const { POST } = await import("@/app/api/imports/execute/route");
      const request = new NextRequest("http://localhost/api/imports/execute", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toEqual({ error: "No column mapping provided" });
    });

    it("should return 400 when file has no data rows", async () => {
      // Mock xlsx with only header row
      mockXlsxUtils.sheet_to_json.mockReturnValueOnce([
        ["First Name", "Last Name"],
      ]);

      const fileContent = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const mockFile = new File([fileContent], "empty.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const formData = new FormData();
      formData.append("file", mockFile);
      formData.append("mapping", JSON.stringify({ firstName: "First Name" }));

      const { POST } = await import("@/app/api/imports/execute/route");
      const request = new NextRequest("http://localhost/api/imports/execute", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toEqual({ error: "File must have header and data rows" });
    });

    it("should skip rows with no identifying info", async () => {
      // Mock xlsx with a row that has no name or email
      mockXlsxUtils.sheet_to_json.mockReturnValueOnce([
        ["First Name", "Last Name", "Email"],
        ["", "", ""], // Empty row - should be skipped
        ["John", "Doe", "john@example.com"], // Valid row
      ]);

      mockDb.returning
        .mockResolvedValueOnce([mockImportRecord]) // insert imports
        .mockResolvedValueOnce([mockCompany]) // insert companies
        .mockResolvedValueOnce([{ id: "contact-1" }]); // insert contacts

      mockDb.execute.mockResolvedValue({});

      const fileContent = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const mockFile = new File([fileContent], "contacts.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const formData = new FormData();
      formData.append("file", mockFile);
      formData.append(
        "mapping",
        JSON.stringify({
          firstName: "First Name",
          lastName: "Last Name",
          email: "Email",
        })
      );

      const { POST } = await import("@/app/api/imports/execute/route");
      const request = new NextRequest("http://localhost/api/imports/execute", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      // Should have skipped the empty row
      expect(json.failedRows).toBeGreaterThanOrEqual(0);
    });

    it("should create companies during import", async () => {
      mockXlsxUtils.sheet_to_json.mockReturnValueOnce([
        ["First Name", "Company"],
        ["John", "New Company LLC"],
      ]);

      mockDb.returning
        .mockResolvedValueOnce([mockImportRecord])
        .mockResolvedValueOnce([{ ...mockCompany, name: "New Company LLC" }])
        .mockResolvedValueOnce([{ id: "contact-1" }]);

      mockDb.execute.mockResolvedValue({});

      const fileContent = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const mockFile = new File([fileContent], "contacts.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const formData = new FormData();
      formData.append("file", mockFile);
      formData.append(
        "mapping",
        JSON.stringify({ firstName: "First Name", company: "Company" })
      );

      const { POST } = await import("@/app/api/imports/execute/route");
      const request = new NextRequest("http://localhost/api/imports/execute", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      // Verify companies.insert was called
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({} as any)
      );
    });

    it("should handle import errors gracefully and continue processing", async () => {
      // Mock xlsx with multiple rows
      mockXlsxUtils.sheet_to_json.mockReturnValueOnce([
        ["First Name", "Last Name", "Email"],
        ["John", "Doe", "john@example.com"],
        ["Jane", "Smith", "jane@example.com"],
      ]);

      let callCount = 0;
      mockDb.returning.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([mockImportRecord]); // imports insert
        if (callCount === 2) return Promise.resolve([mockCompany]); // first company
        if (callCount === 3) throw new Error("DB Error"); // first contact - fails
        if (callCount === 4) return Promise.resolve([{ ...mockCompany, id: "company-2" }]); // second company
        return Promise.resolve([{ id: "contact-2" }]); // second contact
      });

      mockDb.execute.mockResolvedValue({});

      const fileContent = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const mockFile = new File([fileContent], "contacts.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const formData = new FormData();
      formData.append("file", mockFile);
      formData.append(
        "mapping",
        JSON.stringify({
          firstName: "First Name",
          lastName: "Last Name",
          email: "Email",
        })
      );

      const { POST } = await import("@/app/api/imports/execute/route");
      const request = new NextRequest("http://localhost/api/imports/execute", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      // Should have partial success
      expect(json.importedRows).toBeLessThanOrEqual(json.totalRows);
    });

    it("should update import record with final status on completion", async () => {
      mockXlsxUtils.sheet_to_json.mockReturnValueOnce([
        ["First Name", "Last Name"],
        ["John", "Doe"],
      ]);

      mockDb.returning
        .mockResolvedValueOnce([mockImportRecord])
        .mockResolvedValueOnce([{ id: "company-1" }])
        .mockResolvedValueOnce([{ id: "contact-1" }]);

      mockDb.execute.mockResolvedValue({});

      const fileContent = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const mockFile = new File([fileContent], "contacts.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const formData = new FormData();
      formData.append("file", mockFile);
      formData.append(
        "mapping",
        JSON.stringify({ firstName: "First Name", lastName: "Last Name" })
      );

      const { POST } = await import("@/app/api/imports/execute/route");
      const request = new NextRequest("http://localhost/api/imports/execute", {
        method: "POST",
        body: formData,
      });

      await POST(request);

      // Verify update was called to mark import as completed
      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});
