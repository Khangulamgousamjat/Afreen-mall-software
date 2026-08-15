export const RoleName = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  BRANCH_ADMIN: 'BRANCH_ADMIN',
  REGIONAL_MANAGER: 'REGIONAL_MANAGER',
  STORE_MANAGER: 'STORE_MANAGER',
  PURCHASE_MANAGER: 'PURCHASE_MANAGER',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  FINANCE_MANAGER: 'FINANCE_MANAGER',
  HR_MANAGER: 'HR_MANAGER',
  SALES_MANAGER: 'SALES_MANAGER',
  CRM_MANAGER: 'CRM_MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  CASHIER: 'CASHIER',
  CASH_OFFICER: 'CASH_OFFICER',
  INVENTORY_STAFF: 'INVENTORY_STAFF',
  WAREHOUSE_STAFF: 'WAREHOUSE_STAFF',
  PURCHASE_TEAM: 'PURCHASE_TEAM',
  CUSTOMER_SERVICE: 'CUSTOMER_SERVICE',
  AUDITOR: 'AUDITOR',
  READ_ONLY: 'READ_ONLY',
} as const;
export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const SaleType = {
  RETAIL: 'RETAIL',
  WHOLESALE: 'WHOLESALE',
  INSTITUTIONAL: 'INSTITUTIONAL',
} as const;
export type SaleType = (typeof SaleType)[keyof typeof SaleType];

export const SaleTypeLabels: Record<SaleType, string> = {
  RETAIL: 'Retail Sale',
  WHOLESALE: 'Wholesale',
  INSTITUTIONAL: 'Institutional',
};

export const PaymentMode = {
  CASH: 'CASH',
  CARD: 'CARD',
  UPI: 'UPI',
  SPLIT: 'SPLIT',
} as const;
export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode];

export const CashVarianceStatus = {
  MATCHED: 'MATCHED',
  SHORT: 'SHORT',
  EXCESS: 'EXCESS',
} as const;
export type CashVarianceStatus = (typeof CashVarianceStatus)[keyof typeof CashVarianceStatus];

export const PurchaseOrderStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RECEIVED: 'RECEIVED',
  COMPLETED: 'COMPLETED',
} as const;
export type PurchaseOrderStatus = (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];

export interface UserSession {
  id: string;
  staffId: number;
  username: string;
  fullName: string;
  role: RoleName;
  mustChangePassword: boolean;
  canProcessSaleReturn?: boolean;
}

export interface CashDenominations {
  d2000: number;
  d500: number;
  d200: number;
  d100: number;
  d50: number;
  d20: number;
  d10: number;
  d5: number;
  d2: number;
  d1: number;
}

export type DenominationBreakdown = CashDenominations;

export interface POSCartItem {
  id: string;
  barcode: string;
  name: string;
  description?: string;
  unit?: string;
  hsnCode?: string;
  qty: number;
  mrp: number;
  rate: number;
  netRate: number;
  discountPercent: number;
  discountAmount: number;
  taxRatePercent?: number;
  taxAmount?: number;
  gstPercent: number;
  value: number;
  finalTotal?: number;
}
