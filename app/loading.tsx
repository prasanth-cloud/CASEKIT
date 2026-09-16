export default function Loading() {
  return (
    <div className="page-wrap" aria-live="polite" aria-busy="true">
      <section className="panel" style={{ padding: 24 }}>
        <div style={{ width: 180, height: 14, background: "#ecece8", borderRadius: 4, marginBottom: 12 }} />
        <div style={{ width: "62%", height: 10, background: "#f0f0ed", borderRadius: 4 }} />
      </section>
    </div>
  );
}
