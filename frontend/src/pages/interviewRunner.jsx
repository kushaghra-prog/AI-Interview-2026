import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { getSessionById, submitAnswer, endSession, reset } from '../sessions/sessionSlice';
import Editor from '@monaco-editor/react';
import { toast } from 'react-toastify';

const card = {
  background: 'linear-gradient(145deg, #1a2540, #1e2d42)',
  border: '1px solid #2d3f56',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
};

const InterviewRunner = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { activeSession, isLoading, isError, message } = useSelector((state) => state.session);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [codeAnswers, setCodeAnswers] = useState({});
  const [textAnswers, setTextAnswers] = useState({});
  const [audioBlobs, setAudioBlobs] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEndModal, setShowEndModal] = useState(false);
  const [language, setLanguage] = useState('javascript');
  const [isEvaluating, setIsEvaluating] = useState(false);

  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    dispatch(getSessionById(sessionId));
    return () => { dispatch(reset()); };
  }, [sessionId, dispatch]);

  // Poll for questions if pending
  useEffect(() => {
    if (!activeSession) return;
    const needsPoll = activeSession.status === 'pending' || 
      (activeSession.questions && activeSession.questions.length === 0);
    if (!needsPoll) return;
    const interval = setInterval(() => { dispatch(getSessionById(sessionId)); }, 3000);
    return () => clearInterval(interval);
  }, [activeSession?.status, activeSession?.questions?.length, sessionId, dispatch]);

  useEffect(() => {
    if (activeSession?.status === 'completed') navigate(`/review/${activeSession._id}`);
  }, [activeSession, navigate]);

  useEffect(() => {
    return () => { stopRecording(); };
  }, []);

  const currentQuestion = activeSession?.questions?.[currentQuestionIndex];
  const totalQuestions = activeSession?.questions?.length || 0;
  const progress = totalQuestions > 0 ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100) : 0;
  const isCoding = currentQuestion?.questiontype === 'coding';
  const isEvaluated = currentQuestion?.isEvaluated;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlobs((prev) => ({ ...prev, [currentQuestionIndex]: blob }));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch { toast.error('Failed to access microphone.'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleNext = () => { if (currentQuestionIndex < totalQuestions - 1) { setCurrentQuestionIndex((p) => p + 1); stopRecording(); } };
  const handlePrev = () => { if (currentQuestionIndex > 0) { setCurrentQuestionIndex((p) => p - 1); stopRecording(); } };

  const handleSubmitAnswer = async () => {
    setIsEvaluating(true);
    const formData = new FormData();
    formData.append('questionIndex', currentQuestionIndex);
    if (isCoding && codeAnswers[currentQuestionIndex]) formData.append('code', codeAnswers[currentQuestionIndex]);
    if (textAnswers[currentQuestionIndex]) formData.append('textAnswer', textAnswers[currentQuestionIndex]);
    if (audioBlobs[currentQuestionIndex]) formData.append('audio', audioBlobs[currentQuestionIndex], 'answer.webm');
    try {
      await dispatch(submitAnswer({ sessionId, formData })).unwrap();
      toast.success('Answer submitted! Evaluating...');
      // Poll for evaluation result
      const pollInterval = setInterval(async () => {
        const result = await dispatch(getSessionById(sessionId)).unwrap();
        const q = result?.questions?.[currentQuestionIndex];
        if (q?.isEvaluated) {
          clearInterval(pollInterval);
          setIsEvaluating(false);
          toast.success('AI evaluation complete!');
        }
      }, 3000);
      // Stop polling after 2 minutes max
      setTimeout(() => { clearInterval(pollInterval); setIsEvaluating(false); }, 120000);
    } catch (err) { toast.error(err || 'Failed to submit.'); setIsEvaluating(false); }
  };

  const handleEndInterview = async () => {
    try { await dispatch(endSession(sessionId)).unwrap(); navigate(`/review/${sessionId}`); }
    catch { toast.error('Failed to end interview.'); }
  };

  /* ── Loading / Pending / Not Found ── */
  if (isLoading && !activeSession) return (
    <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #2d3f56', borderTopColor: '#14b8a6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '16px' }}/>
      <h2 style={{ color: '#14b8a6', fontSize: '18px', fontWeight: '600' }}>Loading Session...</h2>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (activeSession?.status === 'pending' || (activeSession && totalQuestions === 0)) return (
    <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '48px', height: '48px', border: '3px solid #2d3f56', borderTopColor: '#14b8a6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '16px' }}/>
      <h2 style={{ color: '#14b8a6', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Generating Questions...</h2>
      <p style={{ color: '#64748b', fontSize: '14px' }}>AI is preparing your interview questions</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!activeSession) return (
    <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <h2 style={{ color: '#f1f5f9', fontSize: '18px', marginTop: '16px' }}>Session not found.</h2>
    </div>
  );

  return (
    <div style={{ width: '100%', padding: '24px 40px', minHeight: 'calc(100vh - 56px)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#14b8a6', marginBottom: '4px' }}>Interview Session</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>Role: {activeSession.role} | Level: {activeSession.level}</p>
        </div>
        <button onClick={() => setShowEndModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          End Interview
        </button>
      </div>

      {/* ── Progress ── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
          <span style={{ color: '#14b8a6', fontWeight: '600' }}>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          <span style={{ color: '#64748b' }}>{progress}%</span>
        </div>
        <div style={{ height: '6px', background: '#1a2540', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #14b8a6, #06b6d4)', borderRadius: '999px', transition: 'width 0.5s' }}/>
        </div>
      </div>

      {/* ── Question Card ── */}
      <div style={{ ...card, padding: '28px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: isCoding ? 'linear-gradient(90deg, #a78bfa, #818cf8)' : 'linear-gradient(90deg, #14b8a6, #06b6d4)' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: isCoding ? '#a78bfa' : '#14b8a6', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isCoding ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            )}
            Question {currentQuestionIndex + 1}
          </span>
          {isEvaluated && <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '999px', background: '#064e3b', color: '#34d399', fontWeight: '600' }}>Evaluated</span>}
          {currentQuestion?.issubmitted && !isEvaluated && <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '999px', background: '#78350f', color: '#fbbf24', fontWeight: '600' }}>Submitted</span>}
        </div>
        {(() => {
          const text = currentQuestion?.questionText || '';
          const parts = text.split('\n');
          const mainQuestion = parts[0];
          const details = parts.slice(1);
          return (
            <>
              <p style={{ fontSize: '18px', lineHeight: '1.7', color: '#f1f5f9', fontWeight: '400', marginBottom: details.length ? '16px' : '0' }}>
                {currentQuestionIndex + 1}. {mainQuestion}
              </p>
              {details.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {details.map((line, i) => {
                    const isExample = /^Example/i.test(line.trim());
                    const isConstraint = /^Constraint/i.test(line.trim());
                    return (
                      <div key={i} style={{
                        padding: '10px 14px',
                        background: '#0f172a',
                        borderLeft: `3px solid ${isConstraint ? '#f59e0b' : '#3b82f6'}`,
                        borderRadius: '0 8px 8px 0',
                        fontFamily: isExample ? "'Consolas', 'Monaco', monospace" : 'inherit',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: '#94a3b8',
                      }}>
                        {isExample ? (
                          line.trim().split(/\s*\|\s*/).map((part, j) => (
                            <div key={j}>
                              {part.split(/(Input:|Output:|Explanation:)/i).map((seg, k) =>
                                /^(Input|Output|Explanation):/i.test(seg)
                                  ? <span key={k} style={{ color: '#f1f5f9', fontWeight: '600' }}>{seg}</span>
                                  : <span key={k}>{seg}</span>
                              )}
                            </div>
                          ))
                        ) : (
                          <span>{line.trim()}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* ── Prev / Next ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={handlePrev} disabled={currentQuestionIndex === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#1a2540', border: '1px solid #2d3f56', borderRadius: '10px', color: currentQuestionIndex === 0 ? '#475569' : '#cbd5e1', fontSize: '13px', fontWeight: '500', cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer' }}>
          ← Prev
        </button>
        <div style={{ display: 'flex', gap: '6px' }}>
          {activeSession?.questions?.map((q, idx) => (
            <div key={idx} onClick={() => { setCurrentQuestionIndex(idx); stopRecording(); }}
              style={{ width: '10px', height: '10px', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s',
                background: idx === currentQuestionIndex ? '#14b8a6' : q.isEvaluated ? '#34d399' : q.issubmitted ? '#fbbf24' : '#2d3f56',
                boxShadow: idx === currentQuestionIndex ? '0 0 8px rgba(20,184,166,0.5)' : 'none',
              }}/>
          ))}
        </div>
        <button onClick={handleNext} disabled={currentQuestionIndex === totalQuestions - 1}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#1a2540', border: '1px solid #2d3f56', borderRadius: '10px', color: currentQuestionIndex === totalQuestions - 1 ? '#475569' : '#cbd5e1', fontSize: '13px', fontWeight: '500', cursor: currentQuestionIndex === totalQuestions - 1 ? 'not-allowed' : 'pointer' }}>
          Next →
        </button>
      </div>

      {/* ── Answer Area: Two columns ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isCoding ? '1fr 1fr' : '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

        {/* Voice Answer */}
        <div style={{ ...card, padding: '24px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px' }}>Voice Answer</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {!isEvaluated ? (
              <>
                <button onClick={isRecording ? stopRecording : startRecording}
                  style={{ width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${isRecording ? '#ef4444' : '#14b8a6'}`, background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(20,184,166,0.15)', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '12px' }}>
                  {isRecording ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={isRecording ? '#ef4444' : 'none'} stroke={isRecording ? '#ef4444' : '#14b8a6'} strokeWidth="2"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                  )}
                </button>
                <span style={{ fontSize: '28px', fontFamily: 'monospace', color: isRecording ? '#ef4444' : '#94a3b8', marginBottom: '8px' }}>{fmt(recordingTime)}</span>
                <p style={{ fontSize: '12px', color: '#64748b' }}>{isRecording ? 'Recording... click to stop' : 'Click to start recording'}</p>
                {audioBlobs[currentQuestionIndex] && !isRecording && (
                  <div style={{ marginTop: '16px', width: '100%' }}>
                    <audio controls src={URL.createObjectURL(audioBlobs[currentQuestionIndex])} style={{ width: '100%', height: '36px' }}/>
                    <button onClick={() => setAudioBlobs(prev => { const n = {...prev}; delete n[currentQuestionIndex]; return n; })}
                      style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8', background: '#1a2540', border: '1px solid #2d3f56', borderRadius: '8px', padding: '4px 12px', cursor: 'pointer' }}>
                      ↻ Re-record
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>Answer submitted</p>
            )}
          </div>
        </div>

        {/* Code / Text Answer */}
        <div style={{ ...card, padding: '24px', display: 'flex', flexDirection: 'column' }}>
          {isCoding ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>Code Implementation</h3>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={isEvaluated}
                  style={{ padding: '6px 12px', background: '#0c1222', border: '1px solid #2d3f56', borderRadius: '8px', color: '#cbd5e1', fontSize: '12px', outline: 'none' }}>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="typescript">TypeScript</option>
                </select>
              </div>
              <div style={{ flex: 1, minHeight: '280px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #2d3f56' }}>
                <Editor height="100%" theme="vs-dark" language={language}
                  value={codeAnswers[currentQuestionIndex] || currentQuestion?.userSubmittedcode || ''}
                  onChange={(val) => setCodeAnswers((p) => ({ ...p, [currentQuestionIndex]: val }))}
                  options={{ readOnly: isEvaluated, minimap: { enabled: false }, fontSize: 14, padding: { top: 12 } }}
                />
              </div>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Written Answer</h3>
              <textarea
                value={textAnswers[currentQuestionIndex] || currentQuestion?.userAnswer || ''}
                onChange={(e) => setTextAnswers((p) => ({ ...p, [currentQuestionIndex]: e.target.value }))}
                disabled={isEvaluated}
                placeholder="Type your answer here... (optional — you can also use voice)"
                style={{ flex: 1, minHeight: '200px', width: '100%', padding: '16px', background: '#0c1222', border: '1px solid #2d3f56', borderRadius: '10px', color: '#f1f5f9', fontSize: '14px', lineHeight: '1.6', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </>
          )}
        </div>
      </div>

      {/* ── AI Feedback (shown after evaluation) ── */}
      {isEvaluated && (
        <div style={{ ...card, padding: '24px', marginBottom: '24px', borderColor: '#14b8a6' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#14b8a6', marginBottom: '12px' }}>AI Feedback</h3>
          <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.7', marginBottom: '16px' }}>{currentQuestion?.aiFeedback}</p>
          <div style={{ display: 'flex', gap: '32px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Technical Score</span>
              <span style={{ fontSize: '24px', fontWeight: '800', color: '#a78bfa' }}>{currentQuestion?.technicalScore}/10</span>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Confidence Score</span>
              <span style={{ fontSize: '24px', fontWeight: '800', color: '#14b8a6' }}>{currentQuestion?.confidencescore}/10</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit Button ── */}
      {!isEvaluated && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSubmitAnswer} disabled={isEvaluating || isRecording}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', background: 'linear-gradient(135deg, #14b8a6, #0d9488)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: (isEvaluating || isRecording) ? 'not-allowed' : 'pointer', opacity: (isEvaluating || isRecording) ? 0.6 : 1, boxShadow: '0 4px 14px rgba(20,184,166,0.3)' }}>
            {isEvaluating ? (
              <><span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }}/> Evaluating...</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Submit Answer</>
            )}
          </button>
        </div>
      )}

      {/* ── End Modal ── */}
      {showEndModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowEndModal(false)}/>
          <div style={{ ...card, padding: '32px', maxWidth: '420px', width: '100%', position: 'relative', zIndex: 1 }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9', marginBottom: '8px' }}>End Interview?</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Are you sure? You won't be able to submit further answers.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowEndModal(false)}
                style={{ padding: '10px 20px', background: '#1a2540', border: '1px solid #2d3f56', borderRadius: '10px', color: '#cbd5e1', fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleEndInterview}
                style={{ padding: '10px 20px', background: '#dc2626', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                End Interview
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default InterviewRunner;
