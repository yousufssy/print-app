export interface Order {
  row_id?: string;
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
  Demand?: string;
  Med_smpl_Q?: string;
  AttachmentsOrders?: string;
  Perioud?: Date;
  note_ord?: string;
  Varnish?: 'True' | 'False';
  Qunt_Ac?: string;
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
  Free_text?: string;
  Price?: string;
  authorization?: string;
  Code?: string;
  Mix_num?: string;
  ProDate?: string;
  ExpDate?: string;
  Authr_co?: string;
  Pat_num?: string;
  modefyM?: string;

  // Production Dimensions
  SoftU?: string;
  TafU?: string;
  LongU?: string;
  WedthU?: string;
  HightU?: string;
  Lesan?: string;
  MontagNum?: string;
  Cut_num?: 'لأول مرة' | 'موجود';
  final_size_tall?: string;
  final_size_tall2?: string;
  final_size_width?: string;
  final_size_width2?: string;
  print_on?: string;
  print_on2?: string;
  sheet_unit_qunt?: string;
  sheet_unit_qunt2?: string;
  Qunt_of_print_on?: string;
  Qunt_of_print_on2?: string;
  Clr_qunt?: string;
  Med_Sample?: string;
  grnd_qunt?: string;
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
  _row_id: string;
}

// Table row types
export type TableRow = Record<string, string>;

