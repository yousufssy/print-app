import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout';
import DashboardPage from './pages/Dashboard';
import OrdersPage from './pages/Orders';
import OrderFormPage from './pages/OrderForm';
import UsersPage from './pages/Users';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/new" element={<OrderFormPage />} />
          <Route path="orders/:id/:year" element={<OrderFormPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
