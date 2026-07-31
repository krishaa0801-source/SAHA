import { FormEvent, useState } from 'react';
import AdminModal from './AdminModal';
import { AdminApiError, AdminOrder, DepositAction, resolveDeposit } from '../../lib/admin/orders';
import { useToast } from './ToastProvider';

type Props = {
  order: AdminOrder;
  onClose: () => void;
  onSaved: () => void;
};

const REASON_PRESETS = [
  'Returned in perfect condition',
  'Minor stain',
  'Damage',
  'Missing accessory',
  'Late return',
  'Other',
];

const ACTIONS: { value: DepositAction; label: string; hint: string }[] = [
  { value: 'refund_full', label: 'Refund Full Deposit', hint: 'Returns the entire security deposit to the customer.' },
  { value: 'refund_partial', label: 'Refund Partial Deposit', hint: 'Returns part of the deposit; the rest is retained.' },
  { value: 'forfeit', label: 'Forfeit Deposit', hint: 'The entire security deposit is retained.' },
];

// Record-keeping only — this does not call Razorpay's refund API or move
// any money itself. It tracks the admin's decision (and internal reason,
// never shown to the customer) so Order Details stays accurate.
export default function DepositModal({ order, onClose, onSaved }: Props) {
  const { showSuccess, showError } = useToast();
  const [action, setAction] = useState<DepositAction>('refund_full');
  const [amountInput, setAmountInput] = useState('');
  const [reasonPreset, setReasonPreset] = useState(REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function resolvedReason(): string {
    return reasonPreset === 'Other' ? customReason.trim() : reasonPreset;
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!resolvedReason()) next.reason = 'An internal reason is required.';
    if (action === 'refund_partial') {
      const amount = parseFloat(amountInput);
      if (!(amount > 0)) next.amount = 'Refund amount must be greater than 0.';
      else if (amount > order.securityDeposit) next.amount = `Cannot exceed the ₹${order.securityDeposit.toLocaleString('en-IN')} deposit.`;
    }
    return next;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await resolveDeposit(order.id, action, resolvedReason(), action === 'refund_partial' ? parseFloat(amountInput) : undefined);
      showSuccess('Deposit updated.');
      onSaved();
      onClose();
    } catch (err) {
      showError(err instanceof AdminApiError ? err.message : 'Could not update the deposit.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminModal title={`Manage Deposit — ${order.name}`} onClose={onClose}>
      <div className="mb-4">
        <p className="text-xs" style={{ color: 'rgba(239,224,205,0.6)' }}>
          Security Deposit collected: <strong>₹{order.securityDeposit.toLocaleString('en-IN')}</strong>
          {order.depositStatus !== 'pending' && (
            <>
              {' '}
              — currently <strong>{order.depositStatus.replace('_', ' ')}</strong>
              {order.depositRefundAmount > 0 ? ` (₹${order.depositRefundAmount.toLocaleString('en-IN')} refunded)` : ''}
            </>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <div>
            <label className="field-label">Action</label>
            <select className="field-input" value={action} onChange={(e) => setAction(e.target.value as DepositAction)}>
              {ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
            <p className="admin-hint">{ACTIONS.find((a) => a.value === action)?.hint}</p>
          </div>

          {action === 'refund_partial' && (
            <div>
              <label className="field-label">Refund Amount (₹)</label>
              <input
                type="number"
                min={0}
                max={order.securityDeposit}
                step="0.01"
                className={`field-input ${errors.amount ? 'field-invalid' : ''}`}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
              />
              {errors.amount && <p className="field-error">{errors.amount}</p>}
            </div>
          )}

          <div>
            <label className="field-label">Internal Reason</label>
            <select className="field-input" value={reasonPreset} onChange={(e) => setReasonPreset(e.target.value)}>
              {REASON_PRESETS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {reasonPreset === 'Other' && (
            <div>
              <label className="field-label">Reason Details</label>
              <input
                className={`field-input ${errors.reason ? 'field-invalid' : ''}`}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe the reason"
              />
            </div>
          )}
          {errors.reason && reasonPreset !== 'Other' && <p className="field-error">{errors.reason}</p>}
        </div>

        <p className="admin-hint mt-2">This reason is internal only — the customer never sees it.</p>

        <div className="admin-form-actions">
          <button type="button" className="admin-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="admin-btn-primary" disabled={submitting}>
            {submitting && <span className="spinner" />}
            Save
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
