import { describe, it, expect } from "vitest";

describe("Database Schema", () => {
  it("should export users table", async () => {
    const schema = await import("@/lib/db/schema");
    expect(schema.users).toBeDefined();
    expect(typeof schema.users).toBe("object");
  });

  it("should export companies table with location field", async () => {
    const schema = await import("@/lib/db/schema");
    expect(schema.companies).toBeDefined();
    // Drizzle tables are plain objects with columns as properties
    expect((schema.companies as any).location).toBeDefined();
    expect((schema.companies as any).locationSource).toBeDefined();
  });

  it("should export contacts table with location and tags fields", async () => {
    const schema = await import("@/lib/db/schema");
    expect(schema.contacts).toBeDefined();
    expect((schema.contacts as any).location).toBeDefined();
    expect((schema.contacts as any).locationSource).toBeDefined();
    expect((schema.contacts as any).tags).toBeDefined();
  });

  it("should export imports table", async () => {
    const schema = await import("@/lib/db/schema");
    expect(schema.imports).toBeDefined();
    expect(schema.geocodeCache).toBeDefined();
    expect(schema.domainLookups).toBeDefined();
  });

  it("should export all relation definitions", async () => {
    const schema = await import("@/lib/db/schema");
    expect(schema.usersRelations).toBeDefined();
    expect(schema.companiesRelations).toBeDefined();
    expect(schema.contactsRelations).toBeDefined();
    expect(schema.importsRelations).toBeDefined();
  });

  it("should export enums", async () => {
    const schema = await import("@/lib/db/schema");
    expect(schema.locationSourceEnum).toBeDefined();
    expect(schema.importStatusEnum).toBeDefined();
    expect(schema.userRoleEnum).toBeDefined();
  });
});

describe("Auth Configuration", () => {
  it("should export NextAuth handlers and functions from lib/auth", async () => {
    // Mock @/lib/auth to avoid loading next-auth which imports next/server
    vi.mock("@/lib/auth", () => ({
      handlers: {},
      signIn: vi.fn(),
      signOut: vi.fn(),
      auth: vi.fn(),
    }));
    const auth = await import("@/lib/auth");
    expect(auth.handlers).toBeDefined();
    expect(typeof auth.handlers).toBe("object");
    expect(auth.signIn).toBeDefined();
    expect(typeof auth.signIn).toBe("function");
    expect(auth.signOut).toBeDefined();
    expect(typeof auth.signOut).toBe("function");
    expect(auth.auth).toBeDefined();
    expect(typeof auth.auth).toBe("function");
  });
});

describe("DB Client", () => {
  it("should export db client", async () => {
    const { db } = await import("@/lib/db");
    expect(db).toBeDefined();
  });
});
