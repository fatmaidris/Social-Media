import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getDisplayName } from '../utils/apiData.js';
import UserAvatar from './UserAvatar.jsx';
import { House, KeyRound, UserRound } from 'lucide-react';

export default function AppLayout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="side-rail">
        <NavLink className="wordmark app-wordmark" to="/" aria-label="Commonplace home"><span className="brand-mark">C</span> commonplace</NavLink>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><House className="nav-icon" aria-hidden="true" /> Home</NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><UserRound className="nav-icon" aria-hidden="true" /> Profile</NavLink>
          <NavLink to="/settings/password" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><KeyRound className="nav-icon" aria-hidden="true" /> Password</NavLink>
        </nav>
        <div className="rail-account">
          <UserAvatar person={profile} />
          <span className="account-name">{getDisplayName(profile)}</span>
          <button className="icon-text-button" type="button" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <div className="mobile-header"><NavLink className="wordmark" to="/"><span className="brand-mark">C</span> commonplace</NavLink><button type="button" onClick={signOut}>Sign out</button></div>
      <main className="app-main"><Outlet /></main>
      <nav className="mobile-nav" aria-label="Main navigation">
        <NavLink to="/" end><House className="nav-icon" aria-hidden="true" />Home</NavLink>
        <NavLink to="/profile"><UserRound className="nav-icon" aria-hidden="true" />Profile</NavLink>
        <NavLink to="/settings/password"><KeyRound className="nav-icon" aria-hidden="true" />Settings</NavLink>
      </nav>
    </div>
  );
}