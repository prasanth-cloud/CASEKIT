"use client";

import { useEffect } from "react";
import { captureClientError } from "@/lib/observability/browser";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureClientError(error, { surface: "route_error", route: "unknown", code: "route_render_failed" });
  }, [error]);

  return (
    <div className="page-wrap">
      <section className="panel" style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0, fontSize: 20 }}>Something went wrong</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          The workspace could not render this view. No customer data was sent or changed.
        </p>
        <button className="primary-button" type="button" onClick={reset}>Try again</button>
      </section>
    </div>
  );
}
