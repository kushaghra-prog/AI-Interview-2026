import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { updateProfile } from '../features/auth/authSlice';

const card = {
  background: 'linear-gradient(145deg, #1a2540, #1e2d42)',
  border: '1px solid #2d3f56',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
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

const Profile = () => {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state) => state.auth);
  const [focusedField, setFocusedField] = useState('');

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    preferredRole: user?.preferredRole || '',
    password: '',
    confirmPassword: '',
  });

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const onChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters'); return;
    }
    const data = { name: formData.name, preferredRole: formData.preferredRole };
    if (formData.password) data.password = formData.password;
    try {
      await dispatch(updateProfile(data)).unwrap();
      toast.success('Profile updated!');
      setFormData((p) => ({ ...p, password: '', confirmPassword: '' }));
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Update failed'); }
  };

  const getInputStyle = (name) => ({
    ...inputStyle,
    borderColor: focusedField === name ? '#14b8a6' : '#2d3f56',
    boxShadow: focusedField === name ? '0 0 0 3px rgba(20,184,166,0.15)' : 'none',
  });

  return (
    <div style={{ width: '100%', padding: '32px 40px', minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', marginBottom: '24px' }}>My Profile</h1>

        {/* Profile Card */}
        <div style={{ ...card, padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #14b8a6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: '#fff', boxShadow: '0 4px 16px rgba(20,184,166,0.3)', flexShrink: 0 }}>
              {getInitials(user?.name)}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', marginBottom: '2px' }}>{user?.name}</h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>{user?.email}</p>
              {user?.preferredRole && (
                <span style={{ display: 'inline-block', fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(20,184,166,0.12)', color: '#14b8a6', border: '1px solid rgba(20,184,166,0.25)', fontWeight: '500' }}>
                  {user.preferredRole}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div style={{ ...card, padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9', marginBottom: '20px' }}>Edit Profile</h3>
          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={onChange} required
                style={getInputStyle('name')}
                onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField('')} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={formData.email} disabled
                style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Preferred Role</label>
              <input type="text" name="preferredRole" value={formData.preferredRole} onChange={onChange}
                placeholder="e.g. Full Stack Developer"
                style={getInputStyle('preferredRole')}
                onFocus={() => setFocusedField('preferredRole')} onBlur={() => setFocusedField('')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>New Password</label>
                <input type="password" name="password" value={formData.password} onChange={onChange}
                  placeholder="Leave blank to keep"
                  style={getInputStyle('password')}
                  onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField('')} />
              </div>
              <div>
                <label style={labelStyle}>Confirm</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={onChange}
                  placeholder="Confirm"
                  style={getInputStyle('confirmPassword')}
                  onFocus={() => setFocusedField('confirmPassword')} onBlur={() => setFocusedField('')} />
              </div>
            </div>
            <button type="submit" disabled={isLoading}
              style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #14b8a6, #0d9488)', color: '#fff', fontSize: '14px', fontWeight: '600', borderRadius: '12px', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, boxShadow: '0 4px 14px rgba(20,184,166,0.3)' }}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
