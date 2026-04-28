export type Role = 'admin' | 'business' | 'operation' | 'finance';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  // New Personal Center fields
  companyName?: string;
  contactPerson?: string;
  contactPhone?: string;
  logoUrl?: string;
  regions?: string[]; // Regional permissions
  warehouses?: Warehouse[];
}

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  contact: string;
}

export type CustomerType = 'direct' | 'local_agent' | 'overseas_agent';
export type PaymentTerm = 'weekly' | 'bi-weekly' | 'monthly';
export type Currency = 'USD' | 'CNY';

export interface Customer {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  type: CustomerType;
  creditLimit: number;
  creditCurrency: Currency;
  paymentTerms: PaymentTerm;
  email?: string;
  status: 'active' | 'frozen';
}

export type FeeUnit = 'per_kg' | 'per_shipment';

export interface FeeStructure {
  amount: number;
  unit: FeeUnit;
}

export interface FlightRate {
  id: string;
  carrier: string;
  flightNo?: string;
  origin: string;
  destination: string;
  region: string;
  aircraftType?: string;
  schedule?: string;
  etd?: string;
  eta?: string;
  
  // Base rates (Admin side)
  baseFreight: number;
  fuelSurcharge: number; // per KG
  securityScreening: number; // per KG
  terminalHandling: number; // per KG
  
  // New complex fee structure
  customsMethods?: Partial<Record<ExportDeclarationMethod, FeeStructure>>;
  miscFees?: { name: string, amount: number, unit: FeeUnit }[];

  // Legacy fields (optional for backward compatibility)
  customsClearance?: FeeStructure;
  otherCharges?: FeeStructure;
  
  currency: string;
  lastUpdated: string;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface Quotation {
  id: string;
  quotationNo: string;
  customerId: string;
  customerName?: string;
  routes: {
    origin: string;
    destination: string;
    carrier: string;
    finalPrice: number;
    basePrice: number;
    adjustment: string; // e.g. "+10%", "-5.0", "custom"
  }[];
  currency: string;
  validUntil: string;
  status: QuotationStatus;
  createdAt: string;
  createdBy: string;
  downloadCount: number;
}

export interface QuotationLog {
  id: string;
  quotationNo: string;
  userId: string;
  userName: string;
  customerId: string;
  customerName: string;
  recipientInfo: string;
  routes: string[];
  summary: string;
  timestamp: string;
}

export type MawbStatus = 
  | 'pending' 
  | 'booked' 
  | 'confirmed' 
  | 'warehouse_in' 
  | 'customs' 
  | 'terminal_in' 
  | 'departed' 
  | 'arrived' 
  | 'closed' 
  | 'exception'
  | 'on_hold'; // Added for exception handling

export interface MAWB {
  id: string;
  internalMawbNo: string;
  airlineMawbNo?: string;
  customerId: string;
  origin: string;
  destination: string;
  carrier?: string;
  flightNo?: string;
  etd?: string;
  eta?: string;
  atd?: string; // Actual Time of Departure
  ata?: string; // Actual Time of Arrival
  pod_time?: string; // Proof of Delivery Time
  status: MawbStatus;
  lastUpdated: string;
  
  // Warehouse details
  grossWeight?: number;
  chargeableWeight?: number;
  dims?: { l: number, w: number, h: number, pcs: number }[];
  returnedItems?: { subMawb: string, reason: string, photoUrl?: string }[];
  
  // Manifest & Drafts
  manifestFileUrl?: string; // Excel manifest uploaded by business
  draftMawbUrl?: string;    // PDF draft uploaded by operation
  isDraftConfirmed?: boolean;
  
  // Custom & Terminal
  customsCleared?: boolean;
  customsRemark?: string;
  customsException?: string;
  terminalRemark?: string;
  manifestUrl?: string; // Document requested
}

export interface MawbOperation {
  id: string;
  mawbId: string;
  step: string;
  operatorId: string;
  timestamp: string;
  remark: string;
  fileUrl?: string;
}

export type InvoiceStatus = 'draft' | 'issued' | 'partial' | 'paid';

export interface Invoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  mawbId: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
}

export type BookingStatus = 
  | 'pending' 
  | 'pre_booked' 
  | 'space_confirmed' 
  | 'space_partial' 
  | 'space_rejected' 
  | 'client_accepted' 
  | 'finalized' 
  | 'warehouse_in'
  | 'on_hold'
  | 'cancelled';

export type ExportDeclarationMethod = 'formal' | '9610' | '9710' | '9810';

export interface Booking {
  id: string;
  bookingNo: string;
  customerId: string;
  customerName?: string;
  
  // Route selection from Pricing
  rateId: string;
  origin: string;
  destination: string;
  carrier: string;
  flightNo?: string;
  
  // Basic Info
  flightDate: string;
  pieces: number;
  weight: number;
  volume: number;
  goodsDescription: string;
  declarationMethod: ExportDeclarationMethod;
  unitPrice: number;
  costPrice?: number;
  currency: string;
  
  // Detailed surcharges from the baseline rate
  fuelSurcharge?: number;
  securityScreening?: number;
  terminalHandling?: number;
  
  customsMethods?: Partial<Record<ExportDeclarationMethod, FeeStructure>>;
  miscFees?: { name: string, amount: number, unit: FeeUnit }[];

  customsClearance?: FeeStructure;
  otherCharges?: FeeStructure;

  // Operation Space Handling
  spaceStatus?: 'Yes' | 'No' | 'Partial';
  confirmedVolume?: number;
  operationRemarks?: string;

  // Client Final Info
  shipperInfo?: string;
  consigneeInfo?: string;
  alsoNotify?: string;

  // Final confirmation
  mawbNo?: string;
  warehouseId?: string;
  entryTime?: string;
  
  // Manifest & Drafts
  manifestFileUrl?: string; // Excel manifest uploaded by business
  draftMawbUrl?: string;    // PDF draft uploaded by operation
  isDraftConfirmed?: boolean;
  
  status: BookingStatus;
  createdAt: string;
  createdBy: string;
}
