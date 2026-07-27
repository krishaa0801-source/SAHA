import { SizeRow } from '../../lib/admin/products';

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

type Props = {
  value: SizeRow[];
  onChange: (rows: SizeRow[]) => void;
  error?: string;
};

// One row per size: a checkbox to offer that size at all, and a stock
// quantity that's shown in the admin table / product sidebar. Quantity is
// display-only — see server/models/Product.js — a size with quantity 0
// simply isn't offered (server/services/pricing.js excludes it).
export default function SizeQuantityEditor({ value, onChange, error }: Props) {
  const bySize = new Map(value.map((row) => [row.size, row.quantity]));

  function toggle(size: string, checked: boolean) {
    if (checked) {
      onChange([...value, { size, quantity: 1 }]);
    } else {
      onChange(value.filter((row) => row.size !== size));
    }
  }

  function setQuantity(size: string, quantity: number) {
    onChange(value.map((row) => (row.size === size ? { ...row, quantity: Math.max(0, quantity) } : row)));
  }

  return (
    <div>
      <span className="field-label">Sizes &amp; Stock Quantity</span>
      <div className="admin-size-grid">
        {ALL_SIZES.map((size) => {
          const checked = bySize.has(size);
          return (
            <div key={size} className={`admin-size-row ${checked ? 'checked' : ''}`}>
              <label className="admin-size-checkbox">
                <input type="checkbox" checked={checked} onChange={(e) => toggle(size, e.target.checked)} />
                {size}
              </label>
              <input
                type="number"
                min={0}
                step={1}
                className="admin-size-qty"
                placeholder="Qty"
                disabled={!checked}
                value={checked ? bySize.get(size) : ''}
                onChange={(e) => setQuantity(size, parseInt(e.target.value, 10) || 0)}
                aria-label={`Stock quantity for size ${size}`}
              />
            </div>
          );
        })}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
