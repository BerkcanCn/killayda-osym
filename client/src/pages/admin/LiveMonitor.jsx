import { useState, useEffect, useRef } from 'react';
import socket from '../../socket';
import './LiveMonitor.css';

export default function LiveMonitor() {
  const [liveUsers, setLiveUsers] = useState({});   // { sessionId: userObj }
  const [cheatToasts, setCheatToasts] = useState([]);
  const [connected, setConnected] = useState(socket.connected);
  const toastIdRef = useRef(0);

  useEffect(() => {
    // Join admin room
    socket.emit('join:admin');
    setConnected(socket.connected);

    const handleSnapshot = (users) => {
      const map = {};
      users.forEach(u => { map[u.sessionId] = u; });
      setLiveUsers(map);
    };

    const handleUpdate = (user) => {
      setLiveUsers(prev => ({ ...prev, [user.sessionId]: user }));
    };

    const handleCheat = (data) => {
      setLiveUsers(prev => ({
        ...prev,
        [data.sessionId]: { ...prev[data.sessionId], ...data },
      }));
      // Show floating toast
      const id = ++toastIdRef.current;
      setCheatToasts(prev => [...prev, { id, data }]);
      setTimeout(() => setCheatToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };

    const handleCompleted = (data) => {
      setLiveUsers(prev => {
        const next = { ...prev };
        delete next[data.sessionId];
        return next;
      });
    };

    const handleDisconnected = ({ sessionId }) => {
      setLiveUsers(prev => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
    };

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on('live:snapshot', handleSnapshot);
    socket.on('live:update', handleUpdate);
    socket.on('live:cheat', handleCheat);
    socket.on('live:completed', handleCompleted);
    socket.on('live:disconnected', handleDisconnected);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('live:snapshot', handleSnapshot);
      socket.off('live:update', handleUpdate);
      socket.off('live:cheat', handleCheat);
      socket.off('live:completed', handleCompleted);
      socket.off('live:disconnected', handleDisconnected);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  const users = Object.values(liveUsers);

  return (
    <div className="live-monitor">
      {/* Cheat toast notifications */}
      <div className="cheat-toasts">
        {cheatToasts.map(({ id, data }) => (
          <div key={id} className="toast toast-cheat cheat-toast-item">
            🚩 <strong>{data.username}</strong> — Hile tespit edildi!
            <span style={{ marginLeft: 8, fontSize: '0.78rem', opacity: 0.8 }}>
              ({data.cheatType === 'blur' ? 'Pencere değiştirildi' : 'Sekme gizlendi'})
            </span>
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div className="monitor-status-bar">
        <div className="monitor-status-item">
          <span className={`status-dot ${connected ? 'status-dot-live' : 'status-dot-off'}`} />
          <span>{connected ? 'Bağlı — Canlı İzleme Aktif' : 'Bağlantı Yok'}</span>
        </div>
        <div className="monitor-status-item">
          <span className="badge badge-purple">{users.length} Aktif Kullanıcı</span>
        </div>
      </div>

      {/* Live users table */}
      {users.length === 0 ? (
        <div className="card no-live-users">
          <div style={{ fontSize: '3rem' }}>📡</div>
          <h3>Aktif kullanıcı yok</h3>
          <p>Bir kullanıcı sınava girdiğinde burada gerçek zamanlı görünecek.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>Sınav</th>
                <th>İlerleme</th>
                <th>Cheat</th>
                <th>Son Görülme</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const pct = user.totalQuestions > 0
                  ? Math.round((user.currentQuestion / user.totalQuestions) * 100)
                  : 0;
                return (
                  <tr key={user.sessionId} className={user.cheatCount > 0 ? 'cheat-row' : ''}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="live-dot" />
                        <strong>{user.username}</strong>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                      {user.examTitle || user.examId}
                    </td>
                    <td>
                      <div className="progress-cell">
                        <span className="prog-label">
                          {user.currentQuestion || 1}/{user.totalQuestions || '?'}
                        </span>
                        <div className="progress-bar-track" style={{ width: 80 }}>
                          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="prog-pct">{pct}%</span>
                      </div>
                    </td>
                    <td>
                      {(user.cheatCount || 0) > 0 ? (
                        <span className="badge badge-red">🚩 {user.cheatCount}</span>
                      ) : (
                        <span className="badge badge-green">✓ Temiz</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {user.lastSeen ? new Date(user.lastSeen).toLocaleTimeString('tr-TR') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
