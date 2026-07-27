// Talks to the real Express + MongoDB backend under /api/auth. The
// session itself lives in an httpOnly cookie set by the server; the
// localStorage copies below are just a UI cache (greeting name, "Login"
// vs "Account" nav state) — they are never the source of truth for access.
import { mergeGuestCartIfAny } from './cart';

const USER_KEY = 'sahas_user_data';
const REMEMBER_KEY = 'sahas_remember_email';

export type StoredUser = {
  fname: string;
  lname: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pin: string;
  role: 'user' | 'admin';
};

async function parseJsonResponse(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function cacheUser(user: StoredUser, remember: boolean) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem('sahas_auth', JSON.stringify({ loggedIn: true, email: user.email }));
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, user.email);
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
}

export async function fetchCurrentUser(): Promise<StoredUser | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (!res.ok) return null;
  const data = await parseJsonResponse(res);
  return data?.user ?? null;
}

export function getRememberedEmail(): string {
  return localStorage.getItem(REMEMBER_KEY) || '';
}

export async function loginRequest(email: string, password: string, remember: boolean): Promise<StoredUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data?.error || 'Incorrect email or password.');
  cacheUser(data.user, remember);
  await mergeGuestCartIfAny();
  return data.user;
}

export type SignupInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export async function signupRequest(input: SignupInput): Promise<StoredUser> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data?.error || 'Could not create your account. Please try again.');
  cacheUser(data.user, true);
  await mergeGuestCartIfAny();
  return data.user;
}

export type ProfileInput = {
  fname: string;
  lname: string;
  phone: string;
  address: string;
  city: string;
  pin: string;
};

export async function updateProfile(input: ProfileInput): Promise<StoredUser> {
  const res = await fetch('/api/auth/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    const err: any = new Error(data?.error || 'Could not save your profile. Please try again.');
    err.status = res.status;
    throw err;
  }
  cacheUser(data.user, Boolean(getRememberedEmail()));
  return data.user;
}

export async function logoutRequest(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch {
    // best-effort — still clear local cache below
  }
  localStorage.removeItem('sahas_auth');
  localStorage.removeItem(USER_KEY);
}
