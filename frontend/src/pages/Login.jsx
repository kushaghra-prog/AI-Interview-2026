import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { GoogleLogin } from '@react-oauth/google';
import { login, googleLogin, reset } from '../features/auth/authSlice';

const cardStyle = {
  background: 'linear-gradient(145deg, #1a2540, #1e2d42)',
  border: '1px solid #2d3f56',
  borderRadius: '20px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
  padding: '40px',
  width: '100%',
  maxWidth: '420px',
};

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  background: '#0c1222',
  border: '1px solid #2d3f56',
  borderRadius: '12px',
  color: '#f1f5f9',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '600',
  color: '#94a3b8',
  marginBottom: '8px',
};

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState('');

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isLoading, isError, isSuccess, message } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isError) toast.error(message);
    if (isSuccess || user) navigate('/');
    dispatch(reset());
  }, [user, isError, isSuccess, message, navigate, dispatch]);

  const onChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((p) => ({ ...p, [e.target.name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!formData.email.trim()) e.email = 'Email is required';
    if (!formData.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (validate()) dispatch(login(formData));
  };

  const getInputStyle = (name) => ({
    ...inputStyle,
    borderColor: errors[name] ? '#ef4444' : focusedField === name ? '#14b8a6' : '#2d3f56',
    boxShadow: focusedField === name ? '0 0 0 3px rgba(20,184,166,0.15)' : 'none',
  });

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #14b8a6, #0d9488)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 4px 16px rgba(20,184,166,0.3)' }}>
            <svg style={{ width: '28px', height: '28px', color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: '700', color: '#f1f5f9', marginBottom: '6px' }}>Welcome Back</h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Sign in to continue your AI interview practice</p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={onChange}
              placeholder="you@example.com"
              style={getInputStyle('email')}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField('')} />
            {errors.email && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>{errors.email}</p>}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Password</label>
            <input type="password" name="password" value={formData.password} onChange={onChange}
              placeholder="Enter your password"
              style={getInputStyle('password')}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField('')} />
            {errors.password && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>{errors.password}</p>}
          </div>

          <button type="submit" disabled={isLoading}
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #14b8a6, #0d9488)', color: '#fff', fontSize: '15px', fontWeight: '600', borderRadius: '12px', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(20,184,166,0.3)' }}>
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }}/>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#2d3f56' }}/>
          <span style={{ padding: '0 14px', fontSize: '12px', color: '#64748b' }}>or continue with</span>
          <div style={{ flex: 1, height: '1px', background: '#2d3f56' }}/>
        </div>

        {/* Google */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={(r) => r?.credential && dispatch(googleLogin(r.credential))}
            onError={() => toast.error('Google Sign-In failed')}
            theme="filled_black" shape="rectangular" size="large" text="signin_with" width="340"
          />
        </div>

        <p style={{ marginTop: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#14b8a6', fontWeight: '600', textDecoration: 'none' }}>Create one</Link>
        </p>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Login;
