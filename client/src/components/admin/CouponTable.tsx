import { AdminCoupon } from '../../lib/admin/coupons';

type Props = {
  coupons: AdminCoupon[];
  busyId: string | null;
  onEdit: (coupon: AdminCoupon) => void;
  onDelete: (coupon: AdminCoupon) => void;
  onToggle: (coupon: AdminCoupon) => void;
  onDuplicate: (coupon: AdminCoupon) => void;
};

const STATUS_LABEL: Record<AdminCoupon['status'], string> = {
  active: 'Active',
  expired: 'Expired',
  disabled: 'Disabled',
  exhausted: 'Exhausted',
  scheduled: 'Scheduled',
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CouponTable({ coupons, busyId, onEdit, onDelete, onToggle, onDuplicate }: Props) {
  if (!coupons.length) {
    return (
      <div className="card admin-empty-state">
        <span className="material-symbols-outlined text-4xl">sell</span>
        <p>No coupons match these filters yet.</p>
      </div>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Discount</th>
            <th>Min. Order</th>
            <th>Max Discount</th>
            <th>Usage</th>
            <th>Expiry</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c.id} className={busyId === c.id ? 'busy' : ''}>
              <td>
                <div className="admin-table-name">{c.code}</div>
              </td>
              <td>{c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue.toLocaleString('en-IN')}`}</td>
              <td>{c.minOrderAmount > 0 ? `₹${c.minOrderAmount.toLocaleString('en-IN')}` : '—'}</td>
              <td>{c.discountType === 'percentage' && c.maxDiscount != null ? `₹${c.maxDiscount.toLocaleString('en-IN')}` : '—'}</td>
              <td>
                {c.usedCount}
                {c.usageLimit != null ? ` / ${c.usageLimit}` : ''}
              </td>
              <td>{fmtDate(c.expiryDate)}</td>
              <td>
                <span className={`status-badge status-${c.status}`}>{STATUS_LABEL[c.status]}</span>
              </td>
              <td>
                <div className="admin-row-actions">
                  <button title="Edit" onClick={() => onEdit(c)}>
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                  <button title={c.isActive ? 'Disable' : 'Enable'} onClick={() => onToggle(c)} disabled={busyId === c.id}>
                    <span className="material-symbols-outlined text-base">{c.isActive ? 'toggle_on' : 'toggle_off'}</span>
                  </button>
                  <button title="Duplicate" onClick={() => onDuplicate(c)} disabled={busyId === c.id}>
                    <span className="material-symbols-outlined text-base">content_copy</span>
                  </button>
                  <button title="Delete" className="danger" onClick={() => onDelete(c)} disabled={busyId === c.id}>
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
