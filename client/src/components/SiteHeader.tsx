import { useEffect, useState } from 'react';
import { fetchCartCount } from '../lib/cartCount';
import MobileMenu from './MobileMenu';

type NavKey = 'how-it-works' | 'vault' | 'fit-match' | 'policy' | 'contact' | 'account';

type SiteHeaderProps = {
  active?: NavKey;
};

const linkStyle = (isActive: boolean) => ({ color: isActive ? '#C9A36B' : '#efe0cd' });

// The one shared header for every React-rendered page (Account, Order
// Confirmation, …) — mirrors the header markup duplicated across the
// plain HTML pages (index.html, vault.html, contact.html, fit-match.html,
// policy.html) so the site reads as one consistent nav everywhere, cart
// icon included. The mobile hamburger itself lives in MobileMenu — shared
// with AuthLayout and CartPage's own headers too — so every page's mobile
// nav is one component, not a per-page copy.
export default function SiteHeader({ active }: SiteHeaderProps) {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      fetchCartCount().then((n) => {
        if (!cancelled) setCartCount(n);
      });
    };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('sahas:cart-updated', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', refresh);
      window.removeEventListener('sahas:cart-updated', refresh);
    };
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[60] backdrop-blur-md border-b flex justify-between items-center w-full px-6 md:px-12 py-2"
      style={{ background: 'rgba(61,26,56,0.92)', borderColor: 'rgba(201,163,107,0.2)' }}
    >
      <div className="w-8 lg:hidden" />
      <div className="h-16 flex items-center gap-3 absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0">
        <a href="/index.html" className="flex items-center gap-3">
          <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              alt="Saha's"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              src="/assets/logo.png"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <span className="font-['Playfair_Display'] text-2xl tracking-wide hidden sm:block" style={{ color: '#C9A36B' }}>
            Saha's
          </span>
        </a>
      </div>
      <nav className="hidden lg:flex gap-6 items-center">
        <a className="font-bold text-xs uppercase tracking-widest" style={linkStyle(active === 'how-it-works')} href="/index.html#how-it-works">
          How it Works
        </a>
        <a className="font-bold text-xs uppercase tracking-widest" style={linkStyle(active === 'vault')} href="/vault.html">
          Style Vault
        </a>
        <a className="font-bold text-xs uppercase tracking-widest" style={linkStyle(active === 'fit-match')} href="/fit-match.html">
          Fit Match
        </a>
        <a className="font-bold text-xs uppercase tracking-widest" style={linkStyle(active === 'policy')} href="/policy.html">
          Policy
        </a>
        <a className="font-bold text-xs uppercase tracking-widest" style={linkStyle(active === 'contact')} href="/contact.html">
          Contact
        </a>
        <a
          className="relative flex items-center gap-1.5 font-bold text-xs uppercase tracking-widest"
          style={{ color: '#efe0cd' }}
          href="/cart.html"
          aria-label="My Cart"
        >
          <span className="material-symbols-outlined text-xl">shopping_bag</span>
          <span className="hidden xl:inline">My Cart</span>
          <span className={`nav-badge${cartCount > 0 ? ' show' : ''}`}>{cartCount}</span>
        </a>
        <a
          className="font-bold text-xs uppercase tracking-widest flex items-center gap-1"
          style={linkStyle(active === 'account')}
          href="/account.html"
        >
          <span className="material-symbols-outlined text-base">person</span>
        </a>
        <a
          href="/vault.html"
          className="px-7 py-2.5 rounded-sm font-bold text-xs uppercase tracking-[0.15em] transition-all duration-300"
          style={{ background: '#C9A36B', color: '#453c2e' }}
        >
          Rent Now
        </a>
      </nav>
      <MobileMenu active={active === 'how-it-works' ? undefined : active} />
    </header>
  );
}
