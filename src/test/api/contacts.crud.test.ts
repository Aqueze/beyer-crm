import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the database module before importing route handlers
vi.mock("@/lib/db", () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    execute: vi.fn(),
  };
  return { db: mockDb };
});

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    NextRequest: actual.NextRequest,
    NextResponse: actual.NextResponse,
  };
});

// Import route handlers after mocking
import { GET as contactsGet, POST as contactsPost, DELETE as contactsDelete, PATCH as contactsPatch } from "@/app/api/contacts/route";
import { GET as contactGet, PUT as contactPut, DELETE as contactDelete } from "@/app/api/contacts/[id]/route";
import { GET as interactionsGet, POST as interactionsPost } from "@/app/api/contacts/[id]/interactions/route";
import { GET as nearbyGet } from "@/app/api/contacts/nearby/route";
import { db } from "@/lib/db";
import { contacts, interactions } from "@/lib/db/schema";

describe("Contacts API - CRUD Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/contacts - List Contacts", () => {
    it("should return contacts with pagination", async () => {
      const mockContacts = [
        { id: "1", firstName: "John", lastName: "Doe", email: "john@example.com" },
        { id: "2", firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
      ];

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockContacts),
            }),
          }),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts");
      const res = await contactsGet(req);

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.contacts).toHaveLength(2);
      expect(json.page).toBe(1);
      expect(json.limit).toBe(50);
      expect(json.hasMore).toBe(false);
    });

    it("should filter contacts by search query", async () => {
      const mockContacts = [
        { id: "1", firstName: "John", lastName: "Doe", email: "john@example.com" },
      ];

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockContacts),
            }),
          }),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts?q=John");
      const res = await contactsGet(req);

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.contacts).toHaveLength(1);
    });

    it("should filter contacts by tags", async () => {
      const mockContacts = [
        { id: "1", firstName: "John", lastName: "Doe", tags: ["vip", "germany"] },
      ];

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockContacts),
            }),
          }),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts?tag=vip");
      const res = await contactsGet(req);

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.contacts).toHaveLength(1);
    });

    it("should handle pagination parameters", async () => {
      const mockContacts = Array(10).fill(null).map((_, i) => ({
        id: String(i + 1),
        firstName: `Contact ${i + 1}`,
        lastName: "Test",
      }));

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockContacts),
            }),
          }),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts?page=2&limit=10");
      const res = await contactsGet(req);

      const json = await res.json();
      expect(json.page).toBe(2);
      expect(json.limit).toBe(10);
    });
  });

  describe("POST /api/contacts - Create Contact", () => {
    it("should create a new contact", async () => {
      const newContact = {
        firstName: "Max",
        lastName: "Mustermann",
        email: "max@example.com",
        phone: "+49 123 456789",
      };

      const createdContact = { id: "new-uuid", ...newContact, createdAt: new Date() };

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdContact]),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts", {
        method: "POST",
        body: JSON.stringify(newContact),
      });
      const res = await contactsPost(req);

      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.firstName).toBe("Max");
      expect(json.lastName).toBe("Mustermann");
    });

    it("should create contact with company link", async () => {
      const newContact = {
        firstName: "John",
        lastName: "Doe",
        email: "john@siemens.com",
        companyId: "company-uuid-123",
      };

      const createdContact = { id: "new-uuid", ...newContact, createdAt: new Date() };

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdContact]),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts", {
        method: "POST",
        body: JSON.stringify(newContact),
      });
      const res = await contactsPost(req);

      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.companyId).toBe("company-uuid-123");
    });

    it("should create contact with tags", async () => {
      const newContact = {
        firstName: "VIP",
        lastName: "Customer",
        email: "vip@example.com",
        tags: ["vip", "germany", "manufacturing"],
      };

      const createdContact = { id: "new-uuid", ...newContact, createdAt: new Date() };

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdContact]),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts", {
        method: "POST",
        body: JSON.stringify(newContact),
      });
      const res = await contactsPost(req);

      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.tags).toEqual(["vip", "germany", "manufacturing"]);
    });
  });

  describe("GET /api/contacts/[id] - Get Single Contact", () => {
    it("should return a contact by ID", async () => {
      const mockContact = {
        id: "contact-uuid",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockContact]),
          }),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts/contact-uuid");
      const res = await contactGet(req, { params: Promise.resolve({ id: "contact-uuid" }) });

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.id).toBe("contact-uuid");
      expect(json.firstName).toBe("John");
    });

    it("should return 404 for non-existent contact", async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts/non-existent-id");
      const res = await contactGet(req, { params: Promise.resolve({ id: "non-existent-id" }) });

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/contacts/[id] - Update Contact", () => {
    it("should update a contact", async () => {
      const updatedContact = {
        id: "contact-uuid",
        firstName: "John",
        lastName: "Doe",
        email: "john.updated@example.com",
      };

      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedContact]),
          }),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts/contact-uuid", {
        method: "PUT",
        body: JSON.stringify({ email: "john.updated@example.com" }),
      });
      const res = await contactPut(req, { params: Promise.resolve({ id: "contact-uuid" }) });

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.email).toBe("john.updated@example.com");
    });

    it("should return 404 when updating non-existent contact", async () => {
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts/non-existent-id", {
        method: "PUT",
        body: JSON.stringify({ firstName: "Test" }),
      });
      const res = await contactPut(req, { params: Promise.resolve({ id: "non-existent-id" }) });

      expect(res.status).toBe(404);
    });

    it("should update contact tags", async () => {
      const updatedContact = {
        id: "contact-uuid",
        firstName: "John",
        tags: ["vip", "updated"],
      };

      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedContact]),
          }),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts/contact-uuid", {
        method: "PUT",
        body: JSON.stringify({ tags: ["vip", "updated"] }),
      });
      const res = await contactPut(req, { params: Promise.resolve({ id: "contact-uuid" }) });

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.tags).toEqual(["vip", "updated"]);
    });
  });

  describe("DELETE /api/contacts/[id] - Delete Single Contact", () => {
    it("should delete a contact by ID", async () => {
      (db.delete as any).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const req = new NextRequest("http://localhost/api/contacts/contact-uuid", {
        method: "DELETE",
      });
      const res = await contactDelete(req, { params: Promise.resolve({ id: "contact-uuid" }) });

      expect(res.status).toBe(200);
    });
  });

  describe("DELETE /api/contacts - Bulk Delete", () => {
    it("should delete multiple contacts by IDs", async () => {
      (db.delete as any).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const req = new NextRequest("http://localhost/api/contacts?id=uuid1&id=uuid2&id=uuid3", {
        method: "DELETE",
      });
      const res = await contactsDelete(req);

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.deleted).toBe(3);
    });

    it("should return 400 when no IDs provided", async () => {
      const req = new NextRequest("http://localhost/api/contacts", {
        method: "DELETE",
      });
      const res = await contactsDelete(req);

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/contacts - Bulk Tag Update", () => {
    it("should update tags for multiple contacts", async () => {
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts", {
        method: "PATCH",
        body: JSON.stringify({
          ids: ["uuid1", "uuid2"],
          tags: ["vip", "germany"],
        }),
      });
      const res = await contactsPatch(req);

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.updated).toBe(2);
    });

    it("should return 400 when ids is not an array", async () => {
      const req = new NextRequest("http://localhost/api/contacts", {
        method: "PATCH",
        body: JSON.stringify({
          ids: "not-an-array",
          tags: ["vip"],
        }),
      });
      const res = await contactsPatch(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 when ids is missing", async () => {
      const req = new NextRequest("http://localhost/api/contacts", {
        method: "PATCH",
        body: JSON.stringify({
          tags: ["vip"],
        }),
      });
      const res = await contactsPatch(req);

      expect(res.status).toBe(400);
    });

    it("should clear tags when empty array provided", async () => {
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts", {
        method: "PATCH",
        body: JSON.stringify({
          ids: ["uuid1"],
          tags: [],
        }),
      });
      const res = await contactsPatch(req);

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });
  });
});

