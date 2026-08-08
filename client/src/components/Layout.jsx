import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-sea text-white' : 'text-ink hover:bg-mist'
  }`;

export default function Layout({ children }) {
  const { user, logout, isHr } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-mist/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="font-display text-xl text-sea">PulseReview</p>
            <p className="text-xs text-slate">
              {user?.company?.name || 'Performance Feedback'}
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/feedback/received" className={linkClass}>
              My Feedback
            </NavLink>
            <NavLink to="/feedback/to-give" className={linkClass}>
              Team Feedback
            </NavLink>
            <NavLink to="/performance" className={linkClass}>
              My Performance
            </NavLink>
            {isHr && (
              <NavLink to="/hr" className={linkClass}>
                HR Dashboard
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs capitalize text-slate">{user?.role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-mist px-3 py-1.5 text-sm hover:bg-mist"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
