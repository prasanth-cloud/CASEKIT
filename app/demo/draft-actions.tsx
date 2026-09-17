"use client";

import { useState } from "react";

const draft = "SYNTHETIC CASEKIT DEMO\n\nThe order was placed with Northstar Electronics for $849.00.\n\nThe support conversation records a damaged item on delivery.\n\nPlease review this case and issue a refund to the original payment method.";

export function DraftActions() {
  const [message, setMessage] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setMessage("Demo draft copied.");
    } catch {
      setMessage("Copy is unavailable. Download the text file instead.");
    }
  }

  return (
    <div className="demo-actions">
      <button className="text-button" type="button" onClick={copy}>Copy draft</button>
      <a className="text-button" download="casekit-synthetic-demo.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(draft)}`}>Download .txt</a>
      <span role="status">{message}</span>
    </div>
  );
}
