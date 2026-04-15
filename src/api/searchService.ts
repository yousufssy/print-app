// 📁 src/api/searchService.ts
import client from './client';

export const advancedSearchApi = {
  search: (filters: Record<string, any>) => {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => 
        v !== undefined && v !== '' && v !== null && v !== 'all'
      )
    );
    return client.post('/orders/search', cleanFilters).then(r => r.data);
  },
  
  export: (filters: Record<string, any>, format: 'csv' | 'excel' | 'pdf' = 'csv') => {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => 
        v !== undefined && v !== '' && v !== null
      )
    );
    return client.post('/orders/search/export', { ...cleanFilters, format }, { 
      responseType: 'blob' 
    }).then(r => r.data);
  },
};
