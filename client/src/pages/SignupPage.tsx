import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import PasswordInput from '../components/PasswordInput';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import Checkbox from '../components/Checkbox';
import PrimaryButton from '../components/PrimaryButton';
import SuccessCheck from '../components/SuccessCheck';
import { signupRequest } from '../lib/auth';
import { isValidEmail, isValidPhone } from '../lib/validators';

type Errors = {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  agree?: string;
};

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  function validate(): Errors {
    const next: Errors = {};
    if (!fullName.trim()) next.fullName = 'Full name is required.';
    if (!email.trim()) next.email = 'Email is required.';
    else if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    if (!phone.trim()) next.phone = 'Phone number is required.';
    else if (!isValidPhone(phone)) next.phone = 'Enter a valid phone number.';
    if (!password) next.password = 'Password is required.';
    else if (password.length < 6) next.password = 'Use at least 6 characters.';
    if (!confirmPassword) next.confirmPassword = 'Please confirm your password.';
    else if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match.';
    if (!agree) next.agree = 'You must agree to continue.';
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
      await signupRequest({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), password });
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/account.html';
      }, 900);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <AuthLayout tagline="Your wardrobe, without the clutter">
        <SuccessCheck label="Account created!" />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout tagline="Your wardrobe, without the clutter">
      <div className="mb-8">
        <h1 className="font-['Playfair_Display'] text-3xl mb-1.5" style={{ color: '#C9A36B' }}>
          Create Account
        </h1>
        <p className="text-sm" style={{ color: 'rgba(239,224,205,0.6)' }}>
          Join the wardrobe that refreshes itself.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-5 ${shake ? 'shake' : ''}`} noValidate>
        <FormField
          id="signup-name"
          label="Full Name"
          type="text"
          placeholder="Aria Sharma"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          autoComplete="name"
        />
        <FormField
          id="signup-email"
          label="Email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="email"
        />
        <FormField
          id="signup-phone"
          label="Phone Number"
          type="tel"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          autoComplete="tel"
        />
        <div>
          <PasswordInput
            id="signup-password"
            label="Password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="new-password"
          />
          <PasswordStrengthMeter password={password} />
        </div>
        <PasswordInput
          id="signup-confirm"
          label="Confirm Password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <div>
          <Checkbox id="agree-terms" checked={agree} onChange={setAgree}>
            I agree to the{' '}
            <a href="/policy.html" className="underline" style={{ color: '#C9A36B' }}>
              Terms &amp; Privacy Policy
            </a>
            .
          </Checkbox>
          {errors.agree && <p className="field-error">{errors.agree}</p>}
        </div>

        <PrimaryButton type="submit" loading={submitting}>
          {submitting ? 'Creating Account…' : 'Create Account'}
        </PrimaryButton>
      </form>

      <p className="text-center text-xs mt-8" style={{ color: 'rgba(239,224,205,0.6)' }}>
        Already have an account?{' '}
        <Link to="/login" className="font-bold" style={{ color: '#C9A36B' }}>
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}
