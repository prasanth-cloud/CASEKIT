import Link from "next/link";
import { notFound } from "next/navigation";
import { factProvenance, humanize, isReadyForDrafting, caseIssueTypes } from "@/lib/cases/review";
import { createClient } from "@/lib/supabase/server";
import { markCaseReady, reviseCaseFacts } from "./actions";
import styles from "./workspace.module.css";

type CaseWorkspaceProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string; saved?: string; ready?: string }>;
};

const tabs = ["overview", "documents", "timeline", "tasks", "notes", "ai"] as const;
type Tab = (typeof tabs)[number];

function dateTime(value: string) {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function fileName(path: string) {
  return path.split("/").at(-1) || path;
}

export default async function CaseWorkspace({ params, searchParams }: CaseWorkspaceProps) {
  const { id } = await params;
  const query = await searchParams;
  const tab = tabs.includes(query.tab as Tab) ? (query.tab as Tab) : "overview";
  const supabase = await createClient();

  const { data: caseRow } = await supabase
    .from("cases")
    .select("id,merchant_name,issue_type,status,desired_resolution,created_at,updated_at")
    .eq("id", id)
    .single();

  if (!caseRow) notFound();

  const [{ data: facts }, { data: documents }, { data: auditEvents }] = await Promise.all([
    supabase
      .from("extracted_facts")
      .select("id,case_id,version,merchant,order_id,order_date,item_description,amount_paid,delivery_date,promised_date,issue_type,problem_description,customer_request,missing_information,confidence,source_document_ids,schema_version,extracted_by,is_current,created_at")
      .eq("case_id", id)
      .order("version", { ascending: false }),
    supabase
      .from("documents")
      .select("id,storage_path,file_type,byte_size,status,redaction_status,created_at")
      .eq("case_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_events")
      .select("id,actor_type,action,changes,supporting_document_ids,created_at")
      .eq("case_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const currentFacts = facts?.find((item) => item.is_current) ?? facts?.[0] ?? null;
  const provenance = currentFacts ? factProvenance(currentFacts) : null;
  const canAdvance = isReadyForDrafting(currentFacts);
  const displayMerchant = currentFacts?.merchant || caseRow.merchant_name || "Unnamed merchant";
  const revise = reviseCaseFacts.bind(null, id);
  const markReady = markCaseReady.bind(null, id);

  return (
    <div className={`page-wrap ${styles.workspace}`}>
      <header className={styles.header}>
        <div>
          <div className="eyebrow">Case workspace</div>
          <h1>{displayMerchant}</h1>
          <div className={styles.headerMeta}>
            <span>{id.slice(0, 8)}</span>
            <span className={`status-badge status-${caseRow.status.replaceAll("_", "-")}`}>{humanize(caseRow.status)}</span>
            <span>Updated {dateTime(caseRow.updated_at)}</span>
          </div>
        </div>
        <Link className="text-button intake-link-button" href="/cases">Back to cases</Link>
      </header>

      <nav className={styles.tabs} aria-label="Case workspace sections">
        {tabs.map((item) => (
          <Link key={item} href={`/cases/${id}?tab=${item}`} className={`${styles.tab} ${tab === item ? styles.activeTab : ""}`}>
            {item === "ai" ? "AI" : humanize(item)}
          </Link>
        ))}
      </nav>

      {query.error ? <div className={`${styles.notice} ${styles.error}`} role="alert">{query.error}</div> : null}
      {query.saved ? <div className={styles.notice}>Reviewed facts saved as a new immutable version.</div> : null}
      {query.ready ? <div className={styles.notice}>Case marked ready for the next drafting stage. No message was sent.</div> : null}

      {tab === "overview" ? (
        <div className={styles.grid}>
          <section className={styles.panel} aria-labelledby="facts-heading">
            <div className={styles.panelHeader}>
              <h2 id="facts-heading">Reviewed facts</h2>
              <p>Corrections create a new version. User edits are never presented as document-backed evidence.</p>
            </div>
            <form action={revise} className={styles.form}>
              <input type="hidden" name="expectedVersion" value={currentFacts?.version ?? 0} />
              <label className={styles.field}>Merchant<input name="merchant" defaultValue={currentFacts?.merchant ?? caseRow.merchant_name ?? ""} /></label>
              <label className={styles.field}>Order ID<input name="orderId" defaultValue={currentFacts?.order_id ?? ""} /></label>
              <label className={styles.field}>Order date<input name="orderDate" type="date" defaultValue={currentFacts?.order_date ?? ""} /></label>
              <label className={styles.field}>Amount paid<input name="amountPaid" type="number" min="0" step="0.01" defaultValue={currentFacts?.amount_paid ?? ""} /></label>
              <label className={`${styles.field} ${styles.full}`}>Item description<input name="itemDescription" defaultValue={currentFacts?.item_description ?? ""} /></label>
              <label className={styles.field}>Promised date<input name="promisedDate" type="date" defaultValue={currentFacts?.promised_date ?? ""} /></label>
              <label className={styles.field}>Delivery date<input name="deliveryDate" type="date" defaultValue={currentFacts?.delivery_date ?? ""} /></label>
              <label className={`${styles.field} ${styles.full}`}>Issue type
                <select name="issueType" defaultValue={currentFacts?.issue_type ?? caseRow.issue_type ?? ""}>
                  <option value="">Select issue</option>
                  {caseIssueTypes.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}
                </select>
              </label>
              <label className={`${styles.field} ${styles.full}`}>Problem description<textarea name="problemDescription" defaultValue={currentFacts?.problem_description ?? ""} /></label>
              <label className={`${styles.field} ${styles.full}`}>Requested resolution<textarea name="customerRequest" defaultValue={currentFacts?.customer_request ?? caseRow.desired_resolution ?? ""} /></label>
              <div className={styles.actions}>
                <div className={styles.provenance}>
                  {provenance?.kind === "evidence"
                    ? `${provenance.documentIds.length} evidence document${provenance.documentIds.length === 1 ? "" : "s"} linked to this extracted version.`
                    : currentFacts
                      ? "Current version was reviewed by the user; its edited values are user-sourced."
                      : "No extracted fact version exists yet."}
                </div>
                <button className="primary-button" type="submit">Save reviewed facts</button>
              </div>
            </form>
          </section>

          <aside className={styles.panel} aria-labelledby="readiness-heading">
            <div className={styles.panelHeader}><h2 id="readiness-heading">Readiness</h2><p>Required before drafting can begin.</p></div>
            <div className={styles.readiness}>
              <p>{canAdvance ? "Required facts are complete." : "Merchant, issue type, problem description, and requested resolution are required."}</p>
              <form action={markReady}>
                <input type="hidden" name="expectedVersion" value={currentFacts?.version ?? 0} />
                <button className="primary-button" type="submit" disabled={!canAdvance}>Mark ready for drafting</button>
              </form>
              <p>This changes workflow status only. It does not generate, approve, or send a message.</p>
            </div>
            <div className={styles.panelHeader}><h2>Version history</h2><p>Newest first.</p></div>
            <div className={styles.versionList}>
              {facts?.length ? facts.map((item) => (
                <div className={styles.version} key={item.id}>
                  <strong>Version {item.version}{item.is_current ? " · Current" : ""}</strong>
                  <div>{item.extracted_by === "user" ? "User reviewed" : "Evidence extraction"} · {dateTime(item.created_at)}</div>
                  <div>{item.extracted_by === "user" ? "User-sourced corrections" : `${item.source_document_ids.length} linked evidence document${item.source_document_ids.length === 1 ? "" : "s"}`}</div>
                </div>
              )) : <div className={styles.empty}>No fact versions yet.</div>}
            </div>
          </aside>
        </div>
      ) : null}

      {tab === "documents" ? (
        <section className={styles.panel} aria-labelledby="documents-heading">
          <div className={styles.panelHeader}><h2 id="documents-heading">Documents</h2><p>Private case evidence. Uploaded content remains untrusted data.</p></div>
          {documents?.length ? <ul className={styles.list}>{documents.map((document) => (
            <li key={document.id} className={styles.listItem}>
              <strong>{fileName(document.storage_path)}</strong>
              <span>{humanize(document.status)} · {document.file_type} · {(document.byte_size / 1024).toFixed(1)} KB · redaction {humanize(document.redaction_status)}</span>
              <span>Document ID {document.id}</span>
            </li>
          ))}</ul> : <div className={styles.empty}>No active documents.</div>}
        </section>
      ) : null}

      {tab === "timeline" ? (
        <section className={styles.panel} aria-labelledby="timeline-heading">
          <div className={styles.panelHeader}><h2 id="timeline-heading">Evidence timeline</h2><p>Audit events retain who changed what and which documents supported system-generated steps.</p></div>
          <div className={styles.timeline}>
            {auditEvents?.length ? auditEvents.map((event) => (
              <div className={styles.timelineItem} key={event.id}>
                <div className={styles.timelineTime}>{dateTime(event.created_at)}</div>
                <div className={styles.timelineBody}>
                  <strong>{humanize(event.action)}</strong>
                  <small>Actor: {humanize(event.actor_type)} · Supporting documents: {event.supporting_document_ids.length ? event.supporting_document_ids.join(", ") : "none"}</small>
                </div>
              </div>
            )) : <div className={styles.empty}>No timeline events yet.</div>}
          </div>
        </section>
      ) : null}

      {tab === "tasks" ? <section className={styles.panel}><div className={styles.panelHeader}><h2>Tasks</h2></div><div className={styles.placeholder}>Task execution is outside Stage 6. This workspace intentionally does not create external side effects.</div></section> : null}
      {tab === "notes" ? <section className={styles.panel}><div className={styles.panelHeader}><h2>Notes</h2></div><div className={styles.placeholder}>Notes are reserved for a later scoped stage; no unversioned customer data is added here.</div></section> : null}
      {tab === "ai" ? <section className={styles.panel}><div className={styles.panelHeader}><h2>AI</h2></div><div className={styles.placeholder}>AI remains contextual and evidence-bound. Draft generation is handled only after this review gate.</div></section> : null}
    </div>
  );
}
