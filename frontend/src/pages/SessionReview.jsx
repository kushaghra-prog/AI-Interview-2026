import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getSessionById } from '../sessions/sessionSlice';

const card = {
  background: 'linear-gradient(145deg, #1a2540, #1e2d42)',
  border: '1px solid #2d3f56',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
};

const SessionReview = () => {
  const { sessionId } = useParams();
  const dispatch = useDispatch();
  const { activeSession, isLoading, isError, message } = useSelector((state) => state.session);
  const [expandedQ, setExpandedQ] = useState(null);

  useEffect(() => { if (sessionId) dispatch(getSessionById(sessionId)); }, [dispatch, sessionId]);

  if (isLoading) return (
    <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #2d3f56', borderTopColor: '#14b8a6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (isError || !activeSession) return (
    <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <h2 style={{ color: '#f1f5f9', fontSize: '20px' }}>{isError ? message : 'Session Not Found'}</h2>
      <Link to="/" style={{ color: '#14b8a6', textDecoration: 'none', fontSize: '14px' }}>← Back to Dashboard</Link>
    </div>
  );

  const { role, level, status, overallScore = 0, metrics = {}, questions = [], startTime, endTime, interviewType } = activeSession;
  const techScore = metrics?.avgTechnicalScore || 0;
  const confScore = metrics?.avgConfidenceScore || 0;

  const getDuration = () => {
    if (!startTime || !endTime) return 'N/A';
    const diff = Math.floor((new Date(endTime) - new Date(startTime)) / 1000);
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}m ${s}s`;
  };

  const scoreColor = (s) => s >= 70 ? '#34d399' : s >= 40 ? '#fbbf24' : '#f87171';
  const circ = 2 * Math.PI * 54;
  const offset = circ - (circ * overallScore) / 100;

  const statCards = [
    { label: 'OVERALL', value: `${overallScore}%`, color: scoreColor(overallScore), hasRing: true },
    { label: 'TECHNICAL', value: `${techScore}%`, color: '#14b8a6' },
    { label: 'CONFIDENCE', value: `${confScore}%`, color: '#a78bfa' },
    { label: 'DURATION', value: getDuration(), color: '#60a5fa' },
  ];

  return (
    <div style={{ width: '100%', padding: '32px 40px', minHeight: 'calc(100vh - 56px)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#14b8a6', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Assessment Complete</span>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#f1f5f9', marginBottom: '4px' }}>
            {(role || 'Interview').toUpperCase()} <span style={{ color: '#64748b', fontWeight: '400' }}>({level})</span>
          </h1>
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#94a3b8', marginTop: '8px', flexWrap: 'wrap' }}>
            <span>{interviewType}</span>
            <span>•</span>
            <span>{questions.length} Questions</span>
            <span>•</span>
            <span>{startTime ? new Date(startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
            <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', background: status === 'completed' ? '#064e3b' : '#7f1d1d', color: status === 'completed' ? '#34d399' : '#f87171' }}>
              {status?.toUpperCase()}
            </span>
          </div>
        </div>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#1a2540', border: '1px solid #2d3f56', borderRadius: '12px', color: '#cbd5e1', fontSize: '14px', textDecoration: 'none', fontWeight: '500' }}>
          ← Dashboard
        </Link>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {statCards.map((s) => (
          <div key={s.label} style={{ ...card, padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: '24px', right: '24px', height: '3px', background: `linear-gradient(90deg, ${s.color}, transparent)` }}/>
            {s.hasRing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', letterSpacing: '1px', marginBottom: '16px' }}>{s.label}</span>
                <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                  <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#1a2540" strokeWidth="8"/>
                    <circle cx="60" cy="60" r="54" fill="none" stroke={s.color} strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease-out' }}/>
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '28px', fontWeight: '800', color: s.color }}>{s.value}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', letterSpacing: '1px', marginBottom: '16px', display: 'block' }}>{s.label}</span>
                <span style={{ fontSize: '32px', fontWeight: '800', color: s.color }}>{s.value}</span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Question Performance Bars ── */}
      <div style={{ ...card, padding: '28px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px' }}>Question Performance</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '160px' }}>
          {questions.map((q, i) => {
            const score = q.technicalScore || 0;
            const h = Math.max(score * 10, 4);
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: scoreColor(score * 10), fontWeight: '600' }}>{score}</span>
                <div style={{ width: '100%', maxWidth: '40px', height: `${h}%`, background: `linear-gradient(180deg, ${scoreColor(score * 10)}, ${scoreColor(score * 10)}80)`, borderRadius: '6px 6px 0 0', transition: 'height 0.5s', minHeight: '4px' }}/>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Q{i + 1}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Detailed Review ── */}
      <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9', marginBottom: '16px' }}>Detailed Review</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {questions.map((q, i) => (
          <div key={i} style={{ ...card, overflow: 'hidden' }}>
            {/* Question Header */}
            <div onClick={() => setExpandedQ(expandedQ === i ? null : i)}
              style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ color: '#14b8a6', fontWeight: '700', fontSize: '16px' }}>Q{i + 1}.</span>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: q.questiontype === 'coding' ? '#312e81' : '#1a2540', color: q.questiontype === 'coding' ? '#a78bfa' : '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {q.questiontype || 'oral'}
                  </span>
                </div>
                <p style={{ fontSize: '15px', color: '#f1f5f9', lineHeight: '1.5' }}>{q.questionText}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <div style={{ textAlign: 'center', padding: '6px 12px', background: '#0c1222', borderRadius: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Tech</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: scoreColor((q.technicalScore || 0) * 10) }}>{q.technicalScore || 0}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '6px 12px', background: '#0c1222', borderRadius: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Conf</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: scoreColor((q.confidencescore || 0) * 10) }}>{q.confidencescore || 0}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"
                  style={{ transition: 'transform 0.2s', transform: expandedQ === i ? 'rotate(180deg)' : 'rotate(0)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedQ === i && (
              <div style={{ padding: '0 24px 24px', borderTop: '1px solid #2d3f56' }}>
                {/* Your Answer */}
                <div style={{ marginTop: '20px' }}>
                  <h5 style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>Your Answer</h5>
                  <div style={{ padding: '16px', background: '#0c1222', borderRadius: '10px', border: '1px solid #2d3f56', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontFamily: q.userSubmittedcode ? 'monospace' : 'inherit' }}>
                    {q.userSubmittedcode || q.userAnswer || <span style={{ color: '#475569', fontStyle: 'italic' }}>No answer provided.</span>}
                  </div>
                </div>

                {/* AI Feedback */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h5 style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>AI Assessment</h5>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#14b8a6', fontWeight: '600' }}>Accuracy: {(q.technicalScore || 0) * 10}%</span>
                      <span style={{ fontSize: '12px', color: '#a78bfa', fontWeight: '600' }}>Confidence: {(q.confidencescore || 0) * 10}%</span>
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: '#0f1a2e', borderRadius: '10px', border: '1px solid #1e3a5f', fontSize: '14px', color: '#cbd5e1', lineHeight: '1.7' }}>
                    {q.aiFeedback || 'No feedback available.'}
                  </div>
                </div>

                {/* Ideal Answer */}
                {q.idealAnswer && (
                  <div style={{ marginTop: '16px' }}>
                    <h5 style={{ fontSize: '12px', fontWeight: '700', color: '#34d399', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>Ideal Answer</h5>
                    <div style={{ padding: '16px', background: '#0a1f14', borderRadius: '10px', border: '1px solid #065f46', fontSize: '13px', color: '#a7f3d0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {q.idealAnswer}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {questions.length === 0 && (
        <div style={{ ...card, padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#64748b' }}>No questions recorded for this session.</p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default SessionReview;