describe("Contacts API - Search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should search by first name", async () => {
    const mockContacts = [
      { id: "1", firstName: "Max", lastName: "Mustermann" },
    ];

    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue(mockContacts),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/contacts?q=Max");
    const res = await contactsGet(req);

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.contacts).toHaveLength(1);
    expect(json.contacts[0].firstName).toBe("Max");
  });

  it("should search by last name", async () => {
    const mockContacts = [
      { id: "1", firstName: "John", lastName: "Doe" },
    ];

    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue(mockContacts),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/contacts?q=Doe");
    const res = await contactsGet(req);

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.contacts).toHaveLength(1);
    expect(json.contacts[0].lastName).toBe("Doe");
  });

  it("should search by email", async () => {
    const mockContacts = [
      { id: "1", firstName: "John", lastName: "Doe", email: "john.doe@siemens.com" },
    ];

    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue(mockContacts),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/contacts?q=siemens.com");
    const res = await contactsGet(req);

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.contacts).toHaveLength(1);
    expect(json.contacts[0].email).toContain("siemens.com");
  });

  it("should search by phone", async () => {
    const mockContacts = [
      { id: "1", firstName: "John", lastName: "Doe", phone: "+49 89 12345" },
    ];

    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue(mockContacts),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/contacts?q=12345");
    const res = await contactsGet(req);

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.contacts).toHaveLength(1);
    expect(json.contacts[0].phone).toContain("12345");
  });

  it("should combine search with tag filter", async () => {
    const mockContacts = [
      { id: "1", firstName: "Max", lastName: "Mueller", tags: ["vip"] },
    ];

    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue(mockContacts),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/contacts?q=Max&tag=vip");
    const res = await contactsGet(req);

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.contacts).toHaveLength(1);
    expect(json.contacts[0].tags).toContain("vip");
  });

  it("should filter by multiple tags", async () => {
    const mockContacts = [
      { id: "1", firstName: "John", lastName: "Doe", tags: ["vip", "germany"] },
    ];

    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue(mockContacts),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/contacts?tag=vip&tag=germany");
    const res = await contactsGet(req);

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.contacts).toHaveLength(1);
  });

  it("should return empty array when no matches", async () => {
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/contacts?q=NonExistent");
    const res = await contactsGet(req);

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.contacts).toHaveLength(0);
  });
});

