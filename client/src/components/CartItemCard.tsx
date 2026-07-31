import { useState } from 'react';
import { CartItem } from '../lib/cart';
import { diffDays, fmtDateDisplay, fmtRs, rentalPrice, tierForDays } from '../lib/cartMath';
import QtyStepper from './QtyStepper';
import DateRangePicker from './DateRangePicker';

type CartItemCardProps = {
  entry: CartItem;
  removing: boolean;
  datesOpen: boolean;
  sizeOpen: boolean;
  onRemove: () => void;
  onQtyChange: (qty: number) => void;
  onToggleDates: () => void;
  onToggleSize: () => void;
  onSetSize: (size: string) => void;
  onDatesChange: (from: string, to: string) => void;
};

export default function CartItemCard({
  entry,
  removing,
  datesOpen,
  sizeOpen,
  onRemove,
  onQtyChange,
  onToggleDates,
  onToggleSize,
  onSetSize,
  onDatesChange,
}: CartItemCardProps) {
  const days = diffDays(entry.from, entry.to);
  const tier = tierForDays(days);
  const lineTotal = rentalPrice(entry.price, days) * entry.qty;
  const sizes = entry.sizes && entry.sizes.length ? entry.sizes : [entry.size];
  const fromDisp = fmtDateDisplay(entry.from);
  const toDisp = fmtDateDisplay(entry.to);
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`card cart-item ${removing ? 'removing' : ''}`}>
      <button className="remove-btn" onClick={onRemove} aria-label={`Remove ${entry.name} from cart`}>
        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
          delete_outline
        </span>
      </button>
      <div className="cart-item-img">
        {entry.image && !imgError ? (
          <img src={entry.image} alt={entry.name} onError={() => setImgError(true)} />
        ) : (
          <div className="img-ph">
            <span className="material-symbols-outlined" style={{ fontSize: '2.2rem', color: 'rgba(201,163,107,0.3)' }}>
              checkroom
            </span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex flex-col">
        <span className="text-[0.65rem] font-bold uppercase tracking-widest" style={{ color: 'rgba(201,163,107,0.65)' }}>
          {entry.brand || "Saha's Wardrobe"}
        </span>
        <h3 className="font-['Playfair_Display'] text-xl md:text-2xl mt-0.5 mb-2 pr-8" style={{ color: '#efe0cd' }}>
          {entry.name}
        </h3>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-1">
          <div>
            <span className="field-label" style={{ marginBottom: 2 }}>
              Size
            </span>
            <span className="text-sm font-semibold" style={{ color: '#efe0cd' }}>
              {entry.size}
            </span>
            <button className="edit-link ml-2" onClick={onToggleSize}>
              <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>
                swap_horiz
              </span>
              {sizeOpen ? 'Close' : 'Change'}
            </button>
          </div>
          <div>
            <span className="field-label" style={{ marginBottom: 2 }}>
              Base Rental Price
            </span>
            <span className="text-sm font-semibold" style={{ color: '#fdd397' }}>
              {fmtRs(entry.price)}
            </span>
          </div>
          <div>
            <span className="field-label" style={{ marginBottom: 2 }}>
              Quantity
            </span>
            <QtyStepper qty={entry.qty} onChange={onQtyChange} />
          </div>
        </div>

        {sizeOpen && (
          <div className="flex flex-wrap gap-2 mt-2 mb-1">
            {sizes.map((s) => (
              <button key={s} className={`sz-chip avail ${s === entry.size ? 'selected' : ''}`} onClick={() => onSetSize(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2">
          <div>
            <span className="field-label" style={{ marginBottom: 2 }}>
              Rental Start
            </span>
            <span className="text-sm font-medium" style={{ color: '#efe0cd' }}>
              {fromDisp || '—'}
            </span>
          </div>
          <div>
            <span className="field-label" style={{ marginBottom: 2 }}>
              Rental End
            </span>
            <span className="text-sm font-medium" style={{ color: '#efe0cd' }}>
              {toDisp || '—'}
            </span>
          </div>
          <div>
            <span className="field-label" style={{ marginBottom: 2 }}>
              Duration
            </span>
            <span className="text-sm font-medium" style={{ color: '#efe0cd' }}>
              {entry.from && entry.to ? `${days} day${days > 1 ? 's' : ''}` : '—'}
            </span>
          </div>
          <button className="edit-link" onClick={onToggleDates}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>
              edit_calendar
            </span>
            {entry.from && entry.to ? (datesOpen ? 'Close' : 'Edit dates') : datesOpen ? 'Close' : 'Select dates'}
          </button>
        </div>

        <div className={`cart-cal-wrap ${datesOpen ? 'show' : ''}`}>
          <div className="card">{datesOpen && <DateRangePicker from={entry.from} to={entry.to} onChange={onDatesChange} />}</div>
        </div>

        <div className="flex-1" />
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed rgba(201,163,107,0.2)' }}>
          <div className="flex justify-between items-baseline">
            <span className="text-xs" style={{ color: 'rgba(239,224,205,0.5)' }}>
              Rental Price · {entry.qty} × {tier.label} ({days} day{days > 1 ? 's' : ''})
            </span>
            <span className="font-bold text-lg font-['Playfair_Display']" style={{ color: '#fdd397' }}>
              {fmtRs(lineTotal)}
            </span>
          </div>
          <div className="flex justify-between items-baseline mt-1">
            <span className="text-xs" style={{ color: 'rgba(239,224,205,0.5)' }}>
              Security Deposit <span style={{ color: 'rgba(239,224,205,0.35)' }}>(refundable)</span>
            </span>
            <span className="text-sm font-semibold" style={{ color: '#efe0cd' }}>
              {fmtRs(entry.securityDeposit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
