import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import { fetchCurrentUser } from './lib/auth';

export default function App() {
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser().then((user) => {
      if (cancelled) return;
      if (user) {
        window.location.href = '/account.html';
        return;
      }
      setCheckedAuth(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checkedAuth) return null;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
