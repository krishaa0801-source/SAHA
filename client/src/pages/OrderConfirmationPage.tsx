import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Order } from '../lib/orders';
import { fmtRs } from '../lib/cartMath';
import SuccessCheck from '../components/SuccessCheck';
import OrderRow from '../components/OrderRow';
import SiteHeader from '../components/SiteHeader';

type LocationState = { orders?: Order[] } | null;

// Reached only via CartPage's finalizeCheckout navigate('/order-confirmed',
// { state: { orders } }) right after a verified payment — the orders are
// handed off through router state (no extra round trip) rather than a URL
// param, since they're full documents. If this page is opened without that
// state (a refresh, or someone navigating here directly), there's nothing
// to show, so it redirects to the real source of truth instead of
// rendering a blank/broken confirmation.
export default function OrderConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const orders = (location.state as LocationState)?.orders;

  useEffect(() => {
    if (!orders || !orders.length) {
      navigate('/account.html', { replace: true });
    }
  }, [orders, navigate]);

  if (!orders || !orders.length) return null;

  const total = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div style={{ background: '#3D1A38', color: '#efe0cd', minHeight: '100vh' }}>
      <SiteHeader />

      <main className="pt-[88px] pb-16 px-4 md:px-8">
        <div className="max-w-xl mx-auto">
          <div className="card">
            <SuccessCheck label="Payment Successful!" />
            <p className="text-center text-sm -mt-2 mb-6" style={{ color: 'rgba(239,224,205,0.65)' }}>
              Your rental{orders.length > 1 ? 's are' : ' is'} confirmed. A summary is below — you can also find{' '}
              {orders.length > 1 ? 'them' : 'it'} anytime under My Rentals.
            </p>

            <div className="flex flex-col gap-4 mb-6">
              {orders.map((order) => (
                <OrderRow key={order._id} order={order} />
              ))}
            </div>

            <hr className="divider" />

            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-xs uppercase tracking-widest" style={{ color: 'rgba(239,224,205,0.6)' }}>
                Total Paid
              </span>
              <span className="font-['Playfair_Display'] text-2xl" style={{ color: '#fdd397' }}>
                {fmtRs(total)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/account.html"
                className="flex-1 text-center py-3 rounded-sm font-bold text-xs uppercase tracking-widest transition-all"
                style={{ background: '#C9A36B', color: '#453c2e' }}
              >
                View My Rentals
              </a>
              <a
                href="/vault.html"
                className="flex-1 text-center py-3 rounded-sm font-bold text-xs uppercase tracking-widest border transition-all"
                style={{ borderColor: 'rgba(201,163,107,0.3)', color: 'rgba(239,224,205,0.75)' }}
              >
                Continue Shopping
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
