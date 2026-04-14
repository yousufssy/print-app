import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './layouts/Layout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import OrdersPage from './pages/Orders';
import OrderFormPage from './pages/OrderForm';
import ProductionPage from './pages/Production';
import DeliveryPage from './pages/Delivery';
import UsersPage from './pages/Users';
import AdvancedSearchPage from './pages/AdvancedSearch'; // ✅ جديد

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuthStore();
  if (!isAdmin()) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
           <Route path="orders/search" element={<AdvancedSearch />}  
          <Route path="orders/new" element={<OrderFormPage />} />
          <Route path="orders/:id/:year" element={<OrderFormPage />} />
           <Route path="production" element={<ProductionPage />} />
          <Route path="delivery" element={<DeliveryPage />} />
          <Route path="users" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
