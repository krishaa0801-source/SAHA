export default function SuccessCheck({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center success-check">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="30" stroke="#4ade80" strokeWidth="2.5" opacity="0.4" />
        <path
          d="M19 33.5L27.5 42L45 22"
          stroke="#4ade80"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="mt-4 font-['Playfair_Display'] text-xl" style={{ color: '#fdd397' }}>
        {label}
      </p>
    </div>
  );
}
