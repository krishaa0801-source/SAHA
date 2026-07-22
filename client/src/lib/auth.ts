// Talks to the real Express + MongoDB backend under /api/auth. The
// session itself lives in an httpOnly cookie set by the server; the
// localStorage copies below are just a UI cache (greeting name, "Login"
// vs "Account" nav state) — they are never the source of truth for access.
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
  return data.user;
}

export function loginWithGoogle(): Promise<void> {
  // TODO: replace with real Google OAuth (e.g. Google Identity Services).
  return new Promise((resolve) => setTimeout(resolve, 700));
}

export function loginWithApple(): Promise<void> {
  // TODO: replace with real Sign in with Apple.
  return new Promise((resolve) => setTimeout(resolve, 700));
}

export function requestPasswordReset(_email: string): Promise<void> {
  // TODO: replace with a real password-reset email dispatch.
  return new Promise((resolve) => setTimeout(resolve, 800));
}
