import Link from "next/link";

export default function HomePage() {
  return (
    <main className="showcase-page">
      <header className="showcase-header">
        <Link className="showcase-brand" href="/" aria-label="CaseKit home"><span className="brand-mark" aria-hidden="true">CK</span><span>CaseKit</span></Link>
        <nav className="showcase-nav" aria-label="Showcase navigation"><Link href="#features">Features</Link><Link href="#boundaries">Safety boundaries</Link><Link className="text-button" href="/login?next=/cases">Sign in</Link></nav>
      </header>

      <section className="showcase-hero" aria-labelledby="showcase-title">
        <div><div className="eyebrow">Evidence workspace</div><h1 id="showcase-title">Turn scattered purchase evidence into an organized case.</h1><p>CaseKit helps you collect documents, review the facts, prepare an evidence-backed request, and keep every decision auditable.</p><div className="showcase-actions"><Link className="primary-button" href="/demo">Explore the interactive demo</Link><Link className="text-button" href="/login?next=/cases">Open my workspace</Link></div></div>
        <aside className="showcase-preview" aria-label="Demo case preview"><div className="preview-topline"><span className="status-badge">Draft ready</span><span className="muted-cell">CASE-1042</span></div><h2>Laptop delivery dispute</h2><p>3 verified evidence claims · 1 grounded draft · no message sent</p><div className="preview-progress"><span /><span /><span /><span /></div><Link className="text-button" href="/demo">View sample case →</Link></aside>
      </section>

      <section id="features" className="showcase-section" aria-labelledby="features-title"><div className="section-heading"><div className="eyebrow">What is inside</div><h2 id="features-title">A focused workflow from evidence to action.</h2></div><div className="feature-grid"><article className="feature-card"><span className="feature-number">01</span><h3>Secure intake</h3><p>Create a case, upload PDF/image/text/email evidence, paste supporting text, and choose a retention period.</p></article><article className="feature-card"><span className="feature-number">02</span><h3>Fact review</h3><p>Review merchant, order, dates, amount, issue, and requested resolution before anything is drafted.</p></article><article className="feature-card"><span className="feature-number">03</span><h3>Grounded drafts</h3><p>Keep factual sentences linked to verified evidence, edit the request layer, save versions, and approve manually.</p></article><article className="feature-card"><span className="feature-number">04</span><h3>Follow-up control</h3><p>Schedule consent-gated reminders and record outbound authorization without automatically sending email.</p></article></div></section>

      <section id="boundaries" className="showcase-boundary" aria-labelledby="boundary-title"><div><div className="eyebrow">Trust by default</div><h2 id="boundary-title">Your evidence stays private and your actions stay explicit.</h2></div><ul><li>Private Supabase storage with user-scoped access policies.</li><li>Uploaded documents are treated as untrusted evidence, never instructions.</li><li>Draft approval is separate from outbound authorization—and neither sends a message automatically.</li></ul></section>
      <footer className="showcase-footer"><span>CaseKit public demo uses synthetic data only.</span><Link href="/demo">Explore demo →</Link></footer>
    </main>
  );
}
