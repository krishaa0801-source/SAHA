import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applyCoupon, CartState, fetchCart, removeCartItem, removeCoupon, updateCartItem } from '../lib/cart';
import { fmtRs } from '../lib/cartMath';
import { createRazorpayOrder, getRazorpayKey, verifyPayment } from '../lib/payments';
import CartItemCard from '../components/CartItemCard';
import CartSummary from '../components/CartSummary';
import MobileMenu from '../components/MobileMenu';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartState | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [openDatesFor, setOpenDatesFor] = useState<string | null>(null);
  const [openSizeFor, setOpenSizeFor] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCart()
      .then((state) => {
        if (cancelled) return;
        setCart(state);
        setCouponCode(state.coupon);
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  function handleRemove(cartId: string) {
    setRemovingId(cartId);
    setTimeout(async () => {
      const state = await removeCartItem(cartId);
      setCart(state);
      setCouponCode(state.coupon);
      setRemovingId(null);
    }, 340);
  }

  async function handleQtyChange(cartId: string, qty: number) {
    setCart(await updateCartItem(cartId, { qty }));
  }

  async function handleSetSize(cartId: string, size: string) {
    setCart(await updateCartItem(cartId, { size }));
    setOpenSizeFor(null);
  }

  async function handleDatesChange(cartId: string, from: string, to: string) {
    setCart(await updateCartItem(cartId, { from, to }));
  }

  async function handleApplyCoupon(code: string) {
    try {
      const state = await applyCoupon(code);
      setCart(state);
      setCouponCode(state.coupon);
      setCouponError('');
    } catch (err: any) {
      setCouponError(err?.message || "That code isn't valid or has expired.");
    }
  }

  async function handleRemoveCoupon() {
    const state = await removeCoupon();
    setCart(state);
    setCouponCode(state.coupon);
    setCouponError('');
  }

  async function handleCheckout() {
    if (!cart || !cart.items.length) return;
    const incomplete = cart.items.find((it) => !it.size || !it.from || !it.to);
    if (incomplete) {
      alert('Please choose a size and rental dates for every piece before checking out.');
      return;
    }

    setCheckingOut(true);

    try {
      // Amount/order come entirely from the server — it re-prices the
      // signed-in user's cart from MongoDB, nothing is sent from here.
      const [key_id, order] = await Promise.all([getRazorpayKey(), createRazorpayOrder()]);

      const rzp = new window.Razorpay({
        key: key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: "Saha's Wardrobe",
        description: `${cart.items.length} piece${cart.items.length > 1 ? 's' : ''} — rental payment`,
        theme: { color: '#C9A36B' },
        handler: async (response: any) => {
          await finalizeCheckout(response);
        },
        modal: {
          ondismiss: () => {
            alert('Payment cancelled. Your cart has been kept — you can try again.');
            setCheckingOut(false);
          },
        },
      });

      rzp.on('payment.failed', (response: any) => {
        alert('Payment failed: ' + (response?.error?.description || 'please try again.'));
        setCheckingOut(false);
      });

      rzp.open();
    } catch (err: any) {
      if (err?.status === 401) {
        navigate('/login');
        return;
      }
      alert(err?.message || 'Something went wrong starting payment. Please try again.');
      setCheckingOut(false);
    }
  }

  async function finalizeCheckout(response: any) {
    try {
      const result = await verifyPayment({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      if (!result.success) {
        alert('Payment verification failed. If money was deducted, it will be refunded automatically.');
        return;
      }
      // The server already created the rental order(s) and cleared the
      // cart as part of verifying payment — hand them off via router
      // state so the confirmation page can show exactly what was booked
      // without a second round trip.
      navigate('/order-confirmed', { state: { orders: result.orders } });
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div style={{ background: '#3D1A38', color: '#efe0cd', minHeight: '100vh' }}>
      <header
        className="fixed top-0 left-0 right-0 z-[60] backdrop-blur-md border-b flex items-center justify-between w-full px-6 md:px-12 py-3"
        style={{ background: 'rgba(61,26,56,0.95)', borderColor: 'rgba(201,163,107,0.2)' }}
      >
        <a href="/vault.html" className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-widest transition-colors" style={{ color: '#C9A36B' }}>
          <span className="material-symbols-outlined text-base">arrow_back</span>Back to Vault
        </a>
        <a href="/index.html" className="font-['Playfair_Display'] text-xl tracking-wide" style={{ color: '#C9A36B' }}>
          Saha's
        </a>
        <a href="/account.html" className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest transition-colors" style={{ color: 'rgba(239,224,205,0.6)' }}>
          <span className="material-symbols-outlined text-base">person</span>
        </a>
        {/* Mobile-only nav — same hamburger/dropdown as every other page.
            Desktop keeps this page's own distinct 3-link checkout header. */}
        <div className="lg:hidden">
          <MobileMenu />
        </div>
      </header>

      <main className="pt-[68px] pb-28 lg:pb-16">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
          {cart === null ? null : !cart.items.length ? (
            <EmptyCart />
          ) : (
            <>
              <div className="mb-7">
                <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl" style={{ color: '#C9A36B' }}>
                  Your Rental Bag
                </h1>
                <p className="text-xs mt-1" style={{ color: 'rgba(239,224,205,0.5)' }}>
                  {cart.items.length} piece{cart.items.length > 1 ? 's' : ''} selected
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 md:gap-8 items-start">
                <div className="flex flex-col gap-5">
                  {cart.items.map((entry) => (
                    <CartItemCard
                      key={entry.cartId}
                      entry={entry}
                      removing={removingId === entry.cartId}
                      datesOpen={openDatesFor === entry.cartId}
                      sizeOpen={openSizeFor === entry.cartId}
                      onRemove={() => handleRemove(entry.cartId)}
                      onQtyChange={(qty) => handleQtyChange(entry.cartId, qty)}
                      onToggleDates={() => {
                        setOpenDatesFor(openDatesFor === entry.cartId ? null : entry.cartId);
                        setOpenSizeFor(null);
                      }}
                      onToggleSize={() => {
                        setOpenSizeFor(openSizeFor === entry.cartId ? null : entry.cartId);
                        setOpenDatesFor(null);
                      }}
                      onSetSize={(size) => handleSetSize(entry.cartId, size)}
                      onDatesChange={(from, to) => handleDatesChange(entry.cartId, from, to)}
                    />
                  ))}
                </div>
                <div>
                  <CartSummary
                    totals={cart.totals}
                    couponCode={couponCode}
                    couponError={couponError}
                    onApplyCoupon={handleApplyCoupon}
                    onRemoveCoupon={handleRemoveCoupon}
                    onCheckout={handleCheckout}
                    checkoutDisabled={checkingOut}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {cart && cart.items.length > 0 && (
        <div className="mobile-checkout-bar lg:hidden">
          <div>
            <span className="mcb-label">Estimated Total</span>
            <span className="mcb-total">{fmtRs(cart.totals.total)}</span>
          </div>
          <button className="checkout-btn" onClick={handleCheckout} disabled={checkingOut}>
            Checkout
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center text-center py-20 px-6">
      <svg className="empty-illustration mb-8" width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g stroke="#C9A36B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85}>
          <path d="M90 34v-8a9 9 0 1 1 9 9" />
          <path d="M90 34 40 66h100z" />
        </g>
        <path d="M62 66 58 150q32 14 64 0l-4-84" stroke="#FDD397" strokeWidth={1.6} strokeDasharray="5 6" fill="none" opacity={0.7} />
        <circle cx="90" cy="150" r="3" fill="#FDD397" opacity={0.8} />
      </svg>
      <h2 className="font-['Playfair_Display'] text-3xl md:text-4xl mb-3" style={{ color: '#C9A36B' }}>
        Your wardrobe is waiting.
      </h2>
      <p className="text-sm mb-8 max-w-xs" style={{ color: 'rgba(239,224,205,0.65)' }}>
        You haven't added any rental pieces yet.
      </p>
      <a
        href="/vault.html"
        className="px-9 py-3.5 rounded-sm font-bold text-xs uppercase tracking-[0.15em] transition-all"
        style={{ background: '#C9A36B', color: '#453c2e' }}
      >
        Browse Collection
      </a>
    </div>
  );
}
