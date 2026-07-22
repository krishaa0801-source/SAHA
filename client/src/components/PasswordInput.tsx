import { useState, InputHTMLAttributes } from 'react';
import FormField from './FormField';

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export default function PasswordInput({ label, error, id, ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField
      id={id}
      label={label}
      error={error}
      type={visible ? 'text' : 'password'}
      {...inputProps}
      rightElement={
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="text-[#efe0cd]/50 hover:text-[#C9A36B] transition-colors"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <span className="material-symbols-outlined text-lg leading-none">
            {visible ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      }
    />
  );
}
