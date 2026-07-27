type QtyStepperProps = {
  qty: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
};

export default function QtyStepper({ qty, onChange, min = 1, max = 5 }: QtyStepperProps) {
  return (
    <div className="qty-stepper">
      <button type="button" disabled={qty <= min} onClick={() => onChange(Math.max(min, qty - 1))} aria-label="Decrease quantity">
        −
      </button>
      <span>{qty}</span>
      <button type="button" disabled={qty >= max} onClick={() => onChange(Math.min(max, qty + 1))} aria-label="Increase quantity">
        +
      </button>
    </div>
  );
}
