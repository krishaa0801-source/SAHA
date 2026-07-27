import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentUser, logoutRequest, ProfileInput, StoredUser, updateProfile } from '../lib/auth';
import { fetchOrders, Order } from '../lib/orders';
import OrderRow from '../components/OrderRow';

type Tab = 'profile' | 'rentals';

export default function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('profile');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [profile, setProfile] = useState<ProfileInput>({ fname: '', lname: '', phone: '', address: '', city: '', pin: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(false);

  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser().then((u) => {
      if (cancelled) return;
      if (!u) {
        navigate('/login', { replace: true });
        return;
      }
      setUser(u);
      setProfile({ fname: u.fname, lname: u.lname, phone: u.phone, address: u.address, city: u.city, pin: u.pin });
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (tab === 'rentals' && orders === null) {
      fetchOrders()
        .then(setOrders)
        .catch((err) => {
          if (err?.message === 'Not authenticated') navigate('/login', { replace: true });
        });
    }
  }, [tab, orders, navigate]);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const updated = await updateProfile(profile);
      setUser(updated);
      setSaveMsg(true);
      setTimeout(() => setSaveMsg(false), 2600);
    } catch (err: any) {
      if (err?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      alert(err?.message || 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logoutRequest();
    navigate('/login', { replace: true });
  }

  if (!loaded || !user) return null;

  return (
    <div className="font-aptos" style={{ background: '#3D1A38', color: '#efe0cd', minHeight: '100vh' }}>
      {/* Header */}
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
          <a className="font-bold text-xs uppercase tracking-widest" style={{ color: '#efe0cd' }} href="/index.html#how-it-works">
            How it Works
          </a>
          <a className="font-bold text-xs uppercase tracking-widest" style={{ color: '#efe0cd' }} href="/vault.html">
            Style Vault
          </a>
          <a className="font-bold text-xs uppercase tracking-widest" style={{ color: '#efe0cd' }} href="/fit-match.html">
            Fit Match
          </a>
          <a className="font-bold text-xs uppercase tracking-widest" style={{ color: '#efe0cd' }} href="/policy.html">
            Policy
          </a>
          <a className="font-bold text-xs uppercase tracking-widest" style={{ color: '#efe0cd' }} href="/contact.html">
            Contact
          </a>
          <a className="font-bold text-xs uppercase tracking-widest flex items-center gap-1" style={{ color: '#C9A36B' }} href="/account.html">
            <span className="material-symbols-outlined text-base">person</span>Account
          </a>
          <a
            href="/vault.html"
            className="px-7 py-2.5 rounded-sm font-bold text-xs uppercase tracking-[0.15em] transition-all duration-300"
            style={{ background: '#C9A36B', color: '#453c2e' }}
          >
            Rent Now
          </a>
        </nav>
        <button className="lg:hidden relative z-[70]" style={{ color: '#C9A36B' }} onClick={() => setMobileMenuOpen((v) => !v)}>
          <span className="material-symbols-outlined text-3xl">{mobileMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </header>

      {/* Mobile menu */}
      <div
        className="fixed top-20 right-6 w-56 shadow-2xl rounded-md z-[55] flex flex-col items-center gap-5 p-6 transition-all duration-300 lg:hidden"
        style={{
          background: '#5f2859',
          border: '1px solid rgba(201,163,107,0.25)',
          opacity: mobileMenuOpen ? 1 : 0,
          pointerEvents: mobileMenuOpen ? 'auto' : 'none',
          transform: mobileMenuOpen ? 'scale(1)' : 'scale(0.95)',
        }}
      >
        <a className="font-bold text-sm uppercase tracking-widest" style={{ color: '#efe0cd' }} href="/vault.html">
          Style Vault
        </a>
        <a className="font-bold text-sm uppercase tracking-widest" style={{ color: '#efe0cd' }} href="/fit-match.html">
          Saha Fit Match
        </a>
        <a className="font-bold text-sm uppercase tracking-widest" style={{ color: '#efe0cd' }} href="/policy.html">
          Policy
        </a>
        <a className="font-bold text-sm uppercase tracking-widest" style={{ color: '#efe0cd' }} href="/contact.html">
          Contact Us
        </a>
        <a className="font-bold text-sm uppercase tracking-widest" style={{ color: '#C9A36B' }} href="/account.html">
          My Account
        </a>
        <a
          href="/vault.html"
          className="px-6 py-3 w-full mt-2 rounded-sm font-bold text-xs uppercase tracking-[0.15em] text-center"
          style={{ background: '#C9A36B', color: '#453c2e' }}
        >
          Rent Now
        </a>
      </div>

      <main className="pt-[72px] pb-24 px-4 md:px-8">
        <div className="max-w-2xl mx-auto py-10">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(201,163,107,0.6)' }}>
                Welcome back
              </p>
              <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl" style={{ color: '#fdd397' }}>
                {user.fname}
                {user.lname ? ` ${user.lname}` : ''}
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-sm font-bold text-xs uppercase tracking-widest border transition-all"
              style={{ borderColor: 'rgba(201,163,107,0.3)', color: 'rgba(239,224,205,0.6)' }}
            >
              <span className="material-symbols-outlined text-base">logout</span>Sign Out
            </button>
          </div>

          <div className="flex gap-2 flex-wrap mb-6">
            <button className={`dash-tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
              <span className="material-symbols-outlined text-sm align-middle mr-1">person</span>Profile
            </button>
            <button className={`dash-tab ${tab === 'rentals' ? 'active' : ''}`} onClick={() => setTab('rentals')}>
              <span className="material-symbols-outlined text-sm align-middle mr-1">local_laundry_service</span>My Rentals
            </button>
          </div>

          {tab === 'profile' && (
            <div className="card">
              <h2 className="font-['Playfair_Display'] text-xl mb-5" style={{ color: '#efe0cd' }}>
                Profile Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="field-label">First Name</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Your name"
                    value={profile.fname}
                    onChange={(e) => setProfile({ ...profile, fname: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Last Name</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Last name"
                    value={profile.lname}
                    onChange={(e) => setProfile({ ...profile, lname: e.target.value })}
                  />
                </div>
              </div>
              <div className="mb-5">
                <label className="field-label">Email</label>
                <input type="email" className="field-input" value={user.email} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
              <div className="mb-5">
                <label className="field-label">Phone</label>
                <input
                  type="tel"
                  className="field-input"
                  placeholder="+91 98765 43210"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
              <hr className="divider" />
              <h3 className="font-bold text-xs uppercase tracking-widest mb-4 mt-1" style={{ color: 'rgba(201,163,107,0.7)' }}>
                Delivery Address
              </h3>
              <div className="mb-4">
                <label className="field-label">Street Address</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="123, MG Road, Apartment 4B"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="field-label">City</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Mumbai"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Pincode</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="400001"
                    maxLength={6}
                    value={profile.pin}
                    onChange={(e) => setProfile({ ...profile, pin: e.target.value })}
                  />
                </div>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-8 py-3 rounded-sm font-bold text-xs uppercase tracking-[0.15em] transition-all flex items-center gap-2 disabled:opacity-70"
                style={{ background: '#C9A36B', color: '#453c2e' }}
              >
                <span className="material-symbols-outlined text-base">save</span>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {saveMsg && (
                <div className="text-xs mt-3 font-bold save-flash" style={{ color: '#4ade80' }}>
                  ✓ Profile saved successfully
                </div>
              )}
            </div>
          )}

          {tab === 'rentals' && (
            <div className="flex flex-col gap-4">
              {orders === null ? null : orders.length ? (
                orders.map((o) => <OrderRow key={o._id} order={o} />)
              ) : (
                <div className="card text-center py-12">
                  <span className="material-symbols-outlined text-5xl mb-4 block" style={{ color: 'rgba(201,163,107,0.3)' }}>
                    local_laundry_service
                  </span>
                  <p className="font-['Playfair_Display'] text-xl mb-2" style={{ color: 'rgba(201,163,107,0.7)' }}>
                    No rentals yet
                  </p>
                  <p className="text-sm mb-6" style={{ color: 'rgba(239,224,205,0.5)' }}>
                    Your confirmed rentals will appear here.
                  </p>
                  <a
                    href="/vault.html"
                    className="inline-block px-8 py-3 rounded-sm font-bold text-xs uppercase tracking-widest"
                    style={{ background: '#C9A36B', color: '#453c2e' }}
                  >
                    Browse the Vault
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md border-t flex justify-around items-center w-full px-2 py-3"
        style={{ background: 'rgba(239,224,205,0.95)', borderColor: 'rgba(201,163,107,0.3)' }}
      >
        <a className="flex flex-col items-center gap-1" style={{ color: '#5f2859' }} href="/index.html">
          <span className="material-symbols-outlined text-2xl">home</span>
          <span className="text-[9px] font-bold uppercase tracking-wider">Home</span>
        </a>
        <a className="flex flex-col items-center gap-1" style={{ color: '#5f2859' }} href="/vault.html">
          <span className="material-symbols-outlined text-2xl">checkroom</span>
          <span className="text-[9px] font-bold uppercase tracking-wider">Vault</span>
        </a>
        <a className="flex flex-col items-center gap-1" style={{ color: '#5f2859' }} href="/fit-match.html">
          <span className="material-symbols-outlined text-2xl">straighten</span>
          <span className="text-[9px] font-bold uppercase tracking-wider">Fit Match</span>
        </a>
        <a className="flex flex-col items-center gap-1" style={{ color: '#C9A36B' }} href="/account.html">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="text-[9px] font-bold uppercase tracking-wider">Account</span>
        </a>
      </nav>
    </div>
  );
}
