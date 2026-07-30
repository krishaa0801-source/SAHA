import { useEffect, useState } from 'react';
import {
  AdminCoupon,
  CouponListParams,
  deleteCoupon,
  duplicateCoupon,
  fetchAdminCoupons,
  toggleCoupon,
} from '../../lib/admin/coupons';
import { fetchAdminProducts } from '../../lib/admin/products';
import { fetchCategories } from '../../lib/admin/categories';
import CouponTable from '../../components/admin/CouponTable';
import CouponFormModal from '../../components/admin/CouponFormModal';
import { useToast } from '../../components/admin/ToastProvider';

export default function CouponsPage() {
  const { showSuccess, showError } = useToast();
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[] | null>(null);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalCoupon, setModalCoupon] = useState<AdminCoupon | null | undefined>(undefined);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<CouponListParams['status']>('');
  const [discountType, setDiscountType] = useState<CouponListParams['discountType']>('');
  const [sort, setSort] = useState<NonNullable<CouponListParams['sort']>>('newest');

  useEffect(() => {
    fetchAdminProducts({ limit: 100 })
      .catch(() => null)
      .then((data) => setProducts((data?.products || []).map((p) => ({ id: p.id, name: p.name }))));
    fetchCategories()
      .catch(() => [])
      .then((cats) => setCategories((cats || []).map((c) => ({ slug: c.slug, name: c.name }))));
  }, []);

  function load() {
    fetchAdminCoupons({ q, status: status || undefined, discountType: discountType || undefined, sort, limit: 50 })
      .then((data) => {
        setCoupons(data.coupons);
        setTotal(data.total);
      })
      .catch((err) => showError(err instanceof Error ? err.message : 'Could not load coupons.'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, discountType, sort]);

  async function handleDelete(coupon: AdminCoupon) {
    if (!window.confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    setBusyId(coupon.id);
    try {
      await deleteCoupon(coupon.id);
      showSuccess('Coupon deleted.');
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not delete the coupon.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggle(coupon: AdminCoupon) {
    setBusyId(coupon.id);
    try {
      const updated = await toggleCoupon(coupon.id);
      showSuccess(updated.isActive ? 'Coupon enabled.' : 'Coupon disabled.');
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not update the coupon.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(coupon: AdminCoupon) {
    setBusyId(coupon.id);
    try {
      const copy = await duplicateCoupon(coupon.id);
      showSuccess(`Coupon duplicated as "${copy.code}".`);
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not duplicate the coupon.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Coupons</h1>
        <button className="admin-btn-primary" onClick={() => setModalCoupon(null)}>
          <span className="material-symbols-outlined text-base">add</span>
          Create Coupon
        </button>
      </div>

      <div className="admin-filter-bar card">
        <input className="field-input" placeholder="Search by code…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value as CouponListParams['status'])}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="expired">Expired</option>
          <option value="exhausted">Exhausted</option>
          <option value="disabled">Disabled</option>
        </select>
        <select className="field-input" value={discountType} onChange={(e) => setDiscountType(e.target.value as CouponListParams['discountType'])}>
          <option value="">All discount types</option>
          <option value="percentage">Percentage</option>
          <option value="flat">Flat Amount</option>
        </select>
        <select className="field-input" value={sort} onChange={(e) => setSort(e.target.value as NonNullable<CouponListParams['sort']>)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="expiry">Expiry date</option>
        </select>
      </div>

      {coupons === null ? (
        <div className="admin-loading">
          <span className="spinner" /> Loading coupons…
        </div>
      ) : (
        <>
          <p className="admin-result-count">{total} coupon{total === 1 ? '' : 's'}</p>
          <CouponTable coupons={coupons} busyId={busyId} onEdit={setModalCoupon} onDelete={handleDelete} onToggle={handleToggle} onDuplicate={handleDuplicate} />
        </>
      )}

      {modalCoupon !== undefined && (
        <CouponFormModal coupon={modalCoupon} products={products} categories={categories} onClose={() => setModalCoupon(undefined)} onSaved={load} />
      )}
    </div>
  );
}
