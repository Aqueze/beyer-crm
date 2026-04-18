import { pgTable, text, timestamp, uuid, jsonb, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const locationSourceEnum = pgEnum("location_source", ["own_address", "company", "email_domain"]);
export const importStatusEnum = pgEnum("import_status", ["pending", "running", "completed", "failed"]);
export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Companies table with PostGIS geography
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  domain: text("domain"),
  website: text("website"),
  addressStreet: text("address_street"),
  addressCity: text("address_city"),
  addressPostalCode: text("address_postal_code"),
  addressCountry: text("address_country"),
  // PostGIS GEOGRAPHY(POINT, 4326) stored as raw bytes, managed via raw SQL
  location: text("location"), // EWKB hex string for PostGIS
  locationSource: locationSourceEnum("location_source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Contacts table
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  addressStreet: text("address_street"),
  addressCity: text("address_city"),
  addressPostalCode: text("address_postal_code"),
  addressCountry: text("address_country"),
  // PostGIS GEOGRAPHY(POINT, 4326) as EWKB hex
  location: text("location"),
  locationSource: locationSourceEnum("location_source").default("own_address"),
  tags: text("tags").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Imports table
export const imports = pgTable("imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  columnMapping: jsonb("column_mapping").notNull(),
  status: importStatusEnum("status").notNull().default("pending"),
  totalRows: integer("total_rows"),
  importedRows: integer("imported_rows").default(0),
  errorLog: jsonb("error_log"),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Geocode cache table
export const geocodeCache = pgTable("geocode_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  addressHash: text("address_hash").notNull().unique(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  formattedAddress: text("formatted_address"),
  source: text("source").notNull(), // "nominatim" | "opencage"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Domain lookups table
export const domainLookups = pgTable("domain_lookups", {
  id: uuid("id").primaryKey().defaultRandom(),
  domain: text("domain").notNull().unique(),
  companyName: text("company_name"),
  website: text("website"),
  country: text("country"),
  manuallyOverridden: boolean("manually_overridden").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Interactions table
export const interactions = pgTable("interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "email" | "call" | "meeting" | "note"
  subject: text("subject"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  imports: many(imports),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  contacts: many(contacts),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, {
    fields: [contacts.companyId],
    references: [companies.id],
  }),
  interactions: many(interactions),
}));

export const importsRelations = relations(imports, ({ one }) => ({
  user: one(users, {
    fields: [imports.userId],
    references: [users.id],
  }),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  contact: one(contacts, {
    fields: [interactions.contactId],
    references: [contacts.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Import = typeof imports.$inferSelect;
export type NewImport = typeof imports.$inferInsert;
export type GeocodeCache = typeof geocodeCache.$inferSelect;
export type DomainLookup = typeof domainLookups.$inferSelect;
export type Interaction = typeof interactions.$inferSelect;
export type NewInteraction = typeof interactions.$inferInsert;
