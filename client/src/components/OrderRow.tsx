import { DepositStatus, Order } from '../lib/orders';
import { fmtDateDisplay, fmtRs } from '../lib/cartMath';

const STATUS_LABEL: Record<Order['status'], string> = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const DEPOSIT_STATUS_LABEL: Record<DepositStatus, string> = {
  pending: 'Deposit Pending',
  refunded: 'Deposit Refunded',
  forfeited: 'Deposit Forfeited',
  partially_refunded: 'Deposit Partially Refunded',
};

// Customer-facing copy only — the admin's internal reason (depositNote)
// never reaches this component; the server strips it from this endpoint.
const DEPOSIT_MESSAGE: Record<DepositStatus, string> = {
  pending: 'Your security deposit will be processed after the return inspection.',
  refunded: 'Your refundable security deposit has been returned.',
  forfeited: 'Your security deposit has been retained. Please contact support if you have questions.',
  partially_refunded: 'Part of your security deposit has been refunded after the return inspection.',
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
          <div className="flex gap-1.5 flex-shrink-0">
            <span className={`status-badge status-${order.status}`}>{STATUS_LABEL[order.status]}</span>
            <span className={`status-badge deposit-status-${order.depositStatus}`}>{DEPOSIT_STATUS_LABEL[order.depositStatus]}</span>
          </div>
        </div>
        <p className="text-xs mb-1" style={{ color: 'rgba(239,224,205,0.55)' }}>
          Size: {order.size} &nbsp;·&nbsp; {order.days} day{order.days > 1 ? 's' : ''}
        </p>
        <p className="text-xs mb-2" style={{ color: 'rgba(239,224,205,0.45)' }}>
          {fmtDateDisplay(order.from)} → {fmtDateDisplay(order.to)}
        </p>

        <div className="flex flex-wrap gap-x-5 gap-y-1 mb-2">
          <div>
            <span className="text-[0.62rem] uppercase tracking-widest block" style={{ color: 'rgba(239,224,205,0.4)' }}>
              Rental Fee
            </span>
            <span className="font-bold text-sm" style={{ color: '#C9A36B' }}>
              {fmtRs(order.rentalTotal)}
            </span>
          </div>
          <div>
            <span className="text-[0.62rem] uppercase tracking-widest block" style={{ color: 'rgba(239,224,205,0.4)' }}>
              Security Deposit
            </span>
            <span className="font-bold text-sm" style={{ color: '#efe0cd' }}>
              {fmtRs(order.securityDeposit)}
            </span>
          </div>
        </div>

        <p className="text-xs mb-2" style={{ color: 'rgba(239,224,205,0.55)', fontStyle: 'italic' }}>
          {DEPOSIT_MESSAGE[order.depositStatus]}
        </p>

        <p className="font-bold text-sm" style={{ color: '#fdd397' }}>
          Total Paid: {fmtRs(order.total)}
        </p>
      </div>
    </div>
  );
}
