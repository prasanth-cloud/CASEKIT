(function () {
  "use strict";

  const SAMPLE_TEXT = `Order confirmation — Northstar Home
Order #NS-28419
Order date: August 12, 2026
Item: Stoneware dinner set
Total paid: $84.99
Promised delivery: August 16, 2026

August 19, 2026 — The package still has not arrived.
August 22, 2026 — I asked Northstar Home support for a refund.
Support replied: “Refunds are only available after delivery.”

Request: Refund the full $84.99 to the original payment method.`;

  const ISSUE_LABELS = {
    missing_delivery: "Missing or delayed delivery",
    damaged_item: "Damaged or wrong item",
    refund_not_received: "Refund not received",
    duplicate_charge: "Duplicate charge",
    return_rejected: "Return rejected",
    cancelled_order: "Cancelled order",
    poor_service: "Poor service or non-delivery"
  };

  const ISSUE_TERMS = [
    ["refund_not_received", /refund\s+(?:has\s+)?not\s+(?:been\s+)?received|refund\s+missing|still waiting for (?:my )?refund/i],
    ["damaged_item", /damaged|broken|wrong item|incorrect item|defective/i],
    ["duplicate_charge", /duplicate|charged twice|double charge/i],
    ["return_rejected", /return(?:\s+was|\s+has)?\s+rejected|return denied|would not accept (?:the )?return/i],
    ["cancelled_order", /cancelled|canceled|order was voided/i],
    ["missing_delivery", /not arrived|hasn't arrived|has not arrived|missing package|late delivery|delayed delivery|never arrived|non-delivery/i]
  ];

  const MONTHS = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
    jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11
  };

  const state = {
    stage: "intake",
    sourceText: "",
    files: [],
    facts: null,
    timeline: [],
    draft: null,
    approved: false,
    error: ""
  };

  const app = document.getElementById("app");
  const toast = document.getElementById("toast");

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(date) {
    if (!date) return "Date not found";
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
  }

  function normalizeDate(raw) {
    if (!raw) return "";
    const clean = raw.replace(/,/g, "").trim();
    const iso = clean.match(/^(20\d{2})-(\d{1,2})-(\d{1,2})$/);
    if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, "0")}-${String(iso[3]).padStart(2, "0")}`;
    const named = clean.match(/^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{1,2})\s+(20\d{2})$/i);
    if (named) return `${named[3]}-${String(MONTHS[named[1].toLowerCase()] + 1).padStart(2, "0")}-${String(named[2]).padStart(2, "0")}`;
    const slash = clean.match(/^(\d{1,2})\/(\d{1,2})\/(20\d{2})$/);
    if (slash) return `${slash[3]}-${String(slash[1]).padStart(2, "0")}-${String(slash[2]).padStart(2, "0")}`;
    return raw.trim();
  }

  function findDateAfter(label, text) {
    const labelPattern = new RegExp(`${label}[^\\n]{0,30}((?:\\b20\\d{2}-\\d{1,2}-\\d{1,2})|(?:\\b[A-Za-z]{3,9}\\s+\\d{1,2},?\\s+20\\d{2})|(?:\\b\\d{1,2}\\/\\d{1,2}\\/20\\d{2}))`, "i");
    const match = text.match(labelPattern);
    return match ? normalizeDate(match[1]) : "";
  }

  function findMoney(text) {
    const match = text.match(/(?:total(?:\s+paid)?|amount\s+paid|charged|price|cost|refund)[^\d$]{0,18}\$?\s*([\d,]+(?:\.\d{2})?)/i);
    return match ? Number(match[1].replace(/,/g, "")).toFixed(2) : "";
  }

  function findMerchant(text) {
    const labeled = text.match(/(?:merchant|store|seller|vendor|retailer)\s*[:\-]\s*([^\n]+)/i);
    if (labeled) return labeled[1].trim().replace(/[.|]+$/, "");
    const confirmation = text.match(/order\s+confirmation\s*[—–-]\s*([^\n]+)/i);
    if (confirmation) return confirmation[1].trim();
    const firstLine = text.split(/\r?\n/).map((line) => line.trim()).find((line) => line && !/^order\b/i.test(line));
    return firstLine && firstLine.length < 70 ? firstLine.replace(/[.|]+$/, "") : "";
  }

  function findItem(text) {
    const labeled = text.match(/(?:item|product|description)\s*[:\-]\s*([^\n]+)/i);
    if (labeled) return labeled[1].trim().replace(/[.|]+$/, "");
    return "";
  }

  function findRequest(text, amount) {
    const request = text.match(/(?:request|requested resolution|customer request)\s*[:\-]\s*([^\n]+)/i);
    if (request) return request[1].trim().replace(/[.|]+$/, "");
    if (amount) return `A refund of $${amount} to the original payment method`;
    return "A refund to the original payment method";
  }

  function inferIssue(text) {
    const match = ISSUE_TERMS.find(([, term]) => term.test(text));
    return match ? match[0] : "poor_service";
  }

  function extractDateEvents(text, issueType) {
    const datePattern = /((?:20\d{2}-\d{1,2}-\d{1,2})|(?:[A-Za-z]{3,9}\s+\d{1,2},?\s+20\d{2})|(?:\d{1,2}\/\d{1,2}\/20\d{2}))/g;
    const matches = [...text.matchAll(datePattern)];
    const events = [];
    const seen = new Set();
    matches.forEach((match) => {
      const date = normalizeDate(match[1]);
      if (!date || seen.has(date)) return;
      seen.add(date);
      const lineStart = text.lastIndexOf("\n", match.index) + 1;
      const lineEnd = text.indexOf("\n", match.index);
      const context = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd).replace(/\s+/g, " ").trim();
      let event = "Purchase or order activity recorded";
      if (/promised|expected|due|delivery date/i.test(context)) event = "Promised delivery date recorded";
      else if (/refund/i.test(context)) event = "Refund request or refund update recorded";
      else if (/arriv|deliver|package|shipment/i.test(context)) event = issueType === "missing_delivery" ? "Delivery problem reported" : "Delivery activity recorded";
      else if (/order|purchase|confirmation|paid|charged/i.test(context)) event = "Order placed or payment recorded";
      events.push({ date, event, reference: "Uploaded text" });
    });
    return events.sort((a, b) => a.date.localeCompare(b.date));
  }

  function parseCase(text) {
    const issueType = inferIssue(text);
    const orderMatch = text.match(/\border\s*(?:id|number|no\.?)?\s*(?:#|:|-)\s*([A-Z0-9][A-Z0-9-]{3,})\b/i)
      || text.match(/\border\s+(?:id|number|no\.?)\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{3,})\b/i)
      || text.match(/\border\s+([A-Z0-9-]{4,}\d[A-Z0-9-]*)\b/i);
    const amount = findMoney(text);
    const orderDate = findDateAfter("(?:order\\s+date|purchased|purchase\\s+date)", text);
    const promisedDate = findDateAfter("(?:promised\\s+delivery|expected\\s+delivery|delivery\\s+by|due)", text);
    const deliveryDate = findDateAfter("(?:delivered|delivery\\s+date|arrived)", text);
    const timeline = extractDateEvents(text, issueType);
    const foundCount = [findMerchant(text), orderMatch && orderMatch[1], amount, orderDate || promisedDate].filter(Boolean).length;
    const confidence = Math.min(0.98, Math.max(0.54, 0.55 + foundCount * 0.1));
    return {
      merchant: findMerchant(text),
      orderId: orderMatch ? orderMatch[1] : "",
      orderDate,
      itemDescription: findItem(text),
      amountPaid: amount,
      deliveryDate,
      promisedDate,
      issueType,
      problemDescription: ISSUE_LABELS[issueType],
      customerRequest: findRequest(text, amount),
      confidence,
      missing: [
        !findMerchant(text) ? "Merchant name" : "",
        !orderMatch ? "Order number" : "",
        !amount ? "Amount paid" : "",
        !timeline.length ? "At least one dated event" : ""
      ].filter(Boolean)
    };
  }

  function renderStepper(activeStage) {
    const stages = ["intake", "review", "draft"];
    const labels = ["Evidence", "Review facts", "Draft request"];
    return `<div class="stepper" aria-label="Case progress">
      ${stages.map((stage, index) => {
        const active = stage === activeStage;
        const done = stages.indexOf(activeStage) > index;
        return `${index ? `<div class="step-line ${done ? "done" : ""}"></div>` : ""}<div class="step ${active ? "active" : ""} ${done ? "done" : ""}"><span class="step-badge">${done ? "✓" : index + 1}</span><span>${labels[index]}</span></div>`;
      }).join("")}
    </div>`;
  }

  function renderHeading(eyebrow, title, description) {
    return `<div class="page-heading"><div><div class="eyebrow">${escapeHtml(eyebrow)}</div><h1>${escapeHtml(title)}</h1></div><p>${escapeHtml(description)}</p></div>`;
  }

  function renderIntake() {
    const files = state.files.length ? `<div class="file-list" aria-label="Attached files">${state.files.map((file, index) => `<div class="file-row"><div class="file-icon">${escapeHtml(file.extension)}</div><div class="file-copy"><strong>${escapeHtml(file.name)}</strong><span>${formatBytes(file.size)} · ${escapeHtml(file.status)}</span></div><button type="button" class="file-remove" data-remove-file="${index}" aria-label="Remove ${escapeHtml(file.name)}">×</button></div>`).join("")}</div>` : "";
    const error = state.error ? `<div class="alert" role="alert">${escapeHtml(state.error)}</div>` : "";
    return `${renderHeading("New case / U.S. online purchase", "Build a case pack", "Turn the messy trail of receipts and support messages into a clear, reviewable request.")}
      ${renderStepper("intake")}
      <div class="builder-grid" id="builder">
        <section class="panel intake-panel" aria-labelledby="intake-title">
          <div class="panel-heading"><div><div class="eyebrow">01 / Evidence</div><h2 id="intake-title">Start with the facts</h2><p>Upload the proof you already have. CaseKit will organize what is present and flag what is missing.</p></div><span class="panel-badge">Private by default</span></div>
          <label class="dropzone" id="dropzone" for="file-input"><div class="upload-icon" aria-hidden="true">↥</div><div class="drop-copy"><strong>Drop receipts, order emails, or screenshots</strong><span>PDF, JPG, PNG, or pasted email text · 10 MB max per file</span></div><span class="button button-secondary">Choose files</span><input class="sr-only" id="file-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.txt,.eml" /></label>
          ${files}
          <div class="or-divider"><span>or paste email text</span></div>
          <label class="field-label" for="source-text">Order confirmation or merchant conversation</label>
          <textarea class="source-text" id="source-text" maxlength="8000" placeholder="Paste the order details and any replies from the merchant here…">${escapeHtml(state.sourceText)}</textarea>
          <div class="textarea-footer"><span class="muted-meta" id="char-count">${state.sourceText.length} / 8,000</span><button class="sample-button" type="button" id="sample-button">Use a sample case</button></div>
          ${error}
          <div class="safety-note"><span class="lock" aria-hidden="true">⌑</span><span>This demo keeps your text in this browser tab. Nothing is sent to a merchant or saved to an account.</span></div>
          <div class="panel-footer"><span class="muted-meta">You will review every fact before a draft is created.</span><button class="button button-primary button-large" type="button" id="analyze-button" ${state.sourceText.trim() || state.files.length ? "" : "disabled"}>Analyze evidence <span class="arrow">→</span></button></div>
        </section>
        <aside class="side-stack" aria-label="CaseKit guidance">
          <section class="panel side-card"><div class="mini-label">The five-minute path</div><div class="how-list"><div class="how-item"><div class="how-number">1</div><div><strong>Bring your proof</strong><span>Receipts, confirmations, screenshots, and support replies.</span></div></div><div class="how-item"><div class="how-number">2</div><div><strong>Correct the record</strong><span>Review extracted facts and fill the small gaps.</span></div></div><div class="how-item"><div class="how-number">3</div><div><strong>Approve the ask</strong><span>Get a grounded draft and decide what happens next.</span></div></div></div></section>
          <section class="panel side-card"><h3>Useful evidence</h3><ul class="evidence-list"><li><span class="check">✓</span><span>Order number and purchase date</span></li><li><span class="check">✓</span><span>Amount paid and item description</span></li><li><span class="check">✓</span><span>Promised date or return window</span></li><li><span class="check">✓</span><span>What you already asked the merchant</span></li></ul></section>
          <div class="security-card"><span class="security-icon" aria-hidden="true">✧</span><div><strong>Built with a safety stop</strong><p>Unsupported claims and external sending stay behind an explicit approval step.</p></div></div>
        </aside>
      </div>`;
  }

  function renderReview() {
    const facts = state.facts || {};
    const missing = facts.missing || [];
    const sourceCount = state.files.length + (state.sourceText.trim() ? 1 : 0);
    return `${renderHeading("New case / review", "Check the record", "CaseKit found the details below. Correct anything that is off before it writes a request.")}
      ${renderStepper("review")}
      <div class="case-workspace" id="builder">
        <section class="panel case-top"><div class="case-heading"><div class="case-symbol" aria-hidden="true">⌁</div><div><h2>${escapeHtml(facts.merchant || "Unnamed merchant")}</h2><p>${escapeHtml(facts.orderId ? `Order #${facts.orderId}` : "Order number not found")} · ${sourceCount} source${sourceCount === 1 ? "" : "s"} · Local draft only</p></div></div><div class="case-actions"><span class="status-pill"><span class="status-dot"></span> Review required</span></div></section>
        <div class="workspace-grid"><section class="panel timeline-panel"><div class="section-title-row"><h3>What happened</h3><span class="section-kicker">Evidence timeline</span></div>${renderTimeline(state.timeline)}<div class="source-summary"><span>◌</span><span>Built from <strong>${sourceCount} source${sourceCount === 1 ? "" : "s"}</strong>. Dates are suggestions until you confirm them.</span></div></section>
          <section class="panel review-panel"><div class="section-title-row"><h3>Fact review</h3><span class="section-kicker">Editable</span></div><div class="confidence-box"><div class="confidence-score">${Math.round((facts.confidence || .6) * 100)}%</div><div class="confidence-copy"><strong>Evidence coverage</strong><span>Higher when your source includes dates and amounts.</span></div><div class="confidence-bar"><span style="width:${Math.round((facts.confidence || .6) * 100)}%"></span></div></div><form class="fact-form" id="fact-form"><div class="form-field"><label for="fact-merchant">Merchant</label><input id="fact-merchant" name="merchant" value="${escapeHtml(facts.merchant)}" class="${missing.includes("Merchant name") ? "missing" : ""}" /></div><div class="form-field"><label for="fact-order">Order number</label><input id="fact-order" name="orderId" value="${escapeHtml(facts.orderId)}" class="${missing.includes("Order number") ? "missing" : ""}" /></div><div class="form-field"><label for="fact-amount">Amount paid</label><input id="fact-amount" name="amountPaid" inputmode="decimal" value="${escapeHtml(facts.amountPaid)}" placeholder="e.g. 84.99" class="${missing.includes("Amount paid") ? "missing" : ""}" /></div><div class="form-field"><label for="fact-order-date">Order date</label><input id="fact-order-date" name="orderDate" type="date" value="${escapeHtml(facts.orderDate)}" /></div><div class="form-field"><label for="fact-issue">Issue type</label><select id="fact-issue" name="issueType">${Object.entries(ISSUE_LABELS).map(([value, label]) => `<option value="${value}" ${facts.issueType === value ? "selected" : ""}>${label}</option>`).join("")}</select></div><div class="form-field"><label for="fact-promised">Promised date</label><input id="fact-promised" name="promisedDate" type="date" value="${escapeHtml(facts.promisedDate)}" /></div><div class="form-field full"><label for="fact-item">Item description</label><input id="fact-item" name="itemDescription" value="${escapeHtml(facts.itemDescription)}" placeholder="What did you buy?" /></div><div class="form-field full"><label for="fact-request">Desired resolution</label><input id="fact-request" name="customerRequest" value="${escapeHtml(facts.customerRequest)}" /></div></form><div class="missing-note ${missing.length ? "show" : ""}" id="missing-note"><strong>Worth checking:</strong> ${escapeHtml(missing.join(" · "))}. You can continue, but the draft will leave any unsupported detail out.</div><div class="review-footer"><button class="button button-quiet" type="button" id="back-to-intake">← Back to evidence</button><button class="button button-primary" type="button" id="generate-button">Generate safe draft <span class="arrow">→</span></button></div></section></div>
      </div>`;
  }

  function renderTimeline(events) {
    if (!events.length) return `<div class="empty-state"><div><h2>No dated events yet</h2><p>Add dates in the fact review or paste a support conversation with its timestamps.</p></div></div>`;
    return `<div class="timeline">${events.map((item) => `<div class="timeline-item"><span class="timeline-marker"></span><div><div class="timeline-date">${escapeHtml(formatDate(item.date))}</div><div class="timeline-event">${escapeHtml(item.event)}</div><span class="evidence-ref">↳ ${escapeHtml(item.reference || "Uploaded text")}</span></div></div>`).join("")}</div>`;
  }

  function buildDraft(facts) {
    const merchant = facts.merchant || "the merchant";
    const order = facts.orderId ? ` for order #${facts.orderId}` : "";
    const amount = facts.amountPaid ? `$${facts.amountPaid}` : "the amount paid";
    const issue = ISSUE_LABELS[facts.issueType] || "the issue with my order";
    const itemLine = facts.itemDescription ? `The item was ${facts.itemDescription}.` : "I have attached the purchase records for reference.";
    const orderLine = facts.orderDate ? `I placed ${facts.orderId ? `order #${facts.orderId}` : "the order"} on ${formatDate(facts.orderDate)}.` : `I am contacting you about order${order}.`;
    const dateLine = facts.promisedDate ? `The promised delivery date was ${formatDate(facts.promisedDate)}.` : "The attached records show the relevant order and support history.";
    const request = facts.customerRequest || `a refund of ${amount} to the original payment method`;
    return {
      subject: `Request for ${issue.toLowerCase()} —${facts.orderId ? ` order #${facts.orderId}` : " purchase records"}`,
      body: `Hello ${merchant} support,\n\n${orderLine}\n${itemLine}\n${dateLine}\n\nI am writing because of the following issue: ${issue.toLowerCase()}. I previously contacted support about this matter, as reflected in the attached records.\n\nPlease help with ${request}. Please confirm the next step and the expected timing in writing.\n\nI have attached the purchase records and support messages that support the facts above. I am happy to provide any additional information needed.\n\nThank you,\n[Your name]`
    };
  }

  function renderDraft() {
    const facts = state.facts || {};
    const draft = state.draft || buildDraft(facts);
    const claims = [
      facts.merchant ? `Merchant: ${facts.merchant}` : "Merchant name still needs confirmation",
      facts.orderId ? `Order: #${facts.orderId}` : "Order number omitted",
      facts.amountPaid ? `Amount: $${facts.amountPaid}` : "Amount omitted until confirmed",
      facts.promisedDate ? `Promised date: ${formatDate(facts.promisedDate)}` : "Promised date omitted"
    ];
    const status = state.approved ? "Approved locally · not sent" : "Draft ready · approval required";
    return `${renderHeading("New case / draft", "Make the ask clearly", "This draft stays grounded in the facts you reviewed. Edit it freely, then decide whether to use it.")}
      ${renderStepper("draft")}
      <div class="case-workspace" id="builder"><section class="panel case-top"><div class="case-heading"><div class="case-symbol" aria-hidden="true">✓</div><div><h2>${escapeHtml(facts.merchant || "Unnamed merchant")}</h2><p>${escapeHtml(facts.orderId ? `Order #${facts.orderId}` : "Order number omitted")} · ${escapeHtml(ISSUE_LABELS[facts.issueType] || "Complaint request")}</p></div></div><div class="case-actions"><span class="status-pill"><span class="status-dot"></span> ${escapeHtml(status)}</span></div></section><section class="panel draft-panel"><div class="section-title-row"><div><h3>Refund request draft</h3><span class="section-kicker">Nothing sends from this page</span></div><span class="panel-badge">Evidence checked</span></div><div class="draft-layout"><div class="draft-paper"><div class="draft-paper-head"><span>Message preview</span><span class="draft-badge">Editable</span></div><div class="draft-content"><div class="draft-subject"><label for="draft-subject">Subject</label><input id="draft-subject" value="${escapeHtml(draft.subject)}" /></div><label class="sr-only" for="draft-body">Draft message</label><textarea class="draft-body" id="draft-body">${escapeHtml(draft.body)}</textarea></div></div><aside class="draft-side"><div class="guardrail-card"><h4>Safety check</h4><div class="guardrail-row"><span class="guardrail-check">✓</span><span>No legal conclusion or refund promise</span></div><div class="guardrail-row"><span class="guardrail-check">✓</span><span>No fraud allegation or threat</span></div><div class="guardrail-row"><span class="guardrail-check">✓</span><span>External sending remains off</span></div></div><div class="evidence-card"><h4>Facts referenced</h4>${claims.map((claim, index) => `<div class="claim-row"><span class="claim-ref">[${index + 1}]</span><span>${escapeHtml(claim)}</span></div>`).join("")}</div></aside></div><div class="approval-note ${state.approved ? "show" : ""}" id="approval-note">The draft is marked ready locally. No message was sent, no evidence was shared, and nothing was saved outside this browser tab.</div><div class="draft-actions"><div class="draft-actions-left"><button class="button button-quiet" type="button" id="edit-facts">← Edit facts</button><button class="button button-secondary" type="button" id="copy-draft">Copy draft</button><button class="button button-secondary" type="button" id="download-draft">Download .txt</button></div><div class="draft-actions-right"><button class="button button-teal button-large" type="button" id="approve-draft">${state.approved ? "Approved locally" : "Mark ready to send"} <span class="arrow">${state.approved ? "✓" : "→"}</span></button></div></div></section></div>`;
  }

  function render() {
    if (state.stage === "review") app.innerHTML = renderReview();
    else if (state.stage === "draft") app.innerHTML = renderDraft();
    else app.innerHTML = renderIntake();
    bindEvents();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function updateSourceText(value) {
    state.sourceText = value.slice(0, 8000);
    const count = document.getElementById("char-count");
    if (count) count.textContent = `${state.sourceText.length.toLocaleString()} / 8,000`;
    const analyze = document.getElementById("analyze-button");
    if (analyze) analyze.disabled = !(state.sourceText.trim() || state.files.length);
  }

  async function addFiles(fileList) {
    const accepted = ["application/pdf", "image/jpeg", "image/png", "text/plain", "message/rfc822"];
    const next = [];
    for (const file of Array.from(fileList)) {
      const extension = (file.name.split(".").pop() || "file").toUpperCase();
      if (!accepted.includes(file.type) && !["PDF", "JPG", "JPEG", "PNG", "TXT", "EML"].includes(extension)) {
        showToast(`${file.name} is not a supported file type.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast(`${file.name} is larger than 10 MB.`);
        continue;
      }
      next.push({ name: file.name, size: file.size, extension: extension === "JPEG" ? "JPG" : extension, status: file.type === "text/plain" || extension === "EML" ? "Text can be read in this demo" : "Attached · visual analysis queued", raw: file });
      if ((file.type === "text/plain" || extension === "EML") && !state.sourceText.trim()) {
        try { updateSourceText(await file.text()); } catch (_) { /* Keep the attachment if local text access fails. */ }
      }
    }
    if (next.length) {
      state.files = state.files.concat(next).slice(0, 8);
      render();
      showToast(`${next.length} file${next.length === 1 ? "" : "s"} attached for review.`);
    }
  }

  function collectFactsFromForm() {
    const form = document.getElementById("fact-form");
    const formData = new FormData(form);
    const facts = Object.fromEntries(formData.entries());
    facts.confidence = state.facts.confidence;
    facts.problemDescription = ISSUE_LABELS[facts.issueType] || "";
    facts.missing = [
      !facts.merchant.trim() ? "Merchant name" : "",
      !facts.orderId.trim() ? "Order number" : "",
      !facts.amountPaid.trim() ? "Amount paid" : "",
      !state.timeline.length ? "At least one dated event" : ""
    ].filter(Boolean);
    state.facts = facts;
    return facts;
  }

  function bindEvents() {
    const source = document.getElementById("source-text");
    if (source) source.addEventListener("input", (event) => updateSourceText(event.target.value));

    const sampleButton = document.getElementById("sample-button");
    if (sampleButton) sampleButton.addEventListener("click", () => { updateSourceText(SAMPLE_TEXT); showToast("Sample case added. Review the details, then analyze it."); });

    const fileInput = document.getElementById("file-input");
    const dropzone = document.getElementById("dropzone");
    if (fileInput) fileInput.addEventListener("change", (event) => addFiles(event.target.files));
    if (dropzone) {
      ["dragenter", "dragover"].forEach((name) => dropzone.addEventListener(name, (event) => { event.preventDefault(); dropzone.classList.add("is-dragover"); }));
      ["dragleave", "drop"].forEach((name) => dropzone.addEventListener(name, (event) => { event.preventDefault(); dropzone.classList.remove("is-dragover"); }));
      dropzone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));
    }

    document.querySelectorAll("[data-remove-file]").forEach((button) => button.addEventListener("click", () => { state.files.splice(Number(button.dataset.removeFile), 1); render(); }));

    const analyze = document.getElementById("analyze-button");
    if (analyze) analyze.addEventListener("click", () => {
      if (!state.sourceText.trim() && !state.files.length) { state.error = "Add a pasted message or attach at least one supported file to continue."; render(); return; }
      if (!state.sourceText.trim()) {
        state.error = "This browser-only prototype can attach PDFs and images, but it needs pasted text to extract facts. Add the order or support message below, or use the sample case.";
        render();
        return;
      }
      state.error = "";
      state.facts = parseCase(state.sourceText);
      state.timeline = extractDateEvents(state.sourceText, state.facts.issueType);
      state.stage = "review";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const back = document.getElementById("back-to-intake");
    if (back) back.addEventListener("click", () => { state.stage = "intake"; render(); });

    const generate = document.getElementById("generate-button");
    if (generate) generate.addEventListener("click", () => {
      collectFactsFromForm();
      state.draft = buildDraft(state.facts);
      state.approved = false;
      state.stage = "draft";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const editFacts = document.getElementById("edit-facts");
    if (editFacts) editFacts.addEventListener("click", () => { state.stage = "review"; render(); });

    const subject = document.getElementById("draft-subject");
    const body = document.getElementById("draft-body");
    if (subject) subject.addEventListener("input", (event) => { state.draft.subject = event.target.value; });
    if (body) body.addEventListener("input", (event) => { state.draft.body = event.target.value; });

    const copy = document.getElementById("copy-draft");
    if (copy) copy.addEventListener("click", async () => {
      const text = `Subject: ${state.draft.subject}\n\n${state.draft.body}`;
      try { await navigator.clipboard.writeText(text); showToast("Draft copied to your clipboard."); } catch (_) { showToast("Copy is unavailable here; select the draft text to copy it."); }
    });

    const download = document.getElementById("download-draft");
    if (download) download.addEventListener("click", () => {
      const blob = new Blob([`Subject: ${state.draft.subject}\n\n${state.draft.body}`], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "casekit-refund-request.txt";
      link.click();
      URL.revokeObjectURL(url);
      showToast("Draft downloaded as a text file.");
    });

    const approve = document.getElementById("approve-draft");
    if (approve) approve.addEventListener("click", () => { state.approved = true; render(); showToast("Marked ready locally. Nothing was sent."); });

    document.querySelectorAll("[data-reset-case]").forEach((link) => link.addEventListener("click", () => { state.stage = "intake"; state.sourceText = ""; state.files = []; state.facts = null; state.timeline = []; state.draft = null; state.approved = false; render(); }));
  }

  render();
})();
