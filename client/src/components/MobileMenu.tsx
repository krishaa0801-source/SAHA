import { useState } from 'react';

type NavKey = 'vault' | 'fit-match' | 'policy' | 'contact' | 'account';

type MobileMenuProps = {
  active?: NavKey;
};

const linkStyle = (isActive: boolean) => ({ color: isActive ? '#C9A36B' : '#efe0cd' });

// The one hamburger button + dropdown used by every page's own header
// (SiteHeader, AuthLayout, CartPage) instead of each keeping its own
// copy — same markup, same state logic, same links everywhere, so mobile
// nav can't drift out of sync with itself again. The overlay uses `fixed`
// positioning (viewport-relative), so it renders correctly regardless of
// where in a page's own header this is mounted.
export default function MobileMenu({ active }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="lg:hidden relative z-[70]"
        style={{ color: '#C9A36B' }}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-3xl">{open ? 'close' : 'menu'}</span>
      </button>

      <div
        className="fixed top-20 right-6 w-56 shadow-2xl rounded-md z-[55] flex flex-col items-center gap-5 p-6 transition-all duration-300 lg:hidden"
        style={{
          background: '#5f2859',
          border: '1px solid rgba(201,163,107,0.25)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transform: open ? 'scale(1)' : 'scale(0.95)',
        }}
      >
        <a className="font-bold text-sm uppercase tracking-widest" style={linkStyle(active === 'vault')} href="/vault.html" onClick={() => setOpen(false)}>
          Style Vault
        </a>
        <a className="font-bold text-sm uppercase tracking-widest" style={linkStyle(active === 'fit-match')} href="/fit-match.html" onClick={() => setOpen(false)}>
          Saha Fit Match
        </a>
        <a className="font-bold text-sm uppercase tracking-widest" style={linkStyle(active === 'policy')} href="/policy.html" onClick={() => setOpen(false)}>
          Policy
        </a>
        <a className="font-bold text-sm uppercase tracking-widest" style={linkStyle(active === 'contact')} href="/contact.html" onClick={() => setOpen(false)}>
          Contact Us
        </a>
        <a
          className="font-bold text-sm uppercase tracking-widest flex items-center gap-1.5"
          style={{ color: '#efe0cd' }}
          href="/cart.html"
          onClick={() => setOpen(false)}
        >
          <span className="material-symbols-outlined text-base">shopping_bag</span>My Cart
        </a>
        <a className="font-bold text-sm uppercase tracking-widest" style={linkStyle(active === 'account')} href="/account.html" onClick={() => setOpen(false)}>
          My Account
        </a>
        <a
          href="/vault.html"
          className="px-6 py-3 w-full mt-2 rounded-sm font-bold text-xs uppercase tracking-[0.15em] text-center"
          style={{ background: '#C9A36B', color: '#453c2e' }}
          onClick={() => setOpen(false)}
        >
          Rent Now
        </a>
      </div>
    </>
  );
}
