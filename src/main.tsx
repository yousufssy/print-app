import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: { fontFamily: 'Cairo, sans-serif', fontSize: '13px', direction: 'rtl' },
          success: { style: { background: '#1e8449', color: '#fff' } },
          error:   { style: { background: '#c0392b', color: '#fff' } },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
