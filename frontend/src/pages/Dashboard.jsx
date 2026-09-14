import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { getSessions, createSession, deleteSession, reset } from '../sessions/sessionSlice';

/* ── Inline styles that MUST render ── */
const cardStyle = {
  background: 'linear-gradient(145deg, #1a2540, #1e2d42)',
  border: '1px solid #2d3f56',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
};
const cardHoverStyle = {
  ...cardStyle,
  cursor: 'pointer',
};
const inputStyle = {
  background: '#0c1222',
  border: '1px solid #2d3f56',
  borderRadius: '12px',
  color: '#fff',
  padding: '12px 16px',
  width: '100%',
  outline: 'none',
  fontSize: '14px',
  transition: 'border-color 0.2s',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { session, isLoading, isError, message } = useSelector((state) => state.session);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    role: user?.preferredRole || '',
    level: 'Junior',
    interviewType: 'Oral-only',
    count: 5,
  });

  useEffect(() => {
    dispatch(getSessions());
    return () => { dispatch(reset()); };
  }, [dispatch]);

  useEffect(() => { if (isError) toast.error(message); }, [isError, message]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') setIsModalOpen(false); };
    if (isModalOpen) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isModalOpen]);

  const sessionsList = Array.isArray(session) ? [...session].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];

  const stats = { total: 0, completed: 0, avgScore: 0, inProgress: 0 };
  if (Array.isArray(session)) {
    stats.total = session.length;
    const comp = session.filter((s) => s.status === 'completed');
    stats.completed = comp.length;
    stats.inProgress = session.filter((s) => s.status === 'in-progress' || s.status === 'pending').length;
    if (comp.length > 0) stats.avgScore = Math.round(comp.reduce((a, c) => a + (c.overallScore || 0), 0) / comp.length);
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: name === 'count' ? parseInt(value) : value }));
  };

  const handleStart = async (e) => {
    e.preventDefault();
    try {
      const s = await dispatch(createSession(formData)).unwrap();
      setIsModalOpen(false);
      navigate(`/interview/${s.sessionId || s._id}`);
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to create session'); }
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this session?')) dispatch(deleteSession(id));
  };

  const handleClick = (s) => {
    if (s.status === 'completed') navigate(`/review/${s._id}`);
    else navigate(`/interview/${s._id}`);
  };

  const statusColors = {
    completed: { bg: '#064e3b', color: '#34d399', border: '#065f46' },
    'in-progress': { bg: '#78350f', color: '#fbbf24', border: '#92400e' },
    pending: { bg: '#1e3a5f', color: '#60a5fa', border: '#1e40af' },
    failed: { bg: '#7f1d1d', color: '#f87171', border: '#991b1b' },
  };

  const statData = [
    { label: 'Total Interviews', value: stats.total, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',
      d: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6' },
    { label: 'Completed', value: stats.completed, color: '#34d399', bg: 'rgba(52,211,153,0.12)',
      d: 'M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01l-3-3' },
    { label: 'Average Score', value: `${stats.avgScore}%`, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)',
      d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
    { label: 'In Progress', value: stats.inProgress, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',
      d: 'M12 2a10 10 0 100 20 10 10 0 000-20z M12 6v6l4 2' },
  ];

  return (
    <div style={{ width: '100%', padding: '32px 40px', minHeight: 'calc(100vh - 56px)' }}>

      {/* ── Welcome ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>
            Welcome back, <span style={{ background: 'linear-gradient(90deg, #2dd4bf, #22d3ee, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.name || 'Developer'}</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '15px' }}>Ready to ace your next technical interview?</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Interview
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statData.map((s) => (
          <div key={s.label} style={{ ...cardStyle, padding: '24px', position: 'relative', overflow: 'hidden' }}>
            {/* Colored accent line at top */}
            <div style={{ position: 'absolute', top: 0, left: '24px', right: '24px', height: '3px', background: `linear-gradient(90deg, ${s.color}, transparent)`, borderRadius: '0 0 4px 4px' }}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>{s.label}</span>
              <div style={{ background: s.bg, padding: '10px', borderRadius: '12px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={s.d}/>
                </svg>
              </div>
            </div>
            <p style={{ fontSize: '36px', fontWeight: '800', color: s.color, textShadow: `0 0 30px ${s.color}20` }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Recent Sessions ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9' }}>Recent Sessions</h2>
        {sessionsList.length > 0 && <span style={{ fontSize: '13px', color: '#64748b' }}>{sessionsList.length} session{sessionsList.length !== 1 ? 's' : ''}</span>}
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {[1,2,3].map(i => <div key={i} style={{ ...cardStyle, height: '200px', opacity: 0.5 }} className="animate-pulse"/>)}
        </div>
      ) : sessionsList.length === 0 ? (
        <div style={{ ...cardStyle, padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#243447', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#f1f5f9', marginBottom: '8px' }}>No Interviews Yet</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px', maxWidth: '380px', margin: '0 auto 24px' }}>
            Start your first AI-powered mock interview and get detailed feedback on your technical skills.
          </p>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>Start Your First Interview</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {sessionsList.map((s) => {
            const sc = statusColors[s.status] || statusColors.pending;
            return (
              <div key={s._id} style={cardHoverStyle} className="group hover:-translate-y-0.5 transition-all duration-300"
                onClick={() => handleClick(s)}>
                <div style={{ padding: '24px' }}>
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '999px', background: '#243447', color: '#94a3b8', fontWeight: '500' }}>
                      {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '999px', background: sc.bg + '25', color: sc.color, border: `1px solid ${sc.border}40`, fontWeight: '600' }}>
                      {s.status?.charAt(0).toUpperCase() + s.status?.slice(1)}
                    </span>
                  </div>
                  {/* Content */}
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.role || 'Software Engineer'}</h3>
                  <p style={{ fontSize: '14px', color: '#2dd4bf', fontWeight: '500', marginBottom: '6px' }}>{s.level}</p>
                  <span style={{ display: 'inline-block', fontSize: '12px', padding: '4px 10px', borderRadius: '8px', background: '#243447', color: '#cbd5e1', marginBottom: '16px' }}>{s.interviewType}</span>
                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #2d3f56' }}>
                    {s.status === 'completed' ? (
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Score</span>
                        <span style={{ fontSize: '22px', fontWeight: '800', color: '#2dd4bf' }}>{s.overallScore || 0}%</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Continue →</span>
                    )}
                    <button onClick={(e) => handleDelete(e, s._id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ fontSize: '12px', color: '#f87171', padding: '4px 10px', borderRadius: '8px', background: 'rgba(248,113,113,0.08)', border: 'none', cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Placeholder cards */}
          {sessionsList.length < 3 && Array.from({ length: 3 - sessionsList.length }).map((_, i) => (
            <div key={`ph-${i}`} style={{ border: '2px dashed #243447', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '220px', cursor: 'pointer', transition: 'border-color 0.2s' }}
              className="hover:border-[#3b4f66]"
              onClick={() => setIsModalOpen(true)}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1a2540', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Start a new interview</p>
              <p style={{ fontSize: '12px', color: '#14b8a6', fontWeight: '500' }}>+ New Interview</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setIsModalOpen(false)}>
          <div style={{ ...cardStyle, padding: '32px', width: '100%', maxWidth: '440px', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}>
            <button style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              onClick={() => setIsModalOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', marginBottom: '24px' }}>Start New Interview</h2>
            <form onSubmit={handleStart}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px' }}>Target Role</label>
                <input type="text" name="role" value={formData.role} onChange={onChange} placeholder="e.g. Frontend Developer" required style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#14b8a6'} onBlur={(e) => e.target.style.borderColor = '#2d3f56'}/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px' }}>Level</label>
                  <select name="level" value={formData.level} onChange={onChange} style={{ ...inputStyle, appearance: 'none' }}>
                    <option value="Junior">Junior</option>
                    <option value="Mid-Level">Mid-Level</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px' }}>Type</label>
                  <select name="interviewType" value={formData.interviewType} onChange={onChange} style={{ ...inputStyle, appearance: 'none' }}>
                    <option value="Oral-only">Oral Only</option>
                    <option value="coding-mixed">Coding + Oral</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px' }}>Questions (3–15)</label>
                <input type="number" name="count" value={formData.count} onChange={onChange} min="3" max="15" required style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#14b8a6'} onBlur={(e) => e.target.style.borderColor = '#2d3f56'}/>
              </div>
              <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #2d3f56' }}>
                <button type="button" onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#243447', color: '#cbd5e1', border: '1px solid #2d3f56', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '14px' }}>
                  Start Interview
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
