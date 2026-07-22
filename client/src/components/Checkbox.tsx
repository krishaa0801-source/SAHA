import { ReactNode } from 'react';

type CheckboxProps = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
};

export default function Checkbox({ id, checked, onChange, children }: CheckboxProps) {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer select-none group">
      <span className="relative flex-shrink-0 mt-0.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className="block w-[18px] h-[18px] rounded-[4px] border transition-all duration-150"
          style={{
            borderColor: checked ? '#C9A36B' : 'rgba(201,163,107,0.4)',
            background: checked ? '#C9A36B' : 'transparent',
          }}
        >
          {checked && (
            <svg viewBox="0 0 16 16" fill="none" className="w-full h-full p-[2px]">
              <path
                d="M3 8.2l3 3L13 4.5"
                stroke="#453c2e"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      </span>
      <span className="text-xs leading-relaxed text-[#efe0cd]/70 group-hover:text-[#efe0cd] transition-colors">
        {children}
      </span>
    </label>
  );
}
