import { useState, useEffect } from 'react';
import './ResultsPanel.css';

export default function ResultsPanel() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterExam, setFilterExam] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [expandedResult, setExpandedResult] = useState(null);

  useEffect(() => { fetchResults(); }, []);

  const fetchResults = async () => {
    try {
      const res = await fetch('/api/results');
      setResults(await res.json());
    } catch (err) {
      console.error('Results fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const exams = [...new Set(results.map(r => r.examTitle || r.examId))].filter(Boolean);

  const filtered = results
    .filter(r => filterExam === 'all' || (r.examTitle || r.examId) === filterExam)
    .sort((a, b) => {
      if (sortBy === 'score') return b.percentage - a.percentage;
      if (sortBy === 'cheat') return (b.cheatFlags?.length || 0) - (a.cheatFlags?.length || 0);
      return new Date(b.completedAt) - new Date(a.completedAt);
    });

  const stats = {
    total: results.length,
    avgScore: results.length ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length) : 0,
    cheaters: results.filter(r => (r.cheatFlags?.length || 0) > 0).length,
    perfect: results.filter(r => r.percentage === 100).length,
  };

  if (loading) return <div className="spinner" style={{ marginTop: 40 }} />;

  return (
    <div className="results-panel">
      {/* Summary cards */}
      <div className="results-stats-grid">
        <div className="stat-card card">
          <span style={{ fontSize: '1.6rem' }}>📊</span>
          <div className="stat-card-val">{stats.total}</div>
          <div className="stat-card-label">Toplam Katılımcı</div>
        </div>
        <div className="stat-card card">
          <span style={{ fontSize: '1.6rem' }}>⭐</span>
          <div className="stat-card-val">{stats.avgScore}%</div>
          <div className="stat-card-label">Ortalama Skor</div>
        </div>
        <div className="stat-card card">
          <span style={{ fontSize: '1.6rem' }}>🏆</span>
          <div className="stat-card-val">{stats.perfect}</div>
          <div className="stat-card-label">Mükemmel Skor</div>
        </div>
        <div className="stat-card card">
          <span style={{ fontSize: '1.6rem' }}>🚩</span>
          <div className="stat-card-val" style={{ color: stats.cheaters > 0 ? '#f87171' : 'inherit' }}>
            {stats.cheaters}
          </div>
          <div className="stat-card-label">Şüpheli Katılımcı</div>
        </div>
      </div>

      {/* Filters */}
      <div className="results-filters">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <select className="form-select" style={{ width: 'auto' }} value={filterExam} onChange={e => setFilterExam(e.target.value)}>
              <option value="all">Tüm Sınavlar</option>
              {exams.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <select className="form-select" style={{ width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="date">Tarihe Göre</option>
              <option value="score">Skora Göre</option>
              <option value="cheat">İhlale Göre</option>
            </select>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchResults}>🔄 Yenile</button>
      </div>

      {/* Results table */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          Henüz sonuç yok.
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Kullanıcı</th>
                <th>Sınav</th>
                <th>Skor</th>
                <th>İhlal</th>
                <th>Tarih</th>
                <th>Detay</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <>
                  <tr key={r.id} className={r.cheatFlags?.length > 0 ? 'cheat-result-row' : ''}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {idx + 1}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {idx === 0 && sortBy === 'score' && <span title="En Yüksek Skor">🏆</span>}
                        <strong>{r.username}</strong>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{r.examTitle || r.examId}</td>
                    <td>
                      <div className="score-cell">
                        <span className={`score-pct-badge ${r.percentage >= 70 ? 'green' : r.percentage >= 40 ? 'yellow' : 'red'}`}>
                          {r.percentage}%
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {r.score}/{r.totalQuestions}
                        </span>
                      </div>
                    </td>
                    <td>
                      {(r.cheatFlags?.length || 0) > 0 ? (
                        <span className="badge badge-red">🚩 {r.cheatFlags.length}</span>
                      ) : (
                        <span className="badge badge-green">✓ Temiz</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {r.completedAt ? new Date(r.completedAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => setExpandedResult(expandedResult === r.id ? null : r.id)}>
                        {expandedResult === r.id ? '▲' : '▼'}
                      </button>
                    </td>
                  </tr>
                  {expandedResult === r.id && (
                    <tr key={`${r.id}-detail`}>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <div className="result-detail">
                          <h4>Cevap Detayları</h4>
                          <div className="answers-grid">
                            {Object.entries(r.answers || {}).map(([qId, ans]) => (
                              <div key={qId} className="answer-chip">
                                <span className="answer-qid">{qId}</span>
                                <span className="badge badge-cyan">{ans}</span>
                              </div>
                            ))}
                          </div>
                          {(r.cheatFlags?.length || 0) > 0 && (
                            <>
                              <h4 style={{ marginTop: 14 }}>🚩 İhlal Kayıtları</h4>
                              <div className="cheat-flags-list">
                                {(r.cheatFlags || []).map((flag, i) => (
                                  <div key={i} className="cheat-flag-item">
                                    <span className="badge badge-red">{flag.type}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                      {new Date(flag.timestamp).toLocaleTimeString('tr-TR')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
