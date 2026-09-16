"use client";

import { useState } from "react";
import styles from "./workspace.module.css";

type DraftToolsProps = {
  formId: string;
  subject: string;
  factualText: string;
  fileName: string;
};

export function DraftTools({ formId, subject, factualText, fileName }: DraftToolsProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  function currentText() {
    const form = document.getElementById(formId);
    const currentSubject = form?.querySelector<HTMLInputElement>('input[name="subject"]')?.value || subject;
    const request = form?.querySelector<HTMLTextAreaElement>('textarea[name="request"]')?.value.trim() ?? "";
    const currentBody = [factualText, request].filter(Boolean).join("\n\n");
    return `Subject: ${currentSubject}\n\n${currentBody}`;
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(currentText());
      setCopyError(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }

  function downloadDraft() {
    const text = currentText();
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
    <div className={styles.draftTools}>
      <button className="text-button intake-link-button" type="button" onClick={copyDraft}>
        {copied ? "Copied" : "Copy draft"}
      </button>
      <button className="text-button intake-link-button" type="button" onClick={downloadDraft}>
        Download .txt
      </button>
      {copyError ? <span className={styles.draftToolStatus} role="status">Copy was unavailable. Download the draft instead.</span> : null}
    </div>
  );
}
