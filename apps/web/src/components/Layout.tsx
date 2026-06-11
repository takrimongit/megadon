import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { getAuthInstance } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

const NAV = [
  { to: '/', icon: '📊', label: 'Dashboard', end: true },
  { to: '/campaigns/new', icon: '✨', label: 'New Campaign' },
  { to: '/batches', icon: '🗂️', label: 'Batches' },
  { to: '/analytics', icon: '📈', label: 'Learn' },
  { to: '/brand', icon: '🎨', label: 'Brand Playbook' },
  { to: '/geek', icon: '🧠', label: 'Geek Mode' },
  { to: '/usage', icon: '⚡', label: 'Usage' },
];

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="mark">A</div>
          <div className="name">AdForge AI</div>
        </div>
        <nav className="col" style={{ gap: 2 }}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer col" style={{ gap: 2 }}>
          <div className="nav-item" style={{ cursor: 'default' }}>
            <span className="icon">👤</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12.5 }}>
              {user?.email}
            </span>
          </div>
          <button
            className="nav-item"
            onClick={async () => {
              await signOut(getAuthInstance());
              navigate('/auth');
            }}
          >
            <span className="icon">🚪</span>
            Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
