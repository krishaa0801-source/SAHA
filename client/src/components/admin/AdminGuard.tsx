import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchCurrentUser } from '../../lib/auth';

type Status = 'checking' | 'allowed' | 'denied';

// Gates the whole /admin/* tree. Reads `role` off the same /api/auth/me
// call the rest of the app already makes (see lib/auth.ts) — no extra
// round-trip — and the server independently re-checks role on every
// /api/admin/* request via requireAdmin, so this is a UX guard, not the
// security boundary itself.
export default function AdminGuard({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser().then((user) => {
      if (cancelled) return;
      setStatus(user && user.role === 'admin' ? 'allowed' : 'denied');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'checking') return null;
  if (status === 'denied') return <Navigate to="/login" replace />;
  return <>{children}</>;
}
