// 📁 types/search.ts
export interface AdvancedSearchFilters {
  // 🔍 البحث النصي
  query?: string;
  
  // 📋 بيانات الطلب الأساسية
  orderId?: string;
  serialNumber?: string;
  customer?: string;
  reference?: string;
  
  // 📅 التواريخ
  year?: string;
  dateComeFrom?: string;
  dateComeTo?: string;
  deliveryDateFrom?: string;
  deliveryDateTo?: string;
  
  // 🎨 مواصفات المطبوعة
  pattern?: string;
  pattern2?: string;
  unitType?: string; // علبة، كرتون، بروشور...
  code?: string;
  
  // 📊 الكميات والأسعار
  demandMin?: number;
  demandMax?: number;
  priceMin?: number;
  priceMax?: number;
  
  // ✅ الحالات (boolean flags)
  isPrinted?: boolean;
  isBilled?: boolean;
  isDelivered?: boolean;
  hasVouchers?: boolean;
  hasProblems?: boolean;
  hasCartons?: boolean;
  
  // ⚙️ العمليات والمواد
  operationType?: string;
  machineName?: string;
  materialSupplier?: string;
  
  // 🔄 الترتيب والصفحة
  sortBy?: 'ID' | 'date_come' | 'Apoent_Delv_date' | 'Demand' | 'Price' | 'Customer';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AdvancedSearchResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: AdvancedSearchFilters;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: AdvancedSearchFilters;
  createdAt: string;
  createdBy: string;
}