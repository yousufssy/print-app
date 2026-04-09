// ── Auth ──────────────────────────────────────────────
export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'user' | 'reader';
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ── Order (masterw) ───────────────────────────────────
export interface Order {
  ID: string;
  Year: string;
  Ser?: string;
  Customer: string;
  Eng_Name?: string;
  date_come?: string;
  Apoent_Delv_date?: string;
  Demand?: string;
  grnd_qunt?: string;
  marji3?: string;
  unit?: string;
  Pattern?: string;
  Pattern2?: string;
  Code?: string;
  Code_M?: string;
  MontagNum?: string;
  final_size_tall?: string;
  final_size_width?: string;
  final_size_tall2?: string;
  final_size_width2?: string;
  LongU?: string;
  WedthU?: string;
  HightU?: string;
  Lesan?: string;
  Clr_qunt?: string;
  print_on?: string;
  'Qunt_of_print_on'?: string;
  sheet_unit_qunt?: string;
  Machin_Print?: string;
  Machin_Cut?: string;
  teq_inf?: string;
  inf_req?: string;
  varnich?: string;
  uv?: string;
  uv_Spot?: string;
  seluvan_lum?: string;
  seluvan_mat?: string;
  Tad3em?: string;
  Tay?: string;
  harary?: string;
  rolling?: string;
  Printed?: string;
  Billed?: string;
  Reseved?: string;
  note_ord?: string;
  Notes?: string;
  Proplems_Pro?: string;
  Proplems_Cus?: string;
  vouchers?: Voucher[];
  Activity?: string;
}

export interface OrderListItem {
  ID: string;
  Year: string;
  Ser?: string;
  Customer: string;
  Eng_Name?: string;
  date_come?: string;
  Apoent_Delv_date?: string;
  Demand?: string;
  Clr_qunt?: string;
  Printed?: string;
  Billed?: string;
  Reseved?: string;
}

export interface OrdersResponse {
  data: OrderListItem[];
  total: number;
  page: number;
  last_page: number;
}

// ── Voucher ───────────────────────────────────────────
export interface Voucher {
  ID: string;
  Year: string;
  Voucher_num?: string;
  V_date?: string;
  V_Qunt?: string;
  Bill_Num?: string;
  Contean?: string;
  Paking_q?: string;
  Box_tp?: string;
  Box_L?: string;
  Box_W?: string;
  Box_H?: string;
  Note_V?: string;
}

// ── Customer ──────────────────────────────────────────
export interface Customer {
  Customer: string;
  Activety?: string;
}

// ── User ──────────────────────────────────────────────
export interface SystemUser {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'user' | 'reader';
  active: boolean;
  created_at: string;
}

// ── Dashboard ─────────────────────────────────────────
export interface DashboardData {
  total: number;
  printed: number;
  billed: number;
  delivered: number;
  monthly: Record<string, number>;
  recent: OrderListItem[];
  years: string[];
}

// ── API Generic ───────────────────────────────────────
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
