import { CartTotals } from '../lib/cart';
import { fmtRs } from '../lib/cartMath';
import CouponBox from './CouponBox';

type CartSummaryProps = {
  totals: CartTotals;
  couponCode: string;
  couponError: string;
  onApplyCoupon: (code: string) => Promise<void> | void;
  onRemoveCoupon: () => Promise<void> | void;
  onCheckout: () => void;
  checkoutDisabled: boolean;
};

export default function CartSummary({ totals: t, couponCode, couponError, onApplyCoupon, onRemoveCoupon, onCheckout, checkoutDisabled }: CartSummaryProps) {
  return (
    <div className="glass-card px-7 py-7 sm:px-8 sm:py-7 lg:px-9 lg:py-8 lg:sticky lg:top-[86px]">
      <h3 className="font-['Playfair_Display'] text-lg mb-6" style={{ color: '#efe0cd' }}>
        Order Summary
      </h3>

      <div className="summary-row">
        <span className="k">Subtotal</span>
        <span className="v">{fmtRs(t.subtotal)}</span>
      </div>
      <div className="summary-row">
        <span className="k">Rental Charges</span>
        <span className="v">{fmtRs(t.rentalCharges)}</span>
      </div>
      <div className="summary-row">
        <span className="k">
          Security Deposit <span style={{ color: 'rgba(239,224,205,0.4)', fontSize: '0.68rem' }}>(refundable)</span>
        </span>
        <span className="v">{fmtRs(t.securityDeposit)}</span>
      </div>
      <div className="summary-row">
        <span className="k">Delivery Charge</span>
        <span className="v">{fmtRs(t.deliveryCharge)}</span>
      </div>
      <div className="summary-row discount">
        <span className="k">Discount</span>
        <span className="v">{t.discount ? `−${fmtRs(t.discount)}` : '—'}</span>
      </div>
      <div className="summary-row">
        <span className="k">Taxes</span>
        <span className="v">{t.tax ? fmtRs(t.tax) : '—'}</span>
      </div>

      <hr className="divider order-summary-divider" />
      <CouponBox couponCode={couponCode} discount={t.discount} onApply={onApplyCoupon} onRemove={onRemoveCoupon} error={couponError} />
      <hr className="divider order-summary-divider" />

      <div className="summary-row total">
        <span className="k">Estimated Total</span>
        <span className="v">{fmtRs(t.total)}</span>
      </div>
      <button className="checkout-btn" onClick={onCheckout} disabled={checkoutDisabled}>
        <span className="material-symbols-outlined text-base">lock</span>Proceed to Checkout
      </button>
    </div>
  );
}
