import { parseDraftSentences } from "@/lib/ai/draft-schema";
import type { CaseStatus } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { approveDraft, generateGroundedDraft, saveDraftEdits } from "./actions";
import { DraftTools } from "./draft-tools";
import styles from "./workspace.module.css";

type DraftPanelProps = { caseId: string; caseStatus: CaseStatus };

export async function DraftPanel({ caseId, caseStatus }: DraftPanelProps) {
  const supabase = await createClient();
  const [draftsResult, evidenceResult] = await Promise.all([
    supabase
      .from("drafts")
      .select("id,version,facts_version,subject,body,structured_content,evidence_claim_ids,status,approved_at,created_at")
      .eq("case_id", caseId)
      .order("version", { ascending: false }),
    supabase
      .from("evidence_claims")
      .select("id", { count: "exact", head: true })
      .eq("case_id", caseId)
      .eq("verified", true)
      .not("document_id", "is", null),
  ]);

  if (draftsResult.error) {
    return <section className={`${styles.panel} ${styles.error}`} role="alert">Draft history could not be loaded. Reload the case and try again.</section>;
  }

  const drafts = draftsResult.data;
  const latest = drafts?.[0] ?? null;
  const sentences = latest ? parseDraftSentences(latest.structured_content) : null;
  const factual = sentences?.filter((sentence) => sentence.factual) ?? [];
  const editableRequest = sentences?.filter((sentence) => !sentence.factual).at(-1)?.text ?? "";
  const generate = generateGroundedDraft.bind(null, caseId);
  const save = saveDraftEdits.bind(null, caseId);
  const approve = approveDraft.bind(null, caseId);
  const draftValidationFailed = !sentences || factual.length === 0;
  const editable = Boolean(latest && sentences && factual.length > 0 && (latest.status === "generated" || latest.status === "edited"));
  const canRegenerate = Boolean(latest && (latest.status === "generated" || latest.status === "edited") && (caseStatus === "draft_ready" || caseStatus === "processing"));
  const canGenerate = caseStatus === "processing" && !evidenceResult.error && (evidenceResult.count ?? 0) > 0;

  if (!latest) {
    return (
      <section className={styles.panel} aria-labelledby="draft-heading">
        <div className={styles.panelHeader}>
          <h2 id="draft-heading">Grounded request draft</h2>
          <p>CaseKit creates factual sentences only from verified document-backed evidence claims. Nothing is sent.</p>
        </div>
        <div className={styles.readiness}>
          <p>{caseStatus === "processing" ? "Reviewed facts are ready for drafting." : "Mark reviewed facts ready before generating a draft."}</p>
          <p>{evidenceResult.error ? "Verified evidence is currently unavailable; reload after the evidence review completes." : `${evidenceResult.count ?? 0} verified document-backed evidence claim${evidenceResult.count === 1 ? "" : "s"} available.`}</p>
          <form action={generate}><button className="primary-button" type="submit" disabled={!canGenerate}>Generate grounded draft</button></form>
        </div>
      </section>
    );
  }

  return (
    <div className={styles.grid}>
      <section className={styles.panel} aria-labelledby="draft-heading">
        <div className={styles.panelHeader}>
          <h2 id="draft-heading">Grounded request draft · Version {latest.version}</h2>
          <p>Evidence-backed factual sentences are locked. You can edit only the subject and requested action without re-grounding the evidence.</p>
        </div>
        {draftValidationFailed ? (
          <div className={styles.readiness} role="alert">
            <p>This stored draft could not be validated, so its content is hidden from editing, copying, and download.</p>
            {canRegenerate ? <form action={generate}><button className="primary-button" type="submit">Regenerate from current verified evidence</button></form> : <p>Regeneration will be available after the case returns to a draft-ready state.</p>}
          </div>
        ) : (
          <form id={`draft-editor-${caseId}`} action={save} className={styles.form}>
            <input type="hidden" name="draftId" value={latest.id} />
            <input type="hidden" name="expectedVersion" value={latest.version} />
            <label className={`${styles.field} ${styles.full}`}>Subject
              <input name="subject" defaultValue={latest.subject} disabled={!editable} />
            </label>
            <div className={`${styles.field} ${styles.full}`}>
              <span>Evidence-backed facts</span>
              <div className={styles.versionList}>
                {factual.map((sentence, index) => (
                  <div className={styles.version} key={`${index}-${sentence.claimIds.join("-")}`}>
                    <strong>Locked factual sentence</strong>
                    <div>{sentence.text}</div>
                    <div>Evidence claim: {sentence.claimIds.join(", ")}</div>
                  </div>
                ))}
              </div>
            </div>
            <label className={`${styles.field} ${styles.full}`}>Requested action
              <textarea name="request" defaultValue={editableRequest} disabled={!editable} />
            </label>
            <div className={styles.actions}>
              <DraftTools
                formId={`draft-editor-${caseId}`}
                subject={latest.subject}
                factualText={factual.map((sentence) => sentence.text).join("\n\n")}
                fileName={`casekit-draft-v${latest.version}.txt`}
              />
              {editable ? <button className="primary-button" type="submit">Save as new version</button> : null}
            </div>
          </form>
        )}
      </section>

      <aside className={styles.panel} aria-labelledby="approval-heading">
        <div className={styles.panelHeader}>
          <h2 id="approval-heading">Approval</h2>
          <p>Approval records your reviewed draft state. It never sends a message.</p>
        </div>
        <div className={styles.readiness}>
          <p>Status: <strong>{latest.status}</strong></p>
          <p>{latest.evidence_claim_ids.length} evidence claim{latest.evidence_claim_ids.length === 1 ? "" : "s"} linked.</p>
          {editable ? (
            <form action={approve}>
              <input type="hidden" name="draftId" value={latest.id} />
              <input type="hidden" name="expectedVersion" value={latest.version} />
              <button className="primary-button" type="submit">Approve this draft</button>
            </form>
          ) : latest.status === "approved" ? <p>Approved at {latest.approved_at ? new Date(latest.approved_at).toLocaleString("en-US") : "recorded"}. Sending remains a separate explicit action in a later stage.</p> : <p>Draft content failed validation. Regenerate before editing or approving.</p>}
          {canRegenerate ? <form action={generate}><button className="text-button intake-link-button" type="submit">Regenerate from current verified evidence</button></form> : null}
        </div>
        <div className={styles.panelHeader}><h2>Version history</h2><p>Immutable versions, newest first.</p></div>
        <div className={styles.versionList}>
          {drafts?.map((draft) => <div className={styles.version} key={draft.id}><strong>Version {draft.version} · {draft.status}</strong><div>{new Date(draft.created_at).toLocaleString("en-US")}</div></div>)}
        </div>
      </aside>
    </div>
  );
}
