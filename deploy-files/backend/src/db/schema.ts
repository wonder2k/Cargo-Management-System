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

// 3. Rates Table
export const rates = pgTable("rates", {
  id: serial("id").primaryKey(),
  origin: varchar("origin", { length: 10 }).notNull(),
  destination: varchar("destination", { length: 10 }).notNull(),
  carrier: varchar("carrier", { length: 10 }),
  flightNo: varchar("flight_no", { length: 20 }),
  aircraftType: varchar("aircraft_type", { length: 50 }),
  schedule: varchar("schedule", { length: 50 }),
  basePrice: doublePrecision("base_price").notNull(),
  fuelSurcharge: doublePrecision("fuel_surcharge").default(0),
  securityFee: doublePrecision("security_fee").default(0),
  groundHandling: doublePrecision("ground_handling").default(0),
  customsMethods: jsonb("customs_methods"), // { formal: { amount, unit }, 9610: { ... } }
  miscFees: jsonb("misc_fees"), // Array of { name, amount, unit }
  currency: varchar("currency", { length: 10 }).default("CNY"),
  region: varchar("region", { length: 50 }),
  validUntil: timestamp("valid_until"),
  creatorId: integer("creator_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 4. Quotes Table
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  quoteNo: varchar("quote_no", { length: 50 }).notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  customerName: varchar("customer_name", { length: 255 }),
  recipientInfo: text("recipient_info"),
  routes: jsonb("routes"), // Array of quoted routes with adjusted prices
  totalAmount: doublePrecision("total_amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("CNY"),
  status: varchar("status", { length: 20 }).default("sent"), // sent, accepted, rejected, expired
  validUntil: timestamp("valid_until"),
  creatorId: integer("creator_id").references(() => users.id),
  userName: varchar("user_name", { length: 255 }),
  downloadCount: integer("download_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. Bookings Table
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  bookingNo: varchar("booking_no", { length: 50 }).notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  customerName: varchar("customer_name", { length: 255 }),
  origin: varchar("origin", { length: 10 }),
  destination: varchar("destination", { length: 10 }),
  carrier: varchar("carrier", { length: 20 }),
  flightDate: timestamp("flight_date"),
  pieces: integer("pieces"),
  weight: doublePrecision("weight"),
  volume: doublePrecision("volume"),
  cargoDescription: text("cargo_description"),
  declaration: varchar("declaration", { length: 50 }),
  unitPrice: doublePrecision("unit_price"),
  totalAmount: doublePrecision("total_amount"),
  mawbNo: varchar("mawb_no", { length: 50 }),
  shipperInfo: text("shipper_info"),
  consigneeInfo: text("consignee_info"),
  notifyInfo: text("notify_info"),
  internalNotes: text("internal_notes"),
  status: varchar("status", { length: 50 }).default("pending"), 
  creatorId: integer("creator_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 6. MAWBs Table (Operations)
export const mawbs = pgTable("mawbs", {
  id: serial("id").primaryKey(),
  mawbNo: varchar("mawb_no", { length: 20 }).notNull().unique(),
  bookingNo: varchar("booking_no", { length: 50 }), // Reference to bookingNo
  carrier: varchar("carrier", { length: 20 }),
  origin: varchar("origin", { length: 10 }),
  destination: varchar("destination", { length: 10 }),
  flightNo: varchar("flight_no", { length: 20 }),
  status: varchar("status", { length: 50 }).default("pending"),
  weight: doublePrecision("weight"),
  chargeableWeight: doublePrecision("chargeable_weight"),
  volume: doublePrecision("volume"),
  pieces: integer("pieces"),
  dimensions: jsonb("dimensions"), // Array of { l, w, h, pcs }
  flightDate: timestamp("flight_date"),
  atd: timestamp("atd"),
  ata: timestamp("ata"),
  pod: timestamp("pod"),
  warehouse: varchar("warehouse", { length: 100 }),
  warehouseEntryTime: timestamp("warehouse_entry_time"),
  trackingLogs: jsonb("tracking_logs"),
  lastActivity: text("last_activity"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// 5. Accounts Payable (AP)
export const accountsPayable = pgTable("accounts_payable", {
  id: serial("id").primaryKey(),
  mawbId: integer("mawb_id").references(() => mawbs.id),
  vendorName: varchar("vendor_name", { length: 255 }),
  vendorId: varchar("vendor_id", { length: 50 }),
  totalAmount: doublePrecision("total_amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("CNY"),
  status: varchar("status", { length: 20 }).default("pending"),
  lineItems: jsonb("line_items"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 6. Invoices Table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNo: varchar("invoice_no", { length: 50 }).notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  amount: doublePrecision("amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("CNY"),
  status: varchar("status", { length: 50 }).default("unpaid"),
  issueDate: timestamp("issue_date"),
  dueDate: timestamp("due_date"),
  lineItems: jsonb("line_items"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 7. Documents Table (File uploads)
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
