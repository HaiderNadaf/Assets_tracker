export const ASSET_STATUSES = ["Active", "Repair", "Sold", "Scrapped"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

/** Which company the asset belongs to. */
export const ENTITIES = ["ENP", "GCC"] as const;
export type Entity = (typeof ENTITIES)[number];

export const DEPRECIATION_METHODS = ["SLM", "WDV", "None"] as const;
export type DepreciationMethod = (typeof DEPRECIATION_METHODS)[number];

export interface StoredFile {
  url: string;
  publicId: string;
  fileName: string;
  format: string;
  bytes: number;
  resourceType: string;
  uploadedAt: string;
}

/** One maintenance / service event with its own invoice and photo. */
export interface ServiceRecord {
  _id?: string;
  description: string;
  purchaseDate: string | null;
  serviceDate: string | null;
  paymentDate: string | null;
  purchaseCost: number;
  serviceCost: number;
  invoiceNumber: string;
  vendor: string;
  warrantyPeriod: string;
  photo?: StoredFile | null;
}

export interface TransferEntry {
  _id?: string;
  date: string;
  fromEmployee: string;
  toEmployee: string;
  fromDepartment: string;
  toDepartment: string;
  fromLocation: string;
  toLocation: string;
  remarks: string;
}

export interface BookValue {
  yearsElapsed: number;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  currentValue: number;
}

export interface Asset {
  _id: string;
  /** FA code, typed in by hand. */
  assetCode: string;
  entity: Entity;
  photo?: StoredFile | null;
  product: string;
  category: string;
  brand: string;
  productNumber: string;
  purchaseDate: string | null;
  paymentDate: string | null;
  /** Full list. `purchaseInvoice` is the server-derived primary (index 0). */
  purchaseInvoices: StoredFile[];
  purchaseInvoice?: StoredFile | null;
  invoiceNumber: string;
  vendor: string;
  purchaseCost: number;
  gstPercent: number;
  /** Derived on the server from purchaseCost and gstPercent. */
  gstAmount?: number;
  totalCost?: number;
  depreciation: {
    method: DepreciationMethod;
    ratePercent: number;
    usefulLifeYears: number;
    salvageValue: number;
  };
  assignedEmployee: {
    name: string;
    employeeId: string;
    email: string;
  };
  department: string;
  location: string;
  serviceRecords: ServiceRecord[];
  warranty: {
    provider: string;
    expiryDate: string | null;
    documents: StoredFile[];
    document?: StoredFile | null;
  };
  physicalVerification: {
    verified: boolean;
    verifiedOn: string | null;
    verifiedBy: string;
    remarks: string;
    photo?: StoredFile | null;
  };
  transferHistory: TransferEntry[];
  status: AssetStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  book?: BookValue;
  warrantyStatus?: "In Warranty" | "Expiring Soon" | "Expired" | "Unknown";
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
}

export interface ListResponse {
  success: boolean;
  data: Asset[];
  pagination: Pagination;
}

export interface FilterOptions {
  statuses: AssetStatus[];
  entities: Entity[];
  entitiesInUse: string[];
  departments: string[];
  locations: string[];
  categories: string[];
  products: string[];
  employees: string[];
}

export interface Stats {
  totalAssets: number;
  totalPurchaseValue: number;
  totalBookValue: number;
  totalDepreciation: number;
  unverified: number;
  warrantyExpiring: number;
  warrantyExpired: number;
  statusCounts: Record<AssetStatus, number>;
  byStatus: { name: string; count: number; value: number }[];
  byEntity: { name: string; count: number; value: number }[];
  byDepartment: { name: string; count: number; value: number }[];
  byCategory: { name: string; count: number }[];
  monthly: { month: string; count: number; value: number }[];
}

export interface AssetQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  entity?: string;
  department?: string;
  location?: string;
  category?: string;
  product?: string;
  verified?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/* ------------------------------------------------------------------ */
/* Purchase orders                                                     */
/* ------------------------------------------------------------------ */

export const PO_STATUSES = [
  "Draft",
  "Sent",
  "Approved",
  "Partially Received",
  "Received",
  "Cancelled",
] as const;
export type PoStatus = (typeof PO_STATUSES)[number];

/** How the tax line prints: one combined line, or split into its components. */
export const GST_MODES = ["GST", "CGST+SGST", "IGST"] as const;
export type GstMode = (typeof GST_MODES)[number];

/**
 * What a row of the order grid is. A heading names a group and carries no money,
 * a sub is a priced member of the group above it, and an item is a priced row on
 * its own. This is what drives the 1 / a / b / c / 2 numbering when printed.
 */
export const PO_ITEM_KINDS = ["item", "heading", "sub"] as const;
export type PoItemKind = (typeof PO_ITEM_KINDS)[number];

/** A buyer, supplier or delivery address block as printed on the order. */
export interface Party {
  name: string;
  address: string;
  gstNumber: string;
}

export interface Supplier extends Party {
  contactPerson: string;
  phone: string;
  email: string;
}

export interface PoItem {
  _id?: string;
  kind: PoItemKind;
  name: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  price: number;
  /** Server-derived: the printed S.No, and quantity x price. */
  label?: string;
  amount?: number;
}

export interface PoTotals {
  subTotal: number;
  discount: number;
  taxableAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  itemCount: number;
}

export interface PurchaseOrder {
  _id: string;
  entity: Entity;
  poNumber: string;
  poDate: string | null;

  buyer: Party;
  supplier: Supplier;
  deliverTo: Party;

  vendorCode: string;
  currency: string;
  supplierRef: string;
  otherReference: string;
  paymentTerms: string;
  project: string;
  purchasingGroup: string;

  items: PoItem[];

  discount: number;
  gstPercent: number;
  gstMode: GstMode;

  status: PoStatus;
  expectedDate: string | null;
  department: string;
  requestedBy: string;
  approvedBy: string;

  terms: string[];
  notes: string;
  attachments: StoredFile[];

  createdAt: string;
  updatedAt: string;
  /** Derived on the server from the lines up. */
  totals: PoTotals;
}

export interface PoListResponse {
  success: boolean;
  data: PurchaseOrder[];
  pagination: Pagination;
}

export interface PoFilterOptions {
  statuses: PoStatus[];
  entities: Entity[];
  gstModes: GstMode[];
  suppliers: string[];
  departments: string[];
  requesters: string[];
  projects: string[];
  purchasingGroups: string[];
  units: string[];
  buyers: Record<string, Party>;
}

export interface PoStats {
  totalOrders: number;
  totalValue: number;
  openOrders: number;
  openValue: number;
  statusCounts: Record<PoStatus, number>;
  byStatus: { name: string; count: number }[];
  bySupplier: { name: string; count: number; value: number }[];
  byEntity: { name: string; count: number; value: number }[];
  monthly: { month: string; count: number; value: number }[];
}

/**
 * The next number in one company's series.
 *
 * `style` says which convention that company already uses: "financial-year" for
 * 049/2025-26, which restarts each April, or "plain" for a running 032 that
 * never restarts. `financialYear` is null for the plain style.
 */
export interface NextPoNumber {
  poNumber: string;
  entity: string;
  style: "financial-year" | "plain";
  financialYear: string | null;
}

export interface PoQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  entity?: string;
  supplier?: string;
  department?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/* ------------------------------------------------------------------ */
/* Vendors                                                             */
/* ------------------------------------------------------------------ */

/**
 * The vendor master: one shared list across both companies. Picking a vendor
 * on a purchase order pre-fills the Supplier section from here, but the PO
 * keeps its own copy from then on - editing a vendor later does not rewrite
 * orders already raised against it.
 */
export interface Vendor {
  _id: string;
  name: string;
  vendorCode: string;
  /** What this vendor is bought for, e.g. "STEEL" - drives the vendor code's prefix. */
  category: string;
  gstNumber: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  /** What this vendor is known to supply, e.g. "MS Structural Steel". */
  suppliesTags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}
