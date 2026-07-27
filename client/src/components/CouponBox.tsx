import { useState } from 'react';
import { fmtRs } from '../lib/cartMath';

type CouponBoxProps = {
  couponCode: string;
  discount: number;
  onApply: (code: string) => Promise<void> | void;
  onRemove: () => Promise<void> | void;
  error: string;
};

// "Applied" is just "the server told us a code is set on this cart" —
// there's no local coupon table to consult; the discount amount shown is
// whatever the backend actually computed (totals.discount).
export default function CouponBox({ couponCode, discount, onApply, onRemove, error }: CouponBoxProps) {
  const [input, setInput] = useState('');
  const applied = Boolean(couponCode);

  return (
    <div>
      <label className="field-label">Coupon Code</label>
      <div className="coupon-row">
        <input
          type="text"
          className="field-input"
          placeholder="Try SAHA10 or WELCOME200"
          value={applied ? couponCode : input}
          disabled={applied}
          maxLength={20}
          style={{ textTransform: 'uppercase' }}
          onChange={(e) => setInput(e.target.value)}
        />
        {applied ? (
          <button className="coupon-btn" onClick={() => onRemove()}>
            Remove
          </button>
        ) : (
          <button className="coupon-btn" onClick={() => onApply(input.trim().toUpperCase())}>
            Apply
          </button>
        )}
      </div>
      {applied && (
        <p className="coupon-msg ok">
          "{couponCode}" applied — you saved {fmtRs(discount)}.
        </p>
      )}
      {!applied && error && <p className="coupon-msg err">{error}</p>}
    </div>
  );
}
