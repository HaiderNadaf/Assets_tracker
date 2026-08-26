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
  purchaseInvoice?: StoredFile | null;
  invoiceNumber: string;
  vendor: string;
  purchaseCost: number;
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
