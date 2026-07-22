import { ReactNode } from 'react';

type SocialButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  children: ReactNode;
};

export default function SocialButton({ onClick, disabled, icon, children }: SocialButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-sm border font-bold text-xs uppercase tracking-widest transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ borderColor: 'rgba(201,163,107,0.3)', color: '#efe0cd', background: 'rgba(239,224,205,0.03)' }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = 'rgba(201,163,107,0.7)';
        e.currentTarget.style.background = 'rgba(201,163,107,0.08)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'rgba(201,163,107,0.3)';
        e.currentTarget.style.background = 'rgba(239,224,205,0.03)';
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.9 1.5l2.7-2.6C16.9 3.1 14.7 2 12 2 6.9 2 2.7 6.1 2.7 12S6.9 22 12 22c6.9 0 9.2-4.8 9.2-7.3 0-.5 0-.9-.1-1.3H12z"
      />
    </svg>
  );
}

export function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#efe0cd">
      <path d="M16.4 1c.1 1.1-.3 2.2-1 3-.7.8-1.8 1.4-2.9 1.3-.1-1.1.4-2.2 1-3 .8-.8 1.9-1.3 2.9-1.3zM20 17c-.5 1.2-.8 1.7-1.5 2.7-1 1.4-2.4 3.2-4.1 3.2-1.5 0-1.9-1-3.9-1s-2.5 1-4 1c-1.7 0-3-1.6-4-3-2.7-4-3-8.6-1.3-11 1.2-1.7 3-2.7 4.7-2.7 1.7 0 2.8 1 4.2 1 1.3 0 2.2-1 4.2-1 1.5 0 3.1.8 4.2 2.2-3.7 2-3.1 7.3 1.5 8.6z" />
    </svg>
  );
}
