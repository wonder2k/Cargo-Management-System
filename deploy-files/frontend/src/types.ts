export type Role = 'admin' | 'business' | 'operation' | 'finance';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string | number; // Changed from uid to id
  email: string;
  displayName?: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  companyName?: string;
  contactPerson?: string;
  contactPhone?: string;
  logoUrl?: string;
  regions?: string[];
  warehouses?: Warehouse[];
  tier?: number;
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
  id: string | number;
  code: string;
  name: string;
  companyName?: string; // Add if used
  countryCode: string;
  type: CustomerType;
  creditLimit: number;
  creditCurrency: Currency;
  paymentTerms: PaymentTerm;
  email?: string;
  status: 'active' | 'frozen';
  tier?: number;
}

export type FeeUnit = 'per_kg' | 'per_shipment';

export interface FeeStructure {
  amount: number;
  unit: FeeUnit;
}

export interface FlightRate {
  id: string | number;
  carrier: string;
  flightNo?: string;
  origin: string;
  destination: string;
  region: string;
  aircraftType?: string;
  schedule?: string;
  etd?: string;
  eta?: string;
  baseFreight: number;
  fuelSurcharge: number;
  securityScreening: number;
  terminalHandling: number;
  customsMethods?: Partial<Record<ExportDeclarationMethod, FeeStructure>>;
  miscFees?: { name: string, amount: number, unit: FeeUnit }[];
  customsClearance?: FeeStructure;
  otherCharges?: FeeStructure;
  currency: string;
  lastUpdated: string;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface Quotation {
  id: string | number;
  quotationNo: string;
  customerId: string | number;
  customerName?: string;
  routes: {
    origin: string;
    destination: string;
    carrier: string;
    finalPrice: number;
    basePrice: number;
    adjustment: string;
  }[];
  currency: string;
  validUntil: string;
  status: QuotationStatus;
  createdAt: string;
  createdBy: string | number;
  userName?: string;
  downloadCount: number;
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
  | 'on_hold';

export interface MAWB {
  id: string | number;
  mawbNo: string;
  bookingNo?: string;
  customerId?: string | number;
  origin: string;
  destination: string;
  carrier?: string;
  flightNo?: string;
  flightDate?: string;
  atd?: string;
  ata?: string;
  pod_time?: string;
  status: MawbStatus;
  lastUpdated: string;
  grossWeight?: number;
  chargeableWeight?: number;
  weight?: number; // Legacy alias or additional field if needed
  pieces?: number;
  volume?: number;
  remarks?: string;
  dims?: { l: number, w: number, h: number, pcs: number }[];
  trackingLogs?: any[];
  warehouse?: string;
  warehouseEntryTime?: string;
  draftFileUrl?: string;
  draftFileName?: string;
}

export type InvoiceStatus = 'draft' | 'issued' | 'partial' | 'paid' | 'unpaid';

export interface Invoice {
  id: string | number;
  invoiceNo: string;
  customerId: string | number;
  mawbId?: string | number;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  lineItems: any[];
  createdAt: string;
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
  | 'cancelled'
  | 'closed';

export type ExportDeclarationMethod = 'formal' | '9610' | '9710' | '9810';

export interface Booking {
  id: string | number;
  bookingNo: string;
  customerId: string | number;
  customerName?: string;
  rateId?: string | number;
  origin: string;
  destination: string;
  carrier: string;
  flightNo?: string;
  flightDate: string;
  pieces: number;
  weight: number;
  volume: number;
  goodsDescription: string;
  declarationMethod: ExportDeclarationMethod;
  unitPrice: number;
  costPrice?: number;
  currency: string;
  fuelSurcharge?: number;
  securityScreening?: number;
  terminalHandling?: number;
  customsMethods?: Partial<Record<ExportDeclarationMethod, FeeStructure>>;
  miscFees?: { name: string, amount: number, unit: FeeUnit }[];
  mawbNo?: string;
  warehouseId?: string;
  entryTime?: string;
  manifestFileUrl?: string;
  manifestFileName?: string;
  status: BookingStatus;
  createdAt: string;
  createdBy: string | number;
  shipperInfo?: string;
  consigneeInfo?: string;
  alsoNotify?: string;
}
