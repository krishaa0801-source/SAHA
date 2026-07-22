import { getPasswordStrength } from '../lib/validators';

export default function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, color } = getPasswordStrength(password);

  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ background: i < score ? color : 'rgba(239,224,205,0.15)' }}
          />
        ))}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider mt-1.5" style={{ color }}>
        {label}
      </p>
    </div>
  );
}
