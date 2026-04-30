import { pgTable, serial, text, timestamp, doublePrecision, varchar, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { relations, eq } from "drizzle-orm";

// 1. Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }),
  role: varchar("role", { length: 50 }).default("viewer"), // admin, sales, ops, finance
  avatarUrl: text("avatar_url"),
  tier: integer("tier").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. Customers Table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  creditLimit: doublePrecision("credit_limit").default(0),
  balance: doublePrecision("balance").default(0),
  tier: integer("tier").default(0),
  creatorId: integer("creator_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// 3. MAWBs Table (Operations)
export const mawbs = pgTable("mawbs", {
  id: serial("id").primaryKey(),
  mawbNo: varchar("mawb_no", { length: 20 }).notNull().unique(),
  carrier: varchar("carrier", { length: 10 }),
  origin: varchar("origin", { length: 10 }),
  destination: varchar("destination", { length: 10 }),
  status: varchar("status", { length: 50 }).default("pending"),
  weight: doublePrecision("weight"),
  volume: doublePrecision("volume"),
  chargeableWeight: doublePrecision("chargeable_weight"),
  pieces: integer("pieces"),
  flightDate: timestamp("flight_date"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 4. Accounts Receivable (AR)
export const accountsReceivable = pgTable("accounts_receivable", {
  id: serial("id").primaryKey(),
  mawbId: integer("mawb_id").references(() => mawbs.id),
  customerId: integer("customer_id").references(() => customers.id),
  invoiceNo: varchar("invoice_no", { length: 100 }),
  totalAmount: doublePrecision("total_amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("CNY"),
  status: varchar("status", { length: 20 }).default("unpaid"),
  dueDate: timestamp("due_date"),
  lineItems: jsonb("line_items"), // Array of {name, qty, price, total}
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. Documents Table (File uploads)
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }), // manifest, draft_mawb, invoice
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  referenceId: varchar("reference_id", { length: 100 }), // mawbNo or invoiceNo
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relationships
export const userRelations = relations(users, ({ many }) => ({
  customers: many(customers),
  documents: many(documents),
}));
