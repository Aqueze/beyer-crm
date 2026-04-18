import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// =============================================================================
// Mock next/server BEFORE importing the route module
// =============================================================================

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    NextRequest: actual.NextRequest,
    NextResponse: actual.NextResponse,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  contacts: {},
}));

describe("Export API — /api/contacts/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // Helper: build a mock contact row
  // =============================================================================
  const makeContact = (overrides: Partial<import("@/app/api/contacts/export/route").ContactRow> = {}): import("@/app/api/contacts/export/route").ContactRow => ({
    id: "1",
    firstName: "Max",
    lastName: "Mustermann",
    email: "max@example.com",
    phone: "+49 89 123456",
    companyId: "comp-1",
    addressStreet: "Industriestr 5",
    addressCity: "München",
    addressPostalCode: "80331",
    addressCountry: "Germany",
    tags: ["VIP", "B2B"],
    notes: "Wichtiger Kunde",
    locationSource: "own_address",
    createdAt: new Date("2024-01-15T10:00:00Z"),
    ...overrides,
  });

  // =============================================================================
  // vCard Export
  // =============================================================================
  describe("vCard Export (default)", () => {
    it("should export a single contact as vCard 3.0 format", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([makeContact()]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const contentType = res.headers.get("Content-Type");
      expect(contentType).toContain("text/vcard");
      const disposition = res.headers.get("Content-Disposition");
      expect(disposition).toContain('filename="contacts.vcf"');

      const text = await res.text();
      expect(text).toContain("BEGIN:VCARD");
      expect(text).toContain("VERSION:3.0");
      expect(text).toContain("FN:Max Mustermann");
      expect(text).toContain("N:Mustermann;Max;;;");
      expect(text).toContain("EMAIL:max@example.com");
      expect(text).toContain("TEL:+49 89 123456");
      expect(text).toContain("ADR:;;Industriestr 5;München;80331;Germany");
      expect(text).toContain("NOTE:Wichtiger Kunde");
      expect(text).toContain("END:VCARD");
    });

    it("should handle contacts with no email", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([makeContact({ email: null })]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=vcard");
      const res = await GET(req);

      const text = await res.text();
      expect(text).toContain("BEGIN:VCARD");
      expect(text).not.toContain("EMAIL:");
    });

    it("should handle contacts with no phone", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([makeContact({ phone: null })]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=vcard");
      const res = await GET(req);

      const text = await res.text();
      expect(text).not.toContain("TEL:");
    });

    it("should handle contacts with no address", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([
          makeContact({
            addressStreet: null,
            addressCity: null,
            addressPostalCode: null,
            addressCountry: null,
          }),
        ]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=vcard");
      const res = await GET(req);

      const text = await res.text();
      expect(text).toContain("BEGIN:VCARD");
      expect(text).not.toContain("ADR:");
    });

    it("should handle contacts with no notes", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([makeContact({ notes: null })]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=vcard");
      const res = await GET(req);

      const text = await res.text();
      expect(text).not.toContain("NOTE:");
    });

    it("should export multiple contacts as separate vCards", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([
          makeContact({ id: "1", firstName: "Max", lastName: "Mueller" }),
          makeContact({ id: "2", firstName: "Anna", lastName: "Schmidt" }),
        ]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=vcard");
      const res = await GET(req);

      const text = await res.text();
      const vcardCount = (text.match(/BEGIN:VCARD/g) || []).length;
      expect(vcardCount).toBe(2);
    });

    it("should use CRLF line endings for vCard (rfc 2426 compliance)", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([makeContact()]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=vcard");
      const res = await GET(req);

      const text = await res.text();
      expect(text).toContain("\r\n");
    });

    it("should handle empty contacts list", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=vcard");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).not.toContain("BEGIN:VCARD");
    });
  });

  // =============================================================================
  // CSV Export
  // =============================================================================
  describe("CSV Export", () => {
    it("should export contacts as CSV with correct headers", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([makeContact()]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=csv");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const contentType = res.headers.get("Content-Type");
      expect(contentType).toContain("text/csv");
      const disposition = res.headers.get("Content-Disposition");
      expect(disposition).toContain('filename="contacts.csv"');

      const text = await res.text();
      const lines = text.split("\n");
      const headers = lines[0];
      expect(headers).toContain("First Name");
      expect(headers).toContain("Last Name");
      expect(headers).toContain("Email");
      expect(headers).toContain("Phone");
      expect(headers).toContain("Company ID");
      expect(headers).toContain("Street");
      expect(headers).toContain("City");
      expect(headers).toContain("Postal Code");
      expect(headers).toContain("Country");
      expect(headers).toContain("Tags");
      expect(headers).toContain("Notes");
      expect(headers).toContain("Location Source");
      expect(headers).toContain("Created At");
    });

    it("should escape CSV values containing commas", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([
          makeContact({ firstName: "Max, Junior" }),
        ]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=csv");
      const res = await GET(req);

      const text = await res.text();
      const dataLine = text.split("\n")[1];
      // Should be wrapped in double quotes
      expect(dataLine).toContain('"Max, Junior"');
    });

    it("should escape CSV values containing double quotes", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([
          makeContact({ lastName: 'Mueller "Maxi"' }),
        ]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=csv");
      const res = await GET(req);

      const text = await res.text();
      // Double quotes should be doubled and wrapped
      expect(text).toContain('"Mueller ""Maxi"""');
    });

    it("should escape CSV values containing newlines", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([
          makeContact({ notes: "Line1\nLine2" }),
        ]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=csv");
      const res = await GET(req);

      const text = await res.text();
      const dataLine = text.split("\n")[1];
      expect(dataLine).toBeTruthy();
      // Should be quoted
      expect(text).toContain('"Line1');
    });

    it("should join tags with semicolon separator", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([
          makeContact({ tags: ["VIP", "B2B", "Priority"] }),
        ]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=csv");
      const res = await GET(req);

      const text = await res.text();
      expect(text).toContain("VIP;B2B;Priority");
    });

    it("should handle null tags", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([makeContact({ tags: null })]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=csv");
      const res = await GET(req);

      const text = await res.text();
      const dataLine = text.split("\n")[1];
      expect(dataLine).toBeTruthy();
      // Should not throw and should produce empty string for tags
    });

    it("should format createdAt as ISO string", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([makeContact()]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=csv");
      const res = await GET(req);

      const text = await res.text();
      expect(text).toContain("2024-01-15T10:00:00.000Z");
    });

    it("should handle null createdAt", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([makeContact({ createdAt: null })]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=csv");
      const res = await GET(req);

      const text = await res.text();
      // Should not throw, null converted to empty string
    });

    it("should export multiple contacts as separate rows", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([
          makeContact({ id: "1", firstName: "Max" }),
          makeContact({ id: "2", firstName: "Anna" }),
        ]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=csv");
      const res = await GET(req);

      const text = await res.text();
      const lines = text.trim().split("\n");
      expect(lines.length).toBe(3); // 1 header + 2 data rows
    });

    it("should handle empty contacts list", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=csv");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const text = await res.text();
      const lines = text.trim().split("\n");
      expect(lines.length).toBe(1); // header only
    });
  });

  // =============================================================================
  // PDF Export
  // =============================================================================
  describe("PDF Export (Labels)", () => {
    it("should export contacts as PDF with label layout", async () => {
      const mockRenderToBuffer = vi.fn().mockResolvedValue(Buffer.from("fake pdf content"));

      vi.doMock("@react-pdf/renderer", async () => ({
        renderToBuffer: mockRenderToBuffer,
        Document: ({ children }: { children: React.ReactNode }) => children,
        Page: ({ children }: { children: React.ReactNode }) => children,
        Text: ({ children }: { children: React.ReactNode }) => children,
        View: ({ children }: { children: React.ReactNode }) => children,
        StyleSheet: {
          create: (styles: object) => styles,
        },
      }));

      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([makeContact()]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=pdf");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const contentType = res.headers.get("Content-Type");
      expect(contentType).toContain("application/pdf");
      const disposition = res.headers.get("Content-Disposition");
      expect(disposition).toContain('filename="contacts-labels.pdf"');
    });

    it("should handle contacts with partial address fields", async () => {
      const mockRenderToBuffer = vi.fn().mockResolvedValue(Buffer.from("fake pdf content"));

      vi.doMock("@react-pdf/renderer", async () => ({
        renderToBuffer: mockRenderToBuffer,
        Document: ({ children }: { children: React.ReactNode }) => children,
        Page: ({ children }: { children: React.ReactNode }) => children,
        Text: ({ children }: { children: React.ReactNode }) => children,
        View: ({ children }: { children: React.ReactNode }) => children,
        StyleSheet: {
          create: (styles: object) => styles,
        },
      }));

      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([
          makeContact({
            addressStreet: "123 Main St",
            addressCity: "Berlin",
            addressPostalCode: null,
            addressCountry: "Germany",
          }),
        ]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=pdf");
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(mockRenderToBuffer).toHaveBeenCalled();
    });

    it("should handle contacts with no address", async () => {
      const mockRenderToBuffer = vi.fn().mockResolvedValue(Buffer.from("fake pdf content"));

      vi.doMock("@react-pdf/renderer", async () => ({
        renderToBuffer: mockRenderToBuffer,
        Document: ({ children }: { children: React.ReactNode }) => children,
        Page: ({ children }: { children: React.ReactNode }) => children,
        Text: ({ children }: { children: React.ReactNode }) => children,
        View: ({ children }: { children: React.ReactNode }) => children,
        StyleSheet: {
          create: (styles: object) => styles,
        },
      }));

      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([
          makeContact({
            addressStreet: null,
            addressCity: null,
            addressPostalCode: null,
            addressCountry: null,
          }),
        ]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=pdf");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("should handle contacts with only email (no phone)", async () => {
      const mockRenderToBuffer = vi.fn().mockResolvedValue(Buffer.from("fake pdf content"));

      vi.doMock("@react-pdf/renderer", async () => ({
        renderToBuffer: mockRenderToBuffer,
        Document: ({ children }: { children: React.ReactNode }) => children,
        Page: ({ children }: { children: React.ReactNode }) => children,
        Text: ({ children }: { children: React.ReactNode }) => children,
        View: ({ children }: { children: React.ReactNode }) => children,
        StyleSheet: {
          create: (styles: object) => styles,
        },
      }));

      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([
          makeContact({ phone: null, email: "test@example.com" }),
        ]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=pdf");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("should handle contacts with only phone (no email)", async () => {
      const mockRenderToBuffer = vi.fn().mockResolvedValue(Buffer.from("fake pdf content"));

      vi.doMock("@react-pdf/renderer", async () => ({
        renderToBuffer: mockRenderToBuffer,
        Document: ({ children }: { children: React.ReactNode }) => children,
        Page: ({ children }: { children: React.ReactNode }) => children,
        Text: ({ children }: { children: React.ReactNode }) => children,
        View: ({ children }: { children: React.ReactNode }) => children,
        StyleSheet: {
          create: (styles: object) => styles,
        },
      }));

      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([
          makeContact({ email: null, phone: "+49 89 123456" }),
        ]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=pdf");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("should handle empty contacts list for PDF", async () => {
      const mockRenderToBuffer = vi.fn().mockResolvedValue(Buffer.from("fake pdf content"));

      vi.doMock("@react-pdf/renderer", async () => ({
        renderToBuffer: mockRenderToBuffer,
        Document: ({ children }: { children: React.ReactNode }) => children,
        Page: ({ children }: { children: React.ReactNode }) => children,
        Text: ({ children }: { children: React.ReactNode }) => children,
        View: ({ children }: { children: React.ReactNode }) => children,
        StyleSheet: {
          create: (styles: object) => styles,
        },
      }));

      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=pdf");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });

  // =============================================================================
  // ID Filtering
  // =============================================================================
  describe("ID Filtering", () => {
    it("should filter contacts by IDs when ids param is provided", async () => {
      const { db } = await import("@/lib/db");
      const allContacts = [
        makeContact({ id: "1", firstName: "Max" }),
        makeContact({ id: "2", firstName: "Anna" }),
        makeContact({ id: "3", firstName: "John" }),
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue(allContacts),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?ids=1,3&format=vcard");
      const res = await GET(req);

      const text = await res.text();
      expect(text).toContain("Max");
      expect(text).toContain("John");
      expect(text).not.toContain("Anna");
    });

    it("should return all contacts when ids is empty string", async () => {
      const { db } = await import("@/lib/db");
      const allContacts = [
        makeContact({ id: "1", firstName: "Max" }),
        makeContact({ id: "2", firstName: "Anna" }),
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue(allContacts),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?ids=&format=vcard");
      const res = await GET(req);

      const text = await res.text();
      expect(text).toContain("Max");
      expect(text).toContain("Anna");
    });

    it("should return all contacts when no ids param", async () => {
      const { db } = await import("@/lib/db");
      const allContacts = [
        makeContact({ id: "1", firstName: "Max" }),
        makeContact({ id: "2", firstName: "Anna" }),
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue(allContacts),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=vcard");
      const res = await GET(req);

      const text = await res.text();
      expect(text).toContain("Max");
      expect(text).toContain("Anna");
    });

    it("should handle ids with spaces", async () => {
      const { db } = await import("@/lib/db");
      const allContacts = [
        makeContact({ id: "1", firstName: "Max" }),
        makeContact({ id: "2", firstName: "Anna" }),
        makeContact({ id: "3", firstName: "John" }),
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue(allContacts),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?ids=1,%203&format=vcard");
      const res = await GET(req);

      const text = await res.text();
      // "1" and " 3" (filtered as "3" due to trim) should match id "1" and "3"
    });
  });

  // =============================================================================
  // Format Fallback (default to vCard)
  // =============================================================================
  describe("Format Fallback", () => {
    it("should default to vCard when no format specified", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([makeContact()]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export");
      const res = await GET(req);

      const contentType = res.headers.get("Content-Type");
      expect(contentType).toContain("text/vcard");
    });

    it("should default to vCard for unknown format", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([makeContact()]),
      } as unknown as typeof db.select);

      const { GET } = await import("@/app/api/contacts/export/route");
      const req = new Request("http://localhost/api/contacts/export?format=unknown");
      const res = await GET(req);

      const contentType = res.headers.get("Content-Type");
      expect(contentType).toContain("text/vcard");
    });
  });
});
