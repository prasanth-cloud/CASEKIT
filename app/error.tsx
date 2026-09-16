"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="page-wrap">
      <section className="panel" style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0, fontSize: 20 }}>Something went wrong</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          The workspace could not render this view. No data was sent or changed.
        </p>
        <button className="primary-button" type="button" onClick={reset}>Try again</button>
      </section>
    </div>
  );
}
