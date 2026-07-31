import { AdminOrder, OrderStatus } from '../../lib/admin/orders';

type Props = {
  orders: AdminOrder[];
  busyId: string | null;
  onStatusChange: (order: AdminOrder, status: OrderStatus) => void;
  onManageDeposit: (order: AdminOrder) => void;
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const DEPOSIT_STATUS_LABEL: Record<AdminOrder['depositStatus'], string> = {
  pending: 'Pending',
  refunded: 'Refunded',
  forfeited: 'Forfeited',
  partially_refunded: 'Partial',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OrderTable({ orders, busyId, onStatusChange, onManageDeposit }: Props) {
  if (!orders.length) {
    return (
      <div className="card admin-empty-state">
        <span className="material-symbols-outlined text-4xl">receipt_long</span>
        <p>No orders match these filters yet.</p>
      </div>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Customer</th>
            <th>Dates</th>
            <th>Rental Fee</th>
            <th>Security Deposit</th>
            <th>Total Paid</th>
            <th>Status</th>
            <th>Deposit</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className={busyId === o.id ? 'busy' : ''}>
              <td>
                <div className="admin-table-name">{o.name}</div>
                <div className="admin-table-brand">Size {o.size}</div>
              </td>
              <td>
                {o.user ? (
                  <>
                    <div className="admin-table-name">{o.user.name}</div>
                    <div className="admin-table-brand">{o.user.email}</div>
                  </>
                ) : (
                  '—'
                )}
              </td>
              <td>
                {fmtDate(o.from)} → {fmtDate(o.to)}
                <div className="admin-table-brand">{o.days} day{o.days > 1 ? 's' : ''}</div>
              </td>
              <td>₹{o.rentalTotal.toLocaleString('en-IN')}</td>
              <td>₹{o.securityDeposit.toLocaleString('en-IN')}</td>
              <td>₹{o.total.toLocaleString('en-IN')}</td>
              <td>
                <select
                  className="field-input"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  value={o.status}
                  disabled={busyId === o.id}
                  onChange={(e) => onStatusChange(o, e.target.value as OrderStatus)}
                >
                  <option value="confirmed">{STATUS_LABEL.confirmed}</option>
                  <option value="completed">{STATUS_LABEL.completed}</option>
                  <option value="cancelled">{STATUS_LABEL.cancelled}</option>
                </select>
              </td>
              <td>
                <span className={`status-badge deposit-status-${o.depositStatus}`}>{DEPOSIT_STATUS_LABEL[o.depositStatus]}</span>
              </td>
              <td>
                <div className="admin-row-actions">
                  <button
                    title={o.status === 'completed' ? 'Manage deposit' : 'Mark the order completed first'}
                    onClick={() => onManageDeposit(o)}
                    disabled={o.status !== 'completed' || busyId === o.id}
                  >
                    <span className="material-symbols-outlined text-base">savings</span>
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
