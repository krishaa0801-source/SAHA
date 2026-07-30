import { FormEvent, useState } from 'react';
import AdminModal from './AdminModal';
import { AdminApiError, AdminCoupon, CouponFormFields, createCoupon, updateCoupon } from '../../lib/admin/coupons';
import { useToast } from './ToastProvider';

type ProductOption = { id: string; name: string };
type CategoryOption = { slug: string; name: string };

type Props = {
  coupon: AdminCoupon | null;
  products: ProductOption[];
  categories: CategoryOption[];
  onClose: () => void;
  onSaved: () => void;
};

function emptyFields(): CouponFormFields {
  return {
    code: '',
    discountType: 'percentage',
    discountValue: 0,
    minOrderAmount: 0,
    maxDiscount: null,
    usageLimit: null,
    startDate: '',
    expiryDate: '',
    isActive: true,
    firstOrderOnly: false,
    singleUsePerCustomer: false,
    restrictedProducts: [],
    restrictedCategories: [],
  };
}

function fieldsFromCoupon(coupon: AdminCoupon): CouponFormFields {
  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minOrderAmount: coupon.minOrderAmount,
    maxDiscount: coupon.maxDiscount,
    usageLimit: coupon.usageLimit,
    startDate: coupon.startDate ? coupon.startDate.slice(0, 10) : '',
    expiryDate: coupon.expiryDate ? coupon.expiryDate.slice(0, 10) : '',
    isActive: coupon.isActive,
    firstOrderOnly: coupon.firstOrderOnly,
    singleUsePerCustomer: coupon.singleUsePerCustomer,
    restrictedProducts: coupon.restrictedProducts,
    restrictedCategories: coupon.restrictedCategories,
  };
}

