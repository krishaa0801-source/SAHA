import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import PasswordInput from '../components/PasswordInput';
import Checkbox from '../components/Checkbox';
import PrimaryButton from '../components/PrimaryButton';
import SuccessCheck from '../components/SuccessCheck';
import { getRememberedEmail, loginRequest } from '../lib/auth';
import { isValidEmail } from '../lib/validators';

type Errors = { email?: string; password?: string; form?: string };

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const remembered = getRememberedEmail();
    if (remembered) {
      setEmail(remembered);
      setRemember(true);
    }
  }, []);

  function validate(): Errors {
    const next: Errors = {};
    if (!email.trim()) next.email = 'Email is required.';
    else if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    return next;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setSubmitting(true);
    try {
      await loginRequest(email.trim(), password, remember);
      setSuccess(true);
      setTimeout(() => {
        navigate('/account.html');
      }, 900);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Something went wrong. Please try again.' });
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <AuthLayout tagline="More iconic the outfit, less you wear it">
        <SuccessCheck label="Welcome back!" />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout tagline="More iconic the outfit, less you wear it">
      <div className="mb-8">
        <h1 className="font-['Playfair_Display'] text-3xl mb-1.5" style={{ color: '#C9A36B' }}>
          Welcome Back
        </h1>
        <p className="text-sm" style={{ color: 'rgba(239,224,205,0.6)' }}>
          Sign in to continue your Saha's experience.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-5 ${shake ? 'shake' : ''}`} noValidate>
        <FormField
          id="login-email"
          label="Email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="email"
        />
        <PasswordInput
          id="login-password"
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="current-password"
        />

        <Checkbox id="remember-me" checked={remember} onChange={setRemember}>
          Remember Me
        </Checkbox>

        {errors.form && <p className="field-error text-center">{errors.form}</p>}

        <PrimaryButton type="submit" loading={submitting}>
          {submitting ? 'Signing In…' : 'Login'}
        </PrimaryButton>
      </form>

      <p className="text-center text-xs mt-8" style={{ color: 'rgba(239,224,205,0.6)' }}>
        Don't have an account?{' '}
        <Link to="/signup" className="font-bold" style={{ color: '#C9A36B' }}>
          Create Account
        </Link>
      </p>
    </AuthLayout>
  );
}
