import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AccountPage from './pages/AccountPage';
import CartPage from './pages/CartPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import { fetchCurrentUser } from './lib/auth';

// Most visitors never touch /admin — lazy-loading the whole section keeps
// it out of the bundle everyone else downloads for login/signup/account/cart.
const AdminGuard = lazy(() => import('./components/admin/AdminGuard'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const ToastProvider = lazy(() => import('./components/admin/ToastProvider'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const OrdersPage = lazy(() => import('./pages/admin/OrdersPage'));
const ProductsPage = lazy(() => import('./pages/admin/ProductsPage'));
const ProductFormPage = lazy(() => import('./pages/admin/ProductFormPage'));
const CategoriesPage = lazy(() => import('./pages/admin/CategoriesPage'));
const ReviewsPage = lazy(() => import('./pages/admin/ReviewsPage'));
const CouponsPage = lazy(() => import('./pages/admin/CouponsPage'));

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
      <Route path="/order-confirmed" element={<OrderConfirmationPage />} />
      <Route
        path="/admin"
        element={
          <Suspense fallback={null}>
            <ToastProvider>
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            </ToastProvider>
          </Suspense>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={null}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="products"
          element={
            <Suspense fallback={null}>
              <ProductsPage />
            </Suspense>
          }
        />
        <Route
          path="products/new"
          element={
            <Suspense fallback={null}>
              <ProductFormPage />
            </Suspense>
          }
        />
        <Route
          path="products/:id"
          element={
            <Suspense fallback={null}>
              <ProductFormPage />
            </Suspense>
          }
        />
        <Route
          path="orders"
          element={
            <Suspense fallback={null}>
              <OrdersPage />
            </Suspense>
          }
        />
        <Route
          path="categories"
          element={
            <Suspense fallback={null}>
              <CategoriesPage />
            </Suspense>
          }
        />
        <Route
          path="reviews"
          element={
            <Suspense fallback={null}>
              <ReviewsPage />
            </Suspense>
          }
        />
        <Route
          path="coupons"
          element={
            <Suspense fallback={null}>
              <CouponsPage />
            </Suspense>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
