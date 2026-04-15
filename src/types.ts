export interface Order {
  row_id?: number;
  // Basic Info
  Ser: string;
  Customer: string;
  ID: string;
  Year: string;
  marji3?: string;
  Notes?: string;
  date_come?: string;
  Apoent_Delv_date?: string;
  delev_date?: string;
  unit?: 'لا' | 'نعم';
  Demand?: number;
  Med_smpl_Q?: number;
  AttachmentsOrders?: string;
  Perioud?: Date;
  note_ord?: string;
  Varnish?: 'True' | 'False';
  Qunt_Ac?: number;
  // Print Specs
  Cus_Paking?: string;
  box_stk_typ?: string;
  Pattern?: string;
  Pattern2?: string;
  ear?: string;
  UnitMed?: 'ورقة' | 'كيلو' | 'متر';
  Form?: 'لا' | 'نعم';
  Loading?: string;
  Code_M?: string;
  Free_clr?: string;
  Free_txt?: string;
  Price?: number;
  authorization?: string;
  Code?: string;
  Mix_num?: string;
  ProDate?: string;
  ExpDate?: string;
  Authr_co?: string;
  Pat_Num?: string;
  modefyM?: string;

  // Production Dimensions
  SoftU?: number;
  TafU?: number;
  LongU?: number;
  WedthU?: number;
  HightU?: number;
  Lesan?: number;
  MontagNum?: string;
  Cut_num?: 'لأول مرة' | 'موجود';
  final_size_tall?: number;
  final_size_tall2?: number;
  final_size_width?: number;
  final_size_width2?: number;
  print_on?: number;
  print_on2?: number;
  sheet_unit_qunt?: number;
  sheet_unit_qunt2?: number;
  Qunt_of_print_on?: number;
  Qunt_of_print_on2?: number;
  Clr_qunt?: string;
  Med_Sample?: number;
  grnd_qunt?: number;
  teq_inf?: string;

  // Quality & Status
  Machin_Print?: string;
  Machin_Cut?: string;
  clr_Qnt_order?: string;
  varnich?: 'True' | 'False';
  uv?: 'True' | 'False';
  uv_Spot?: 'True' | 'False';
  seluvan_lum?: 'True' | 'False';
  seluvan_mat?: 'True' | 'False';
  Tad3em?: 'True' | 'False';
  Tay?: 'True' | 'False';
  harary?: 'True' | 'False';
  rolling?: 'True' | 'False';
  Printed?: 'True' | 'False';
  Billed?: 'True' | 'False';
  Reseved?: 'True' | 'False';
  cust_with_baking?: 'True' | 'False';
  cust_with_folding?: 'True' | 'False';
  cust_tad3em_zkzk?: 'True' | 'False';
  cust_harary?: 'True' | 'False';
  cust_bp?: 'True' | 'False';
  cust_tlm3_bq3y?: 'True' | 'False';
  inf_req?: string;
  DubelM?: boolean; // Always ''
}

export interface Voucher {
  ID: string;
  Year: string;
  Voucher_num: string;
  V_date: string;
  V_Qunt: string;
  Bill_Num: string;
  Contean: string;
  Paking_q: string;
  Box_tp: string;
  Box_L: string;
  Box_W: string;
  Box_H: string;
}

export interface Customer {
  Customer: string;
  _row_id: number;
}

// Table row types
export type TableRow = Record<string, string>;
