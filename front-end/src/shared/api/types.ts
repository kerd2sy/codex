export type UserRole = 'admin' | 'pharmacist' | 'user' | 'gomla' | 'employee';

export interface User {
  id: string | number;
  email: string;
  manager_name: string; // From backend
  full_name?: string;  // Kept for backward compat
  role: UserRole;
  manager_phone?: string;
  phone?: string; // Kept for backward compat
  avatar_url?: string;
  provider?: 'email' | 'google' | 'facebook';
  is_email_verified: boolean;
  can_create_invoice: boolean;
  can_access_employee?: boolean;
  can_access_reviewer?: boolean; // keeping for backward compatibility
  employee_id?: number;
  employee_role?: string;
  token_version: number;
  fcm_token?: string;
  expo_push_token?: string;
  roles?: string[];
  pharmacies?: Pharmacy[];
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token?: string;
}

export interface Pharmacy {
  id: number;
  name: string;
  username?: string;
    manager_phone?: string;
    avatar_url?: string;
    email: string;
  location_url?: string;
  kind?: number;
  tier?: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  category?: string;
  stock?: number;
  qty?: number;
  disc_c?: number;
  disc_c2?: number;
  disc_r?: number;
  disc_r2?: number;
  disc_w?: number;
  disc_w2?: number;
  disc_p?: number;
  disc_p2?: number;
  disc_l?: number;
  disc_l2?: number;
  discount_percent?: number;
}

export interface InvoiceItem {
  id: number;
  prod_id?: string;
  name: string;
  price: string | number;
  qty: string | number;
  quantity?: string | number; // Alias often used in screens
  discount?: string | number;
  total?: string | number;
  detail_id?: number | string;
  backend_invoice_id?: number | string;
  return_id?: string;
}

export interface Invoice {
  id: string | number;
  pharmacy_name?: string;
  supplier?: string;
  date: string;
  total_amount: number;
  itemsList: InvoiceItem[];
  bags?: number;
  boxes?: number;
  is_fridge?: boolean;
  BACET_ID?: string;
  KARTONA1_ID?: string;
  COUNT_FREEZE?: string;
}

export interface NavItem {
  id: string;
  title: string;
  description?: string;
  icon: any; // Allow any for icon names to avoid Ionicons strict Glyph types issues
  route: string;
  color?: string;
  roles?: UserRole[];
}

export interface APIError {
  detail: string | Array<{ loc: string[]; msg: string; type: string }>;
}
