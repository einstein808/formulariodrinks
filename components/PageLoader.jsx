export default function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-dark, #050a06)',
      padding: 20
    }}>
      <div style={{
        background: 'var(--bg-card, #0c1610)',
        border: '1px solid rgba(203, 161, 83, 0.25)',
        borderRadius: 16,
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        maxWidth: 280,
        width: '100%',
        textAlign: 'center'
      }}>
        <img src="/logo.webp" alt="Logo" style={{ width: 65, height: 'auto' }} />
        <div className="btn__spinner" style={{ width: 36, height: 36, borderWidth: 3, borderTopColor: '#cba153' }} />
        <span style={{ color: 'var(--text-secondary, #a8b8aa)', fontSize: '0.9rem', fontWeight: 500 }}>
          Carregando...
        </span>
      </div>
    </div>
  );
}
