import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, reset } from '../features/auth/authSlice';

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);

  const onLogout = () => {
    dispatch(logout()); dispatch(reset());
    setIsProfileOpen(false); setIsMenuOpen(false);
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;
  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  const navLink = (path, label) => (
    <Link to={path} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(path) ? 'text-teal-400 bg-teal-400/10' : 'text-slate-400 hover:text-white'}`}>
      {label}
    </Link>
  );

  return (
    <header style={{ background: '#0a0f1a', borderBottom: '1px solid #1a2540', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ width: '100%', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '56px' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: '18px', height: '18px', color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.3px' }}>AI<span style={{ color: '#14b8a6' }}> Interview</span></span>
            <span style={{ display: 'block', fontSize: '9px', color: '#475569', letterSpacing: '2px', marginTop: '-2px' }}>2026</span>
          </div>
        </Link>

        {/* Center Nav */}
        <nav className="hidden md:flex" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {user ? <>{navLink('/', 'Dashboard')}{navLink('/profile', 'Profile')}</> : <>{navLink('/login', 'Login')}{navLink('/register', 'Register')}</>}
        </nav>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 8px 4px 12px', borderRadius: '12px', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                className="hover:bg-white/5">
                <span className="hidden sm:block" style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>{user.name}</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #14b8a6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff' }}>
                  {getInitials(user.name)}
                </div>
              </button>
              {isProfileOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setIsProfileOpen(false)}/>
                  <div style={{ position: 'absolute', right: 0, marginTop: '8px', width: '220px', background: '#141d2e', border: '1px solid #2d3f56', borderRadius: '14px', padding: '6px', zIndex: 50, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e2d42', marginBottom: '4px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{user.name}</p>
                      <p style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                    </div>
                    <Link to="/profile" onClick={() => setIsProfileOpen(false)}
                      style={{ display: 'flex', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', color: '#cbd5e1', textDecoration: 'none', transition: 'background 0.15s' }}
                      className="hover:bg-white/5">My Profile</Link>
                    <button onClick={onLogout}
                      style={{ width: '100%', display: 'flex', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                      className="hover:bg-red-500/10">Sign Out</button>
                  </div>
                </>
              )}
            </div>
          )}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden" style={{ padding: '8px', borderRadius: '8px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {isMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/> : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile */}
      {isMenuOpen && (
        <div className="md:hidden" style={{ padding: '8px 40px 16px', borderTop: '1px solid #1a2540' }}>
          {user ? (
            <>
              <Link to="/" onClick={() => setIsMenuOpen(false)} style={{ display: 'block', padding: '10px 14px', borderRadius: '10px', fontSize: '14px', color: isActive('/') ? '#14b8a6' : '#94a3b8', textDecoration: 'none', fontWeight: '500' }}>Dashboard</Link>
              <Link to="/profile" onClick={() => setIsMenuOpen(false)} style={{ display: 'block', padding: '10px 14px', borderRadius: '10px', fontSize: '14px', color: isActive('/profile') ? '#14b8a6' : '#94a3b8', textDecoration: 'none', fontWeight: '500' }}>Profile</Link>
              <button onClick={onLogout} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: '10px', fontSize: '14px', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setIsMenuOpen(false)} style={{ display: 'block', padding: '10px 14px', borderRadius: '10px', fontSize: '14px', color: '#94a3b8', textDecoration: 'none' }}>Login</Link>
              <Link to="/register" onClick={() => setIsMenuOpen(false)} style={{ display: 'block', padding: '10px 14px', borderRadius: '10px', fontSize: '14px', color: '#94a3b8', textDecoration: 'none' }}>Register</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;