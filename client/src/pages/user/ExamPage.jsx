import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../../socket';
import WarningModal from '../../components/WarningModal';
import './ExamPage.css';

const OPTION_COLORS = {
  A: 'option-a',
  B: 'option-b',
  C: 'option-c',
  D: 'option-d',
};

export default function ExamPage() {
  const { id: examId } = useParams();
  const navigate = useNavigate();
  const username = sessionStorage.getItem('username') || '';

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});     // { questionId: 'A'|'B'|'C'|'D' }
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [cheatCount, setCheatCount] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const sessionIdRef = useRef(null);
  const cheatCountRef = useRef(0);
  const timerRef = useRef(null);

  // ---- Load exam and start session ----
  useEffect(() => {
    if (!username) { navigate('/'); return; }
    loadExamAndStart();
    return () => {
      clearInterval(timerRef.current);
    };
  }, []);

  const loadExamAndStart = async () => {
    try {
      const res = await fetch(`/api/exams/${examId}`);
      if (!res.ok) throw new Error('Sınav bulunamadı');
      const data = await res.json();
      setExam(data);

      // Start session
      const sessionRes = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          examId,
          examTitle: data.title,
          totalQuestions: data.questions?.length || 0,
        }),
      });
      const sessionData = await sessionRes.json();
      const sid = sessionData.sessionId;
      setSessionId(sid);
      sessionIdRef.current = sid;

      // Join socket room
      socket.emit('user:join', {
        sessionId: sid,
        username,
        examId,
        examTitle: data.title,
        currentQuestion: 1,
        totalQuestions: data.questions?.length || 0,
      });

      // Start timer
      timerRef.current = setInterval(() => {
        setTimeElapsed(t => t + 1);
      }, 1000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---- Anti-cheat: detect focus loss ----
  const handleCheat = useCallback(async (type) => {
    cheatCountRef.current += 1;
    setCheatCount(cheatCountRef.current);
    setShowWarning(true);

    const sid = sessionIdRef.current;
    if (!sid) return;

    // Emit to admin via socket
    socket.emit('user:cheat', {
      sessionId: sid,
      username,
      examTitle: exam?.title || '',
      type,
    });

    // Persist to DB
    try {
      await fetch(`/api/sessions/${sid}/cheat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
    } catch (err) {
      console.error('Cheat flag error:', err);
    }
  }, [username, exam]);

  useEffect(() => {
    const handleBlur = () => handleCheat('blur');
    const handleVisibility = () => {
      if (document.hidden) handleCheat('visibility');
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [handleCheat]);

  // ---- Navigation ----
  const currentQuestion = exam?.questions?.[currentIndex];
  const totalQuestions = exam?.questions?.length || 0;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  const handleSelectOption = (option) => {
    setSelectedOption(option);
  };

  const handleNext = async () => {
    if (!selectedOption || !currentQuestion) return;

    const newAnswers = { ...answers, [currentQuestion.id]: selectedOption };
    setAnswers(newAnswers);

    const nextIndex = currentIndex + 1;

    // Update progress in DB & socket
    const sid = sessionIdRef.current;
    if (sid) {
      socket.emit('user:progress', { sessionId: sid, currentQuestion: nextIndex + 1 });

      fetch(`/api/sessions/${sid}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentQuestion: nextIndex,
          questionId: currentQuestion.id,
          answer: selectedOption,
        }),
      }).catch(console.error);
    }

    if (nextIndex >= totalQuestions) {
      // Last question — submit
      await submitExam(newAnswers);
    } else {
      setCurrentIndex(nextIndex);
      setSelectedOption(null);
    }
  };

  const submitExam = async (finalAnswers) => {
    setSubmitting(true);
    const sid = sessionIdRef.current;
    try {
      const res = await fetch(`/api/sessions/${sid}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers, examId }),
      });
      const result = await res.json();

      // Notify admin socket
      socket.emit('user:complete', {
        sessionId: sid,
        username,
        score: result.score,
        total: result.total,
      });

      // Store result in sessionStorage for result page
      sessionStorage.setItem('examResult', JSON.stringify({
        ...result,
        examTitle: exam.title,
        username,
        cheatCount: cheatCountRef.current,
        timeElapsed,
      }));

      navigate('/result');
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) return (
    <div className="page-wrapper">
      <div className="spinner" />
      <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>Sınav yükleniyor...</p>
    </div>
  );

  if (error) return (
    <div className="page-wrapper">
      <div className="card" style={{ textAlign: 'center', color: '#f87171' }}>
        <p>❌ {error}</p>
        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/exams')}>
          ← Geri Dön
        </button>
      </div>
    </div>
  );

  return (
    <div className="exam-page page-wrapper">
      {/* Warning Modal for anti-cheat */}
      {showWarning && (
        <WarningModal
          cheatCount={cheatCount}
          onDismiss={() => setShowWarning(false)}
        />
      )}

      <div className="exam-container">
        {/* Header */}
        <div className="exam-header">
          <div className="exam-meta">
            <span className="exam-title">{exam?.title}</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {cheatCount > 0 && (
                <span className="badge badge-red">🚩 {cheatCount} Uyarı</span>
              )}
              <span className="badge badge-cyan">⏱ {formatTime(timeElapsed)}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="exam-progress-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="progress-label">Soru {currentIndex + 1} / {totalQuestions}</span>
              <span className="progress-pct">{Math.round(progress)}%</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <div className="question-card card neon-border" key={currentQuestion.id}>
            <div className="question-number">
              <span>SORU {currentIndex + 1}</span>
            </div>
            <p className="question-text">{currentQuestion.text}</p>

            <div className="options-grid">
              {Object.entries(currentQuestion.options || {}).map(([key, value]) => (
                <button
                  key={key}
                  className={`option-btn ${OPTION_COLORS[key]} ${selectedOption === key ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(key)}
                >
                  <span className="option-key">{key}</span>
                  <span className="option-value">{value}</span>
                </button>
              ))}
            </div>

            <div className="question-actions">
              <span className="username-tag">🎮 {username}</span>
              <button
                className="btn btn-primary"
                onClick={handleNext}
                disabled={!selectedOption || submitting}
              >
                {submitting ? (
                  <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Hesaplanıyor...</>
                ) : currentIndex + 1 >= totalQuestions ? (
                  '✅ Sınavı Bitir'
                ) : (
                  'Sonraki Soru →'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