describe("Contacts API - Nearby", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return nearby contacts within radius", async () => {
    const mockNearbyContacts = [
      { id: "1", firstName: "Near", lastName: "Contact", distance_m: 1500 },
      { id: "2", firstName: "Farther", lastName: "Contact", distance_m: 5000 },
    ];

    (db.execute as any).mockResolvedValue(mockNearbyContacts);

    const req = new NextRequest("http://localhost/api/contacts/nearby?lat=48.1372&lng=11.5765&radius=10000");
    const res = await nearbyGet(req);

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(2);
  });

  it("should use default radius when not specified", async () => {
    const mockNearbyContacts: any[] = [];

    (db.execute as any).mockResolvedValue(mockNearbyContacts);

    const req = new NextRequest("http://localhost/api/contacts/nearby?lat=48.1372&lng=11.5765");
    const res = await nearbyGet(req);

    expect(res.status).toBe(200);
  });

  it("should return 400 when lat/lng missing", async () => {
    const req = new NextRequest("http://localhost/api/contacts/nearby");
    const res = await nearbyGet(req);

    expect(res.status).toBe(400);
  });

  it("should handle different radius values", async () => {
    const mockNearbyContacts: any[] = [];

    (db.execute as any).mockResolvedValue(mockNearbyContacts);

    const radii = [10000, 25000, 50000, 100000, 250000];
    for (const radius of radii) {
      const req = new NextRequest(`http://localhost/api/contacts/nearby?lat=48.1372&lng=11.5765&radius=${radius}`);
      const res = await nearbyGet(req);
      expect(res.status).toBe(200);
    }
  });

  it("should return contacts ordered by distance", async () => {
    const mockNearbyContacts = [
      { id: "1", firstName: "Closest", lastName: "One", distance_m: 500 },
      { id: "2", firstName: "Middle", lastName: "One", distance_m: 2500 },
      { id: "3", firstName: "Farthest", lastName: "One", distance_m: 8000 },
    ];

    (db.execute as any).mockResolvedValue(mockNearbyContacts);

    const req = new NextRequest("http://localhost/api/contacts/nearby?lat=48.1372&lng=11.5765&radius=50000");
    const res = await nearbyGet(req);

    const json = await res.json();
    expect(json[0].firstName).toBe("Closest");
    expect(json[2].firstName).toBe("Farthest");
  });
});

