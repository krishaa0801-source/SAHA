import { ReactNode, useEffect, useState } from 'react';

// Same fashion photo already used on the homepage's "Our Philosophy" section,
// reused here rather than pointing at a new external asset.
const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB0H6jVho5OG6d7NJEk7Y6AdpqXpvpkGjJDsyYOGWm3pPqtQ8efnhVQiRxqhQv4HNR1nXiWTUmpMy9C50AKLVWvO7klr8qUr5K-w9_H0_GmIGazy8my70_mfKRQnK1zjaY9d381v8aCewcjJWFluxqTDWg3zGmh959fpWjMN3SoxcQt8NmcbR2Q9S_MU7_DM81B-KnDKSgidX5MawOw1r4ZaFvS1X7sbK4eLdgx70EMVaDgz60kFNonAdKthuk0r23YhTkY8i84IFQK';

type AuthLayoutProps = {
  tagline: string;
  children: ReactNode;
};

export default function AuthLayout({ tagline, children }: AuthLayoutProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen w-full flex bg-deep-aubergine">
      {/* ===== Left: luxury fashion image ===== */}
      <div className="hidden lg:block relative w-1/2 overflow-hidden">
        <img src={HERO_IMAGE} alt="Saha's curated luxury collection" className="absolute inset-0 w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(61,26,56,0.55) 0%, rgba(61,26,56,0.35) 45%, rgba(61,26,56,0.92) 100%)',
          }}
        />
        <div className="auth-swatch w-80 h-80 bg-secondary top-10 -left-16" style={{ animation: 'auth-drift 16s ease-in-out infinite' }} />
        <div className="auth-swatch w-96 h-96 bg-primary-container right-[-6rem] bottom-1/4" style={{ animation: 'auth-drift 20s ease-in-out infinite reverse' }} />

        <div className="relative z-10 h-full flex flex-col justify-between p-12 xl:p-16">
          <a href="/index.html" className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="Saha's" className="w-12 h-12 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <span className="font-['Playfair_Display'] text-2xl tracking-wide" style={{ color: '#C9A36B' }}>
              Saha's
            </span>
          </a>

          <div className="max-w-md">
            <span className="inline-block font-bold text-[11px] uppercase tracking-[0.3em] mb-4" style={{ color: 'rgba(201,163,107,0.8)' }}>
              Designer Rentals · Worn &amp; Returned
            </span>
            <h1 className="font-['Great_Vibes'] text-5xl xl:text-6xl leading-tight" style={{ color: '#fdd397' }}>
              {tagline}
            </h1>
          </div>
        </div>
      </div>

      {/* ===== Right: glassmorphism auth card ===== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(201,163,107,0.12) 0%, transparent 70%)' }} />

        {/* Mobile-only brand mark */}
        <a href="/index.html" className="lg:hidden absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          <img src="/assets/logo.png" alt="Saha's" className="w-9 h-9 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <span className="font-['Playfair_Display'] text-xl" style={{ color: '#C9A36B' }}>
            Saha's
          </span>
        </a>

        <div className={`auth-reveal ${visible ? 'visible' : ''} w-full max-w-md relative z-10 mt-14 lg:mt-0`}>
          <div className="glass-card rounded-2xl p-8 sm:p-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
