import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ExamListPage.css';

export default function ExamListPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const username = sessionStorage.getItem('username') || '';

  useEffect(() => {
    if (!username) { navigate('/'); return; }
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/exams');
      if (!res.ok) throw new Error('Sınavlar yüklenemedi');
      const data = await res.json();
      setExams(data.filter(e => e.isActive));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="examlist-page page-wrapper">
      <div className="examlist-container">
        <div className="examlist-header">
          <div className="examlist-greeting">
            <span className="greeting-wave">👋</span>
            <div>
              <p className="greeting-sub">Hoş geldin,</p>
              <h2 className="greeting-name">{username}</h2>
            </div>
          </div>
          <div>
            <h1 className="gradient-text">Sınav Seç</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Killayda lore'unu ne kadar iyi biliyorsun?
            </p>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" />
            <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>Sınavlar yükleniyor...</p>
          </div>
        )}

        {error && (
          <div className="card" style={{ borderColor: 'var(--accent-red)', textAlign: 'center', color: '#f87171' }}>
            ❌ {error}
          </div>
        )}

        {!loading && !error && exams.length === 0 && (
          <div className="card no-exams">
            <div style={{ fontSize: 48 }}>🎮</div>
            <h3>Aktif sınav yok</h3>
            <p>Şu an aktif bir sınav bulunmuyor. Yakında eklenecek!</p>
          </div>
        )}

        <div className="exams-grid">
          {exams.map((exam) => (
            <div key={exam.id} className="exam-card card">
              <div className="exam-card-icon">📋</div>
              <div className="exam-card-body">
                <h3>{exam.title}</h3>
                <p>{exam.description || 'Killayda lore testin başlıyor!'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  <span className="badge badge-purple">
                    {exam.questions?.length || 0} Soru
                  </span>
                  <span className="badge badge-green">Aktif</span>
                </div>
              </div>
              <button
                className="btn btn-primary exam-start-btn"
                onClick={() => navigate(`/exam/${exam.id}`)}
              >
                🚀 Başla
              </button>
            </div>
          ))}
        </div>

        <button
          className="btn btn-secondary"
          style={{ marginTop: 8 }}
          onClick={() => { sessionStorage.clear(); navigate('/'); }}
        >
          ← Çıkış Yap
        </button>
      </div>
    </div>
  );
}
