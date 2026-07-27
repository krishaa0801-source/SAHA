import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardStats, fetchDashboard } from '../../lib/admin/dashboard';
import { useToast } from '../../components/admin/ToastProvider';

const STAT_TILES: Array<{ key: keyof DashboardStats; label: string; icon: string }> = [
  { key: 'totalProducts', label: 'Total Products', icon: 'checkroom' },
  { key: 'availableProducts', label: 'Available Products', icon: 'check_circle' },
  { key: 'currentlyRentedProducts', label: 'Currently Rented', icon: 'local_laundry_service' },
  { key: 'totalCategories', label: 'Categories', icon: 'category' },
];

export default function DashboardPage() {
  const { showError } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDashboard()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => showError(err instanceof Error ? err.message : 'Could not load the dashboard.'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!stats) {
    return (
      <div className="admin-loading">
        <span className="spinner" /> Loading dashboard…
      </div>
    );
  }

  return (
    <div>
      <h1 className="admin-page-title">Dashboard</h1>

      <div className="admin-stat-grid">
        {STAT_TILES.map((tile) => (
          <div key={tile.key} className="admin-stat-tile">
            <span className="material-symbols-outlined text-2xl">{tile.icon}</span>
            <div>
              <div className="admin-stat-value">{stats[tile.key] as number}</div>
              <div className="admin-stat-label">{tile.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-dashboard-columns">
        <section className="card">
          <h2 className="admin-section-title">Recent Orders</h2>
          {stats.recentOrders.length === 0 ? (
            <p className="admin-empty-inline">No orders yet.</p>
          ) : (
            <ul className="admin-list">
              {stats.recentOrders.map((o) => (
                <li key={o._id}>
                  <div>
                    <div className="admin-list-title">{o.name}</div>
                    <div className="admin-list-sub">
                      Size {o.size} · {o.from} → {o.to}
                    </div>
                  </div>
                  <div className="admin-list-end">
                    <span className={`status-badge status-${o.status}`}>{o.status}</span>
                    <span>₹{o.total.toLocaleString('en-IN')}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="admin-section-title">Recently Added Products</h2>
          {stats.recentlyAddedProducts.length === 0 ? (
            <p className="admin-empty-inline">No products yet — add your first one.</p>
          ) : (
            <ul className="admin-list">
              {stats.recentlyAddedProducts.map((p) => (
                <li key={p.id}>
                  <div className="admin-list-with-thumb">
                    <img src={p.image} alt={p.name} />
                    <div>
                      <div className="admin-list-title">{p.name}</div>
                      <div className="admin-list-sub">{p.category}</div>
                    </div>
                  </div>
                  <div className="admin-list-end">
                    <span className={`status-badge status-${p.status}`}>{p.status}</span>
                    <span>₹{p.price.toLocaleString('en-IN')}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="admin-actions-row">
        <Link to="/admin/products/new" className="admin-btn-primary">
          <span className="material-symbols-outlined text-base">add</span>
          Add Product
        </Link>
      </div>
    </div>
  );
}
