export interface StaffMember {
  staffId: number;
  username: string;
  name: string;
  role: string;
}

export const INITIAL_STAFF_LIST: StaffMember[] = [
  { staffId: 300000, username: 'Superkhan', name: 'Afreen Mall Super Admin', role: 'SUPER_ADMIN' },
  { staffId: 300001, username: 'manager1', name: 'Sanjay Gupta (Store Manager)', role: 'STORE_MANAGER' },
  { staffId: 300002, username: 'cashofficer1', name: 'Babuji Namole (Cash Officer)', role: 'CASH_OFFICER' },
  { staffId: 300003, username: 'accountant1', name: 'Amit Verma (Accountant)', role: 'ACCOUNTANT' },
  { staffId: 300004, username: 'inventory1', name: 'Vikram Singh (Inventory / GRN Exec.)', role: 'INVENTORY_STAFF' },
  { staffId: 300005, username: 'warehouse1', name: 'Deepak Gaikwad (Warehouse Staff)', role: 'WAREHOUSE_STAFF' },
  { staffId: 300006, username: 'purchase1', name: 'Neha Singh (Purchase Team)', role: 'PURCHASE_TEAM' },
  { staffId: 300007, username: 'auditor1', name: 'Rajesh Deshmukh (Auditor)', role: 'AUDITOR' },
  { staffId: 300008, username: 'hr1', name: 'Priya Kulkarni (HR Manager)', role: 'HR_MANAGER' },
  { staffId: 300009, username: 'sales1', name: 'Rohan Kadam (Sales Manager)', role: 'SALES_MANAGER' },
  { staffId: 300010, username: 'crm1', name: 'Sneha Joshi (CRM Manager)', role: 'CRM_MANAGER' },
  { staffId: 300011, username: 'cashier1', name: 'Pooja Sharma (Cashier)', role: 'CASHIER' },
  { staffId: 300012, username: 'cashier2', name: 'Vinayak Shinde (Cashier)', role: 'CASHIER' },
  { staffId: 300013, username: 'cashier3', name: 'Mahesh Patil (Cashier)', role: 'CASHIER' },
  { staffId: 300014, username: 'cashier4', name: 'Sachin Jadhav (Cashier)', role: 'CASHIER' },
  { staffId: 300015, username: 'cashier5', name: 'Rahul Chavan (Cashier)', role: 'CASHIER' },
];
