import { Order } from '../lib/orders';
import { fmtDateDisplay, fmtRs } from '../lib/cartMath';

const STATUS_LABEL: Record<Order['status'], string> = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function OrderRow({ order }: { order: Order }) {
  return (
    <div className="order-row">
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(201,163,107,0.1)', border: '1px solid rgba(201,163,107,0.2)' }}
      >
        <span className="material-symbols-outlined" style={{ color: '#C9A36B', fontSize: '1.4rem' }}>
          checkroom
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
          <h3 className="font-['Playfair_Display'] text-lg leading-tight" style={{ color: '#efe0cd' }}>
            {order.name}
          </h3>
          <span className={`status-badge status-${order.status} flex-shrink-0`}>{STATUS_LABEL[order.status]}</span>
        </div>
        <p className="text-xs mb-1" style={{ color: 'rgba(239,224,205,0.55)' }}>
          Size: {order.size} &nbsp;·&nbsp; {order.days} day{order.days > 1 ? 's' : ''}
        </p>
        <p className="text-xs mb-2" style={{ color: 'rgba(239,224,205,0.45)' }}>
          {fmtDateDisplay(order.from)} → {fmtDateDisplay(order.to)}
        </p>
        <p className="font-bold text-sm" style={{ color: '#C9A36B' }}>
          {fmtRs(order.total)}
        </p>
      </div>
    </div>
  );
}
