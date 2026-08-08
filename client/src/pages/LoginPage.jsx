import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
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

          <p className="mt-4 text-xs leading-relaxed text-slate">
            Demo password: <code className="rounded bg-mist px-1">Password123!</code>
            <br />
            Try <code className="rounded bg-mist px-1">priya@ashoka.test</code> or{' '}
            <code className="rounded bg-mist px-1">hr@ashoka.test</code>
          </p>
        </form>
      </div>
    </div>
  );
}
