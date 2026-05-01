import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// 1. Users Table
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: text("role").default("viewer"),
  avatarUrl: text("avatar_url"),
  tier: integer("tier").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

// 2. Customers Table
export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyName: text("company_name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  creditLimit: real("credit_limit").default(0),
  balance: real("balance").default(0),
  tier: integer("tier").default(0),
  creatorId: integer("creator_id").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

// 3. Rates Table
export const rates = sqliteTable("rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  carrier: text("carrier"),
  basePrice: real("base_price").notNull(),
  fuelSurcharge: real("fuel_surcharge").default(0),
  securityFee: real("security_fee").default(0),
  groundHandling: real("ground_handling").default(0),
  otherFees: real("other_fees").default(0),
  currency: text("currency").default("CNY"),
  effectiveDate: integer("effective_date", { mode: "timestamp" }),
  expiryDate: integer("expiry_date", { mode: "timestamp" }),
  creatorId: integer("creator_id").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

// 4. Quotes Table
export const quotes = sqliteTable("quotes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quoteNo: text("quote_no").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  rateId: integer("rate_id").references(() => rates.id),
  totalAmount: real("total_amount").notNull(),
  status: text("status").default("draft"),
  validUntil: integer("valid_until", { mode: "timestamp" }),
  creatorId: integer("creator_id").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

// 5. Bookings Table
export const bookings = sqliteTable("bookings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookingNo: text("booking_no").notNull().unique(),
  quoteId: integer("quote_id").references(() => quotes.id),
  customerId: integer("customer_id").references(() => customers.id),
  origin: text("origin"),
  destination: text("destination"),
  expectedWeight: real("expected_weight"),
  expectedVolume: real("expected_volume"),
  status: text("status").default("pending"),
  creatorId: integer("creator_id").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

// 6. MAWBs Table (Operations)
export const mawbs = sqliteTable("mawbs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mawbNo: text("mawb_no").notNull().unique(),
  bookingId: integer("booking_id").references(() => bookings.id),
  carrier: text("carrier"),
  origin: text("origin"),
  destination: text("destination"),
  status: text("status").default("pending"),
  weight: real("weight"),
  volume: real("volume"),
  chargeableWeight: real("chargeable_weight"),
  pieces: integer("pieces"),
  flightDate: integer("flight_date", { mode: "timestamp" }),
  remarks: text("remarks"),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

// 7. AR Table
export const accountsReceivable = sqliteTable("accounts_receivable", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mawbId: integer("mawb_id").references(() => mawbs.id),
  customerId: integer("customer_id").references(() => customers.id),
  invoiceNo: text("invoice_no"),
  totalAmount: real("total_amount").notNull(),
  currency: text("currency").default("CNY"),
  status: text("status").default("unpaid"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});