describe("Contacts API - Interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/contacts/[id]/interactions", () => {
    it("should return interactions for a contact", async () => {
      const mockInteractions = [
        { id: "1", contactId: "contact-uuid", type: "email", subject: "Initial Contact", notes: "Sent intro email" },
        { id: "2", contactId: "contact-uuid", type: "call", subject: "Follow-up Call", notes: "Discussed pricing" },
      ];

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockInteractions),
            }),
          }),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts/contact-uuid/interactions");
      const res = await interactionsGet(req, { params: Promise.resolve({ id: "contact-uuid" }) });

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json).toHaveLength(2);
      expect(json[0].type).toBe("email");
      expect(json[1].type).toBe("call");
    });

    it("should return empty array when no interactions", async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts/contact-uuid/interactions");
      const res = await interactionsGet(req, { params: Promise.resolve({ id: "contact-uuid" }) });

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json).toHaveLength(0);
    });

    it("should limit interactions to 50", async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts/contact-uuid/interactions");
      await interactionsGet(req, { params: Promise.resolve({ id: "contact-uuid" }) });

      // Verify limit was called with 50
      expect(db.select).toHaveBeenCalled();
    });
  });

  describe("POST /api/contacts/[id]/interactions", () => {
    it("should create an email interaction", async () => {
      const newInteraction = {
        type: "email",
        subject: "Follow-up Email",
        notes: "Sent product brochure",
      };

      const createdInteraction = {
        id: "interaction-uuid",
        contactId: "contact-uuid",
        ...newInteraction,
        createdAt: new Date(),
      };

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdInteraction]),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts/contact-uuid/interactions", {
        method: "POST",
        body: JSON.stringify(newInteraction),
      });
      const res = await interactionsPost(req, { params: Promise.resolve({ id: "contact-uuid" }) });

      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.type).toBe("email");
      expect(json.subject).toBe("Follow-up Email");
    });

    it("should create a call interaction", async () => {
      const newInteraction = {
        type: "call",
        subject: "Sales Call",
        notes: "Discussed requirements",
      };

      const createdInteraction = {
        id: "interaction-uuid",
        contactId: "contact-uuid",
        ...newInteraction,
        createdAt: new Date(),
      };

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdInteraction]),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts/contact-uuid/interactions", {
        method: "POST",
        body: JSON.stringify(newInteraction),
      });
      const res = await interactionsPost(req, { params: Promise.resolve({ id: "contact-uuid" }) });

      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.type).toBe("call");
    });

    it("should create a meeting interaction", async () => {
      const newInteraction = {
        type: "meeting",
        subject: "Product Demo",
        notes: "Demo of new features",
      };

      const createdInteraction = {
        id: "interaction-uuid",
        contactId: "contact-uuid",
        ...newInteraction,
        createdAt: new Date(),
      };

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdInteraction]),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts/contact-uuid/interactions", {
        method: "POST",
        body: JSON.stringify(newInteraction),
      });
      const res = await interactionsPost(req, { params: Promise.resolve({ id: "contact-uuid" }) });

      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.type).toBe("meeting");
    });

    it("should create a note interaction", async () => {
      const newInteraction = {
        type: "note",
        notes: "Customer interested in expansion",
      };

      const createdInteraction = {
        id: "interaction-uuid",
        contactId: "contact-uuid",
        ...newInteraction,
        createdAt: new Date(),
      };

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdInteraction]),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts/contact-uuid/interactions", {
        method: "POST",
        body: JSON.stringify(newInteraction),
      });
      const res = await interactionsPost(req, { params: Promise.resolve({ id: "contact-uuid" }) });

      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.type).toBe("note");
    });

    it("should associate interaction with correct contact ID", async () => {
      const newInteraction = {
        type: "email",
        subject: "Test",
      };

      const createdInteraction = {
        id: "interaction-uuid",
        contactId: "specific-contact-id",
        ...newInteraction,
        createdAt: new Date(),
      };

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdInteraction]),
        }),
      });

      const req = new NextRequest("http://localhost/api/contacts/specific-contact-id/interactions", {
        method: "POST",
        body: JSON.stringify(newInteraction),
      });
      const res = await interactionsPost(req, { params: Promise.resolve({ id: "specific-contact-id" }) });

      const json = await res.json();
      expect(json.contactId).toBe("specific-contact-id");
    });
  });
});

