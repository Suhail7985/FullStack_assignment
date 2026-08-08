import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_PASSWORD = 'Password123!';

const DEMO_ACCOUNTS = [
  {
    label: 'Give feedback',
    hint: 'Manager submits scores for their team',
    email: 'priya@ashoka.test',
    detail: 'Priya → 6 employees (Ashoka)',
  },
  {
    label: 'Give feedback',
    hint: 'Multi-level hierarchy',
    email: 'rohan@ashoka.test',
    detail: 'Rohan → Priya',
  },
  {
    label: 'Give feedback',
    hint: 'Flat org, no middle manager',
    email: 'founder@brightpath.test',
    detail: 'Founder → 8 employees (Bright Path)',
  },
  {
    label: 'View feedback',
    hint: 'See received reviews & history',
    email: 'employee1@ashoka.test',
    detail: 'Employee performance over months',
  },
  {
    label: 'HR tracking',
    hint: 'Who submitted / who is pending',
    email: 'hr@ashoka.test',
    detail: 'Kavita — Ashoka HR dashboard',
  },
];

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={['hr', 'admin'].includes(user.role) ? '/hr' : '/dashboard'} replace />;
  }

  function useDemoAccount(demoEmail) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedIn = await login(email.trim(), password);
      navigate(['hr', 'admin'].includes(loggedIn.role) ? '/hr' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <p className="font-display text-4xl text-sea">PulseReview</p>
          <p className="mt-2 text-slate">Monthly performance feedback for every team</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-mist bg-white/90 p-6 shadow-sm"
        >
          <h1 className="mb-4 text-lg font-semibold">Sign in</h1>

          {error && (
            <div className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <label className="mb-3 block text-sm">
            <span className="mb-1 block text-slate">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-mist px-3 py-2 outline-none focus:border-sea"
              placeholder="you@company.test"
            />
          </label>

          <label className="mb-5 block text-sm">
            <span className="mb-1 block text-slate">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-mist px-3 py-2 outline-none focus:border-sea"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-sea px-4 py-2.5 font-medium text-white hover:bg-sea-dark disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="mt-5 rounded-lg border border-mist bg-paper/80 p-4">
            <p className="text-sm font-medium text-ink">Demo accounts</p>
            <p className="mt-1 text-xs text-slate">
              Password for all:{' '}
              <code className="rounded bg-mist px-1.5 py-0.5">{DEMO_PASSWORD}</code>
              <span className="text-slate"> — click a row to fill the form</span>
            </p>

            <ul className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    onClick={() => useDemoAccount(account.email)}
                    className="flex w-full items-start justify-between gap-3 rounded-md border border-transparent px-2 py-2 text-left transition hover:border-sea/30 hover:bg-sea/5"
                  >
                    <span>
                      <span className="block text-xs font-semibold uppercase tracking-wide text-sea">
                        {account.label}
                      </span>
                      <span className="mt-0.5 block text-sm text-ink">{account.detail}</span>
                      <span className="block text-xs text-slate">{account.hint}</span>
                    </span>
                    <code className="shrink-0 rounded bg-mist px-1.5 py-0.5 text-xs text-ink">
                      {account.email}
                    </code>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}
