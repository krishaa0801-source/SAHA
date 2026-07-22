import { ButtonHTMLAttributes } from 'react';

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export default function PrimaryButton({ loading, disabled, children, ...rest }: PrimaryButtonProps) {
  return (
    <button
      className="w-full py-3.5 rounded-sm font-bold text-xs uppercase tracking-[0.15em] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      style={{ background: '#C9A36B', color: '#453c2e' }}
      onMouseOver={(e) => {
        if (!disabled && !loading) e.currentTarget.style.background = '#fdd397';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = '#C9A36B';
      }}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
}