export default function CouponFormModal({ coupon, products, categories, onClose, onSaved }: Props) {
  const isEdit = Boolean(coupon);
  const { showSuccess, showError } = useToast();
  const [fields, setFields] = useState<CouponFormFields>(coupon ? fieldsFromCoupon(coupon) : emptyFields());
  const [maxDiscountInput, setMaxDiscountInput] = useState(fields.maxDiscount != null ? String(fields.maxDiscount) : '');
  const [usageLimitInput, setUsageLimitInput] = useState(fields.usageLimit != null ? String(fields.usageLimit) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    const code = fields.code.trim();
    if (!code) next.code = 'Coupon code is required.';
    else if (!/^[A-Za-z0-9_-]+$/.test(code)) next.code = 'Use only letters, numbers, hyphens, and underscores.';
    if (!(fields.discountValue >= 0)) next.discountValue = 'Discount value must be 0 or greater.';
    else if (fields.discountType === 'percentage' && fields.discountValue > 100) next.discountValue = 'A percentage discount cannot exceed 100.';
    if (!(fields.minOrderAmount >= 0)) next.minOrderAmount = 'Minimum order amount must be 0 or greater.';
    if (fields.maxDiscount != null && fields.maxDiscount < 0) next.maxDiscount = 'Maximum discount must be 0 or greater.';
    if (fields.usageLimit != null && fields.usageLimit < 1) next.usageLimit = 'Usage limit must be at least 1.';
    if (fields.startDate && fields.expiryDate && new Date(fields.expiryDate) <= new Date(fields.startDate)) {
      next.expiryDate = 'Expiry date must be after the start date.';
    }
    return next;
  }

  function toggleRestriction(list: 'restrictedProducts' | 'restrictedCategories', value: string) {
    setFields((prev) => {
      const current = prev[list];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [list]: next };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      showError('Please fix the highlighted fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...fields, code: fields.code.trim().toUpperCase() };
      if (isEdit && coupon) {
        await updateCoupon(coupon.id, payload);
        showSuccess('Coupon updated.');
      } else {
        await createCoupon(payload);
        showSuccess('Coupon created.');
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof AdminApiError && err.fields) setErrors(err.fields);
      showError(err instanceof Error ? err.message : 'Could not save the coupon.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminModal title={isEdit ? 'Edit Coupon' : 'Create Coupon'} onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <div>
            <label className="field-label">Coupon Code</label>
            <input
              className={`field-input ${errors.code ? 'field-invalid' : ''}`}
              style={{ textTransform: 'uppercase' }}
              value={fields.code}
              onChange={(e) => setFields({ ...fields, code: e.target.value })}
            />
            {errors.code && <p className="field-error">{errors.code}</p>}
          </div>
          <div>
            <label className="field-label">Discount Type</label>
            <select
              className="field-input"
              value={fields.discountType}
              onChange={(e) => setFields({ ...fields, discountType: e.target.value as CouponFormFields['discountType'] })}
            >
              <option value="percentage">Percentage</option>
              <option value="flat">Flat Amount</option>
            </select>
          </div>
          <div>
            <label className="field-label">Discount Value {fields.discountType === 'percentage' ? '(%)' : '(₹)'}</label>
            <input
              type="number"
              min={0}
              max={fields.discountType === 'percentage' ? 100 : undefined}
              className={`field-input ${errors.discountValue ? 'field-invalid' : ''}`}
              value={fields.discountValue}
              onChange={(e) => setFields({ ...fields, discountValue: parseFloat(e.target.value) || 0 })}
            />
            {errors.discountValue && <p className="field-error">{errors.discountValue}</p>}
          </div>
          <div>
            <label className="field-label">Minimum Order Amount (₹)</label>
            <input
              type="number"
              min={0}
              className={`field-input ${errors.minOrderAmount ? 'field-invalid' : ''}`}
              value={fields.minOrderAmount}
              onChange={(e) => setFields({ ...fields, minOrderAmount: parseFloat(e.target.value) || 0 })}
            />
            {errors.minOrderAmount && <p className="field-error">{errors.minOrderAmount}</p>}
          </div>
          {fields.discountType === 'percentage' && (
            <div>
              <label className="field-label">Maximum Discount (₹, optional)</label>
              <input
                type="number"
                min={0}
                className={`field-input ${errors.maxDiscount ? 'field-invalid' : ''}`}
                value={maxDiscountInput}
                onChange={(e) => {
                  setMaxDiscountInput(e.target.value);
                  setFields({ ...fields, maxDiscount: e.target.value ? parseFloat(e.target.value) : null });
                }}
              />
              {errors.maxDiscount && <p className="field-error">{errors.maxDiscount}</p>}
            </div>
          )}
          <div>
            <label className="field-label">Usage Limit (optional)</label>
            <input
              type="number"
              min={1}
              className={`field-input ${errors.usageLimit ? 'field-invalid' : ''}`}
              value={usageLimitInput}
              placeholder="Unlimited"
              onChange={(e) => {
                setUsageLimitInput(e.target.value);
                setFields({ ...fields, usageLimit: e.target.value ? parseInt(e.target.value, 10) : null });
              }}
            />
            {errors.usageLimit && <p className="field-error">{errors.usageLimit}</p>}
          </div>
          <div>
            <label className="field-label">Start Date (optional)</label>
            <input type="date" className="field-input" value={fields.startDate} onChange={(e) => setFields({ ...fields, startDate: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Expiry Date (optional)</label>
            <input
              type="date"
              className={`field-input ${errors.expiryDate ? 'field-invalid' : ''}`}
              value={fields.expiryDate}
              onChange={(e) => setFields({ ...fields, expiryDate: e.target.value })}
            />
            {errors.expiryDate && <p className="field-error">{errors.expiryDate}</p>}
          </div>
        </div>

        <div className="admin-checkbox-row">
          <label>
            <input type="checkbox" checked={fields.isActive} onChange={(e) => setFields({ ...fields, isActive: e.target.checked })} />
            Active
          </label>
          <label>
            <input type="checkbox" checked={fields.firstOrderOnly} onChange={(e) => setFields({ ...fields, firstOrderOnly: e.target.checked })} />
            First Order Only
          </label>
          <label>
            <input
              type="checkbox"
              checked={fields.singleUsePerCustomer}
              onChange={(e) => setFields({ ...fields, singleUsePerCustomer: e.target.checked })}
            />
            Single Use Per Customer
          </label>
        </div>

        {categories.length > 0 && (
          <div className="mt-4">
            <label className="field-label">Restrict to Categories (optional — leave empty for no restriction)</label>
            <div className="admin-restriction-list">
              {categories.map((c) => (
                <label key={c.slug} className="admin-restriction-item">
                  <input
                    type="checkbox"
                    checked={fields.restrictedCategories.includes(c.slug)}
                    onChange={() => toggleRestriction('restrictedCategories', c.slug)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {products.length > 0 && (
          <div className="mt-4">
            <label className="field-label">Restrict to Products (optional — leave empty for no restriction)</label>
            <div className="admin-restriction-list">
              {products.map((p) => (
                <label key={p.id} className="admin-restriction-item">
                  <input
                    type="checkbox"
                    checked={fields.restrictedProducts.includes(p.id)}
                    onChange={() => toggleRestriction('restrictedProducts', p.id)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="admin-form-actions">
          <button type="button" className="admin-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="admin-btn-primary" disabled={submitting}>
            {submitting && <span className="spinner" />}
            {isEdit ? 'Save Changes' : 'Create Coupon'}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
