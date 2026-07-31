import { useEffect, useState } from 'react';
import { AdminOrder, DepositStatus, OrderListParams, OrderStatus, fetchAdminOrders, updateOrderStatus } from '../../lib/admin/orders';
import OrderTable from '../../components/admin/OrderTable';
import DepositModal from '../../components/admin/DepositModal';
import { useToast } from '../../components/admin/ToastProvider';

export default function OrdersPage() {
  const { showSuccess, showError } = useToast();
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [depositOrder, setDepositOrder] = useState<AdminOrder | null>(null);

  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [depositStatus, setDepositStatus] = useState<DepositStatus | ''>('');

  function load() {
    const params: OrderListParams = { status: status || undefined, depositStatus: depositStatus || undefined, limit: 50 };
    fetchAdminOrders(params)
      .then((data) => {
        setOrders(data.orders);
        setTotal(data.total);
      })
      .catch((err) => showError(err instanceof Error ? err.message : 'Could not load orders.'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, depositStatus]);

  async function handleStatusChange(order: AdminOrder, next: OrderStatus) {
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, next);
      showSuccess('Order status updated.');
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not update the order.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Orders</h1>
      </div>

      <div className="admin-filter-bar card">
        <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | '')}>
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="field-input" value={depositStatus} onChange={(e) => setDepositStatus(e.target.value as DepositStatus | '')}>
          <option value="">All deposit statuses</option>
          <option value="pending">Deposit Pending</option>
          <option value="refunded">Deposit Refunded</option>
          <option value="partially_refunded">Deposit Partially Refunded</option>
          <option value="forfeited">Deposit Forfeited</option>
        </select>
      </div>

      {orders === null ? (
        <div className="admin-loading">
          <span className="spinner" /> Loading orders…
        </div>
      ) : (
        <>
          <p className="admin-result-count">{total} order{total === 1 ? '' : 's'}</p>
          <OrderTable orders={orders} busyId={busyId} onStatusChange={handleStatusChange} onManageDeposit={setDepositOrder} />
        </>
      )}

      {depositOrder && <DepositModal order={depositOrder} onClose={() => setDepositOrder(null)} onSaved={load} />}
    </div>
  );
}
