import './WarningModal.css';

const WARNINGS = [
  'Dışarı mı kaçıyordun? 👀',
  'Hile yakalandın! Kemik Kadro utanıyor! 😤',
  'Google\'a baktın mı? Killayda izliyor seni! 🔴',
  'Bu seferde yakalandın. Gerçek KemikKadro hile yapmaz! 💀',
];

export default function WarningModal({ cheatCount, onDismiss }) {
  const msg = WARNINGS[Math.min(cheatCount - 1, WARNINGS.length - 1)];

  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div className="modal-box warning-modal" onClick={(e) => e.stopPropagation()}>
        <div className="warning-icon">⚠️</div>
        <h2 className="warning-title">HİLE TESPİT EDİLDİ!</h2>
        <p className="warning-message">{msg}</p>
        <div className="warning-count">
          <span>Toplam ihlal:</span>
          <span className="cheat-num">{cheatCount}</span>
        </div>
        <p className="warning-sub">Bu olay admin paneline bildirildi ve kayıt altına alındı.</p>
        <button className="btn btn-danger warning-dismiss" onClick={onDismiss}>
          Anladım, Devam Et →
        </button>
      </div>
    </div>
  );
}
