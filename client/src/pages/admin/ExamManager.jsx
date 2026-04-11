import { useState, useEffect } from 'react';
import './ExamManager.css';

const EMPTY_QUESTION = () => ({
  id: `q_${Date.now()}`,
  text: '',
  options: { A: '', B: '', C: '', D: '' },
  correctAnswer: 'A',
});

const EMPTY_EXAM = () => ({
  title: '',
  description: '',
  isActive: false,
  questions: [],
});

export default function ExamManager() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [formData, setFormData] = useState(EMPTY_EXAM());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [expandedExam, setExpandedExam] = useState(null);

  useEffect(() => { fetchExams(); }, []);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/exams');
      setExams(await res.json());
    } catch { showToast('Sınavlar yüklenemedi', 'error'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingExam(null);
    setFormData(EMPTY_EXAM());
    setShowForm(true);
  };

  const openEdit = (exam) => {
    setEditingExam(exam.id);
    setFormData({
      title: exam.title,
      description: exam.description || '',
      isActive: exam.isActive || false,
      questions: exam.questions ? JSON.parse(JSON.stringify(exam.questions)) : [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu sınavı silmek istediğinizden emin misiniz?')) return;
    try {
      await fetch(`/api/exams/${id}`, { method: 'DELETE' });
      setExams(prev => prev.filter(e => e.id !== id));
      showToast('Sınav silindi ✓', 'success');
    } catch { showToast('Silme hatası', 'error'); }
  };

  const handleToggleActive = async (exam) => {
    try {
      const res = await fetch(`/api/exams/${exam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !exam.isActive }),
      });
      const updated = await res.json();
      setExams(prev => prev.map(e => e.id === exam.id ? updated : e));
      showToast(`Sınav ${updated.isActive ? 'aktifleştirildi' : 'devre dışı bırakıldı'} ✓`, 'success');
    } catch { showToast('Güncelleme hatası', 'error'); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { showToast('Sınav başlığı gerekli!'); return; }
    setSaving(true);
    try {
      const method = editingExam ? 'PUT' : 'POST';
      const url = editingExam ? `/api/exams/${editingExam}` : '/api/exams';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const saved = await res.json();
      if (editingExam) {
        setExams(prev => prev.map(e => e.id === editingExam ? saved : e));
      } else {
        setExams(prev => [saved, ...prev]);
      }
      setShowForm(false);
      showToast(`Sınav ${editingExam ? 'güncellendi' : 'oluşturuldu'} ✓`, 'success');
    } catch { showToast('Kaydetme hatası', 'error'); }
    finally { setSaving(false); }
  };

  // Question helpers
  const addQuestion = () => {
    setFormData(prev => ({ ...prev, questions: [...prev.questions, EMPTY_QUESTION()] }));
  };

  const updateQuestion = (idx, field, value) => {
    setFormData(prev => {
      const qs = [...prev.questions];
      if (field.startsWith('opt_')) {
        const optKey = field.split('_')[1];
        qs[idx] = { ...qs[idx], options: { ...qs[idx].options, [optKey]: value } };
      } else {
        qs[idx] = { ...qs[idx], [field]: value };
      }
      return { ...prev, questions: qs };
    });
  };

  const removeQuestion = (idx) => {
    setFormData(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));
  };

  if (loading) return <div className="spinner" style={{ marginTop: 40 }} />;

  return (
    <div className="exam-manager">
      {toast && <div className={`toast toast-${toast.type === 'success' ? 'success' : toast.type === 'error' ? 'cheat' : 'info'}`}>{toast.msg}</div>}

      {/* Exam form modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="exam-form-modal card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExam ? 'Sınavı Düzenle' : 'Yeni Sınav Oluştur'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="exam-form">
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>SINAV BAŞLIĞI</label>
                  <input className="form-input" placeholder="örn: Killayda Lore Testi" value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>DURUM</label>
                  <label className="toggle-label">
                    <input type="checkbox" checked={formData.isActive}
                      onChange={e => setFormData(p => ({ ...p, isActive: e.target.checked }))} />
                    <span className="toggle-text">{formData.isActive ? '✅ Aktif' : '⛔ Devre Dışı'}</span>
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>AÇIKLAMA</label>
                <textarea className="form-textarea" placeholder="Sınav açıklaması..." value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
              </div>

              {/* Questions */}
              <div className="questions-section">
                <div className="questions-header">
                  <h3>Sorular ({formData.questions.length})</h3>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addQuestion}>+ Soru Ekle</button>
                </div>
                {formData.questions.map((q, idx) => (
                  <div key={q.id} className="question-editor">
                    <div className="qe-header">
                      <span className="qe-num">{idx + 1}</span>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => removeQuestion(idx)}>🗑 Sil</button>
                    </div>
                    <div className="form-group">
                      <label>SORU METNİ</label>
                      <textarea className="form-textarea" style={{ minHeight: 60 }}
                        placeholder={`Soru ${idx + 1}...`} value={q.text}
                        onChange={e => updateQuestion(idx, 'text', e.target.value)} />
                    </div>
                    <div className="options-editor">
                      {['A', 'B', 'C', 'D'].map(key => (
                        <div key={key} className="option-editor-row">
                          <span className={`opt-key opt-${key.toLowerCase()}`}>{key}</span>
                          <input className="form-input" placeholder={`Seçenek ${key}`}
                            value={q.options[key] || ''}
                            onChange={e => updateQuestion(idx, `opt_${key}`, e.target.value)} />
                          <label className="correct-radio">
                            <input type="radio" name={`correct_${q.id}`} value={key}
                              checked={q.correctAnswer === key}
                              onChange={() => updateQuestion(idx, 'correctAnswer', key)} />
                            <span title="Doğru cevap">✓</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {formData.questions.length === 0 && (
                  <div className="no-questions">Henüz soru eklenmedi. "+ Soru Ekle" butonuna tıkla.</div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>İptal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Kaydediliyor...' : editingExam ? '💾 Güncelle' : '✅ Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="manager-header">
        <div>
          <h2>Sınav Yönetimi</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{exams.length} sınav kayıtlı</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Yeni Sınav</button>
      </div>

      {/* Exam list */}
      <div className="exams-list">
        {exams.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
            Henüz sınav oluşturulmadı.
          </div>
        )}
        {exams.map((exam) => (
          <div key={exam.id} className="exam-row card">
            <div className="exam-row-main">
              <div className="exam-row-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3>{exam.title}</h3>
                  <span className={`badge ${exam.isActive ? 'badge-green' : 'badge-red'}`}>
                    {exam.isActive ? '● Aktif' : '○ Pasif'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 4 }}>
                  {exam.questions?.length || 0} soru
                  {exam.description ? ` · ${exam.description}` : ''}
                </p>
              </div>
              <div className="exam-row-actions">
                <button className="btn btn-success btn-sm" onClick={() => handleToggleActive(exam)}>
                  {exam.isActive ? '⛔ Devre Dışı' : '✅ Aktifleştir'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(exam)}>✏ Düzenle</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(exam.id)}>🗑 Sil</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setExpandedExam(expandedExam === exam.id ? null : exam.id)}>
                  {expandedExam === exam.id ? '▲' : '▼'} Sorular
                </button>
              </div>
            </div>

            {expandedExam === exam.id && (
              <div className="exam-questions-preview">
                {(exam.questions || []).map((q, i) => (
                  <div key={q.id} className="preview-question">
                    <span className="preview-num">{i + 1}.</span>
                    <span className="preview-text">{q.text || <em>Boş soru</em>}</span>
                    <span className="badge badge-green" style={{ marginLeft: 'auto' }}>✓ {q.correctAnswer}</span>
                  </div>
                ))}
                {(exam.questions || []).length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Soru yok</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
