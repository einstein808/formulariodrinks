export default function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0a0a0a',
    }}>
      <div className="btn__spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
    </div>
  );
}