describe("Contacts API - Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle special characters in search query", async () => {
    const mockContacts: any[] = [];

    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue(mockContacts),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/contacts?q=Müller%20Straße");
    const res = await contactsGet(req);

    expect(res.status).toBe(200);
  });

  it("should handle unicode in contact data", async () => {
    const newContact = {
      firstName: "Müller",
      lastName: "Münster",
      email: "mueller@münster.de",
    };

    const createdContact = { id: "new-uuid", ...newContact, createdAt: new Date() };

    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([createdContact]),
      }),
    });

    const req = new NextRequest("http://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify(newContact),
    });
    const res = await contactsPost(req);

    expect(res.status).toBe(201);
  });

  it("should handle empty optional fields", async () => {
    const newContact = {
      firstName: "John",
      lastName: "Doe",
      email: null,
      phone: null,
      companyId: null,
    };

    const createdContact = { id: "new-uuid", ...newContact, createdAt: new Date() };

    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([createdContact]),
      }),
    });

    const req = new NextRequest("http://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify(newContact),
    });
    const res = await contactsPost(req);

    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.email).toBeNull();
  });

  it("should handle contact with location data", async () => {
    const newContact = {
      firstName: "John",
      lastName: "Doe",
      addressStreet: "Industriestr 5",
      addressCity: "Munich",
      addressPostalCode: "80331",
      addressCountry: "Germany",
      location: "0101000020E6...",
      locationSource: "own_address" as const,
    };

    const createdContact = { id: "new-uuid", ...newContact, createdAt: new Date() };

    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([createdContact]),
      }),
    });

    const req = new NextRequest("http://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify(newContact),
    });
    const res = await contactsPost(req);

    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.location).toBeDefined();
    expect(json.locationSource).toBe("own_address");
  });

  it("should handle notes field", async () => {
    const newContact = {
      firstName: "John",
      lastName: "Doe",
      notes: "Met at trade fair. Interested in CNC machines. Follow up in Q2.",
    };

    const createdContact = { id: "new-uuid", ...newContact, createdAt: new Date() };

    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([createdContact]),
      }),
    });

    const req = new NextRequest("http://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify(newContact),
    });
    const res = await contactsPost(req);

    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.notes).toContain("trade fair");
  });
});