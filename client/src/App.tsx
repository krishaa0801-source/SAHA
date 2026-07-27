import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AccountPage from './pages/AccountPage';
import CartPage from './pages/CartPage';
import { fetchCurrentUser } from './lib/auth';
import AdminGuard from './components/admin/AdminGuard';
import AdminLayout from './components/admin/AdminLayout';
import ToastProvider from './components/admin/ToastProvider';
import DashboardPage from './pages/admin/DashboardPage';
import ProductsPage from './pages/admin/ProductsPage';
import ProductFormPage from './pages/admin/ProductFormPage';
import CategoriesPage from './pages/admin/CategoriesPage';

const AUTH_ONLY_PATHS = new Set(['/login', '/signup']);

export default function App() {
  const [checkedAuth, setCheckedAuth] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Only /login and /signup redirect an already-authenticated visitor
    // straight to their account — /account.html and /cart.html do their
    // own auth check (and redirect to /login when signed out).
    if (!AUTH_ONLY_PATHS.has(location.pathname)) {
      setCheckedAuth(true);
      return;
    }
    let cancelled = false;
    fetchCurrentUser().then((user) => {
      if (cancelled) return;
      if (user) {
        navigate('/account.html', { replace: true });
        return;
      }
      setCheckedAuth(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (!checkedAuth) return null;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/account.html" element={<AccountPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/cart.html" element={<CartPage />} />
      <Route
        path="/admin"
        element={
          <ToastProvider>
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          </ToastProvider>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id" element={<ProductFormPage />} />
        <Route path="categories" element={<CategoriesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
