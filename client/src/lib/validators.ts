export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10;
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
};

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  const levels: PasswordStrength[] = [
    { score: 0, label: 'Too weak', color: '#c0455a' },
    { score: 1, label: 'Weak', color: '#c0455a' },
    { score: 2, label: 'Fair', color: '#d99a4e' },
    { score: 3, label: 'Good', color: '#C9A36B' },
    { score: 4, label: 'Strong', color: '#4ade80' },
  ];

  return levels[password ? score : 0];
}
