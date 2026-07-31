import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { logoutRequest } from '../../lib/auth';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: 'space_dashboard', end: true },
  { to: '/admin/products', label: 'Products', icon: 'checkroom', end: false },
  { to: '/admin/orders', label: 'Orders', icon: 'receipt_long', end: false },
  { to: '/admin/categories', label: 'Categories', icon: 'category', end: false },
  { to: '/admin/reviews', label: 'Reviews', icon: 'reviews', end: false },
  { to: '/admin/coupons', label: 'Coupons', icon: 'sell', end: false },
];

export default function AdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <a href="/index.html" className="admin-sidebar-brand">
          Saha's <span>Admin</span>
        </a>
        <nav className="admin-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileNavOpen(false)}
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <a href="/vault.html" className="admin-nav-link admin-nav-link-ghost">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to site
        </a>
        <button className="admin-nav-link admin-nav-link-ghost" onClick={() => logoutRequest().then(() => window.location.assign('/login'))}>
          <span className="material-symbols-outlined text-lg">logout</span>
          Sign Out
        </button>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-mobile-nav-toggle" onClick={() => setMobileNavOpen((v) => !v)} aria-label="Toggle navigation">
            <span className="material-symbols-outlined">{mobileNavOpen ? 'close' : 'menu'}</span>
          </button>
          <span className="admin-topbar-title">Admin Panel</span>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>

      {mobileNavOpen && <div className="admin-sidebar-overlay" onClick={() => setMobileNavOpen(false)} />}
    </div>
  );
}
