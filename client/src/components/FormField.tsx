import { InputHTMLAttributes, ReactNode } from 'react';

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  rightElement?: ReactNode;
};

export default function FormField({ label, error, rightElement, id, className, ...inputProps }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={`field-input ${rightElement ? 'pr-11' : ''} ${error ? 'field-invalid' : ''} ${className ?? ''}`}
          {...inputProps}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">{rightElement}</div>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
