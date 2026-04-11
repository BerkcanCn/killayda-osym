import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResultPage.css';

const RATINGS = [
  { min: 90, label: 'EFSANE KEMIK KADRO 💀', color: 'var(--accent-purple-bright)', emoji: '🏆' },
  { min: 70, label: 'GERÇEK FANATİK 🔥', color: 'var(--accent-cyan)', emoji: '⭐' },
  { min: 50, label: 'ORTALAMA İZLEYİCİ 😐', color: 'var(--accent-yellow)', emoji: '👍' },
  { min: 30, label: 'YENİ GELDİN GELELİ 🤔', color: 'var(--accent-orange)', emoji: '📺' },
  { min: 0, label: 'YABANCI SAN KI 💀', color: 'var(--accent-red)', emoji: '😭' },
];

function getRating(pct) {
  return RATINGS.find(r => pct >= r.min) || RATINGS[RATINGS.length - 1];
}

export default function ResultPage() {
  const navigate = useNavigate();
  const resultRaw = sessionStorage.getItem('examResult');
  const result = resultRaw ? JSON.parse(resultRaw) : null;

  useEffect(() => {
    if (!result) navigate('/');
  }, []);

  if (!result) return null;

  const { score, total, percentage, examTitle, username, cheatCount, cheatFlags } = result;
  const rating = getRating(percentage);

  const handleRetry = () => {
    sessionStorage.removeItem('examResult');
    navigate('/exams');
  };

  return (
    <div className="result-page page-wrapper">
      <div className="result-container">
        {/* Trophy header */}
        <div className="result-header">
          <div className="result-trophy">{rating.emoji}</div>
          <h1 className="gradient-text">Sınav Tamamlandı!</h1>
          <p className="result-exam-title">{examTitle}</p>
        </div>

        {/* Score card */}
        <div className="result-score-card card neon-border">
          <div className="score-arc">
            <svg viewBox="0 0 120 120" className="score-svg">
              <circle cx="60" cy="60" r="50" className="score-track" />
              <circle
                cx="60" cy="60" r="50"
                className="score-fill"
                strokeDasharray={`${314 * percentage / 100} 314`}
                strokeDashoffset="78.5"
              />
            </svg>
            <div className="score-center">
              <span className="score-pct" style={{ color: rating.color }}>{percentage}%</span>
              <span className="score-fraction">{score}/{total}</span>
            </div>
          </div>
          <div className="rating-label" style={{ color: rating.color }}>
            {rating.label}
          </div>
        </div>

        {/* Stats */}
        <div className="result-stats">
          <div className="stat-item card">
            <span className="stat-icon">✅</span>
            <span className="stat-value">{score}</span>
            <span className="stat-label">Doğru</span>
          </div>
          <div className="stat-item card">
            <span className="stat-icon">❌</span>
            <span className="stat-value">{total - score}</span>
            <span className="stat-label">Yanlış</span>
          </div>
          <div className="stat-item card" style={cheatCount > 0 ? { borderColor: 'rgba(239,68,68,0.4)' } : {}}>
            <span className="stat-icon">🚩</span>
            <span className="stat-value" style={{ color: cheatCount > 0 ? '#f87171' : 'inherit' }}>
              {cheatCount}
            </span>
            <span className="stat-label">İhlal</span>
          </div>
        </div>

        {cheatCount > 0 && (
          <div className="cheat-warning card">
            <p>⚠️ Bu sınav sırasında <strong>{cheatCount}</strong> kez hile ihlali tespit edildi.
              Sonuçların admin tarafından incelenebilir.</p>
          </div>
        )}

        <div className="result-user">
          <span className="badge badge-purple">🎮 {username}</span>
        </div>

        {/* CTA */}
        <div className="result-actions">
          <button className="btn btn-primary" onClick={handleRetry}>
            🔄 Tekrar Dene
          </button>
          <button className="btn btn-secondary" onClick={() => { sessionStorage.clear(); navigate('/'); }}>
            🚪 Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  );
}
