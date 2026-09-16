"use client";

import { useState } from "react";

type DraftToolsProps = {
  subject: string;
  body: string;
  fileName: string;
};

export function DraftTools({ subject, body, fileName }: DraftToolsProps) {
  const [copied, setCopied] = useState(false);
  const text = `Subject: ${subject}\n\n${body}`;

  async function copyDraft() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadDraft() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button className="text-button intake-link-button" type="button" onClick={copyDraft}>
        {copied ? "Copied" : "Copy draft"}
      </button>
      <button className="text-button intake-link-button" type="button" onClick={downloadDraft}>
        Download .txt
      </button>
    </div>
  );
}
