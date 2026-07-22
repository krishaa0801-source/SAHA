import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import PasswordInput from '../components/PasswordInput';
import Checkbox from '../components/Checkbox';
import PrimaryButton from '../components/PrimaryButton';
import SuccessCheck from '../components/SuccessCheck';
import SocialButton, { AppleIcon, GoogleIcon } from '../components/SocialButton';
import { getRememberedEmail, loginRequest, loginWithApple, loginWithGoogle, requestPasswordReset } from '../lib/auth';
import { isValidEmail } from '../lib/validators';

type Errors = { email?: string; password?: string; form?: string };

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);

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
        window.location.href = '/account.html';
      }, 900);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Something went wrong. Please try again.' });
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSocial(provider: 'google' | 'apple') {
    setSocialLoading(provider);
    try {
      await (provider === 'google' ? loginWithGoogle() : loginWithApple());
      window.location.href = '/account.html';
    } finally {
      setSocialLoading(null);
    }
  }

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidEmail(forgotEmail)) return;
    setForgotSending(true);
    await requestPasswordReset(forgotEmail.trim());
    setForgotSending(false);
    setForgotSent(true);
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
      {showForgot ? (
        <div>
          <h2 className="font-['Playfair_Display'] text-2xl mb-1" style={{ color: '#C9A36B' }}>
            Reset your password
          </h2>
          <p className="text-xs mb-6" style={{ color: 'rgba(239,224,205,0.6)' }}>
            {forgotSent ? "We've sent a reset link if that email is registered." : "Enter the email on your account and we'll send a reset link."}
          </p>
          {!forgotSent ? (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <FormField
                id="forgot-email"
                label="Email"
                type="email"
                placeholder="your@email.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                autoComplete="email"
              />
              <PrimaryButton type="submit" loading={forgotSending}>
                Send Reset Link
              </PrimaryButton>
            </form>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setShowForgot(false);
              setForgotSent(false);
              setForgotEmail('');
            }}
            className="mt-5 text-xs font-bold uppercase tracking-widest"
            style={{ color: '#C9A36B' }}
          >
            ← Back to Sign In
          </button>
        </div>
      ) : (
        <>
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

            <div className="flex items-center justify-between">
              <Checkbox id="remember-me" checked={remember} onChange={setRemember}>
                Remember Me
              </Checkbox>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs font-bold"
                style={{ color: 'rgba(201,163,107,0.85)' }}
              >
                Forgot Password?
              </button>
            </div>

            {errors.form && <p className="field-error text-center">{errors.form}</p>}

            <PrimaryButton type="submit" loading={submitting}>
              {submitting ? 'Signing In…' : 'Login'}
            </PrimaryButton>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(201,163,107,0.2)' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(239,224,205,0.4)' }}>
              Or
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(201,163,107,0.2)' }} />
          </div>

          <div className="flex gap-3">
            <SocialButton onClick={() => handleSocial('google')} disabled={socialLoading !== null} icon={<GoogleIcon />}>
              Google
            </SocialButton>
            <SocialButton onClick={() => handleSocial('apple')} disabled={socialLoading !== null} icon={<AppleIcon />}>
              Apple
            </SocialButton>
          </div>

          <p className="text-center text-xs mt-8" style={{ color: 'rgba(239,224,205,0.6)' }}>
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold" style={{ color: '#C9A36B' }}>
              Create Account
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
