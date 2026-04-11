import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ExamManager from './ExamManager';
import LiveMonitor from './LiveMonitor';
import ResultsPanel from './ResultsPanel';
import './AdminDashboard.css';

const TABS = [
  { id: 'exams', label: '📋 Sınavlar', desc: 'Sınav Yönetimi' },
  { id: 'live', label: '🔴 Canlı İzleme', desc: 'Real-time Monitoring' },
  { id: 'results', label: '🏆 Sonuçlar', desc: 'Results & Leaderboard' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('exams');
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    navigate('/admin');
  };

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">⚡</div>
          <div>
            <h2>OSYM</h2>
            <span>Admin Panel</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-label">{tab.label}</span>
              <span className="tab-desc">{tab.desc}</span>
            </button>
          ))}
        </nav>

        <button className="btn btn-danger sidebar-logout" onClick={handleLogout}>
          🚪 Çıkış
        </button>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <div className="admin-topbar">
          <h1>{TABS.find(t => t.id === activeTab)?.label}</h1>
          <span className="badge badge-purple">🛡️ Admin</span>
        </div>

        <div className="admin-content">
          {activeTab === 'exams' && <ExamManager />}
          {activeTab === 'live' && <LiveMonitor />}
          {activeTab === 'results' && <ResultsPanel />}
        </div>
      </main>
    </div>
  );
}
