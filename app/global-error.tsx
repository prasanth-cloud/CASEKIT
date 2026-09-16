"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main style={{ maxWidth: 640, margin: "80px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <h1>CaseKit could not load</h1>
          <p>The workspace encountered an unexpected error. No external action was performed.</p>
          <button type="button" onClick={reset}>Try again</button>
        </main>
      </body>
    </html>
  );
}
