export default function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <div className="page-content">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>People</h1>
      <p style={{ color: 'var(--text-muted)' }}>Coming soon.</p>
    </div>
  );
}
