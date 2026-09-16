import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { approveDraft, generateGroundedDraft, saveDraftEdits } from "./actions";
import { DraftTools } from "./draft-tools";
import styles from "./workspace.module.css";

type DraftPanelProps = { caseId: string };
type Sentence = { text: string; factual: boolean; claimIds: string[] };

function sentencesFrom(value: Json): Sentence[] {
  if (!value || Array.isArray(value) || typeof value !== "object" || !Array.isArray(value.sentences)) return [];
  return value.sentences.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== "object") return [];
    if (typeof item.text !== "string" || typeof item.factual !== "boolean" || !Array.isArray(item.claimIds)) return [];
    return [{
      text: item.text,
      factual: item.factual,
      claimIds: item.claimIds.filter((claim): claim is string => typeof claim === "string"),
    }];
  });
}

export async function DraftPanel({ caseId }: DraftPanelProps) {
  const supabase = await createClient();
  const { data: drafts } = await supabase
    .from("drafts")
    .select("id,version,facts_version,subject,body,structured_content,evidence_claim_ids,status,approved_at,created_at")
    .eq("case_id", caseId)
    .order("version", { ascending: false });

  const latest = drafts?.[0] ?? null;
  const sentences = latest ? sentencesFrom(latest.structured_content) : [];
  const factual = sentences.filter((sentence) => sentence.factual);
  const editableRequest = sentences.filter((sentence) => !sentence.factual).at(-1)?.text ?? "";
  const generate = generateGroundedDraft.bind(null, caseId);
  const save = saveDraftEdits.bind(null, caseId);
  const approve = approveDraft.bind(null, caseId);
  const editable = latest && (latest.status === "generated" || latest.status === "edited");

  if (!latest) {
    return (
      <section className={styles.panel} aria-labelledby="draft-heading">
        <div className={styles.panelHeader}>
          <h2 id="draft-heading">Grounded request draft</h2>
          <p>CaseKit creates factual sentences only from verified document-backed evidence claims. Nothing is sent.</p>
        </div>
        <div className={styles.readiness}>
          <p>Generate a first draft after reviewed facts have been marked ready. At least one verified evidence claim is required.</p>
          <form action={generate}><button className="primary-button" type="submit">Generate grounded draft</button></form>
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
        <form action={save} className={styles.form}>
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
            <DraftTools subject={latest.subject} body={latest.body} fileName={`casekit-draft-v${latest.version}.txt`} />
            {editable ? <button className="primary-button" type="submit">Save as new version</button> : null}
          </div>
        </form>
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
          ) : <p>Approved at {latest.approved_at ? new Date(latest.approved_at).toLocaleString("en-US") : "recorded"}. Sending remains a separate explicit action in a later stage.</p>}
          {editable ? <form action={generate}><button className="text-button intake-link-button" type="submit">Regenerate from current verified evidence</button></form> : null}
        </div>
        <div className={styles.panelHeader}><h2>Version history</h2><p>Immutable versions, newest first.</p></div>
        <div className={styles.versionList}>
          {drafts?.map((draft) => <div className={styles.version} key={draft.id}><strong>Version {draft.version} · {draft.status}</strong><div>{new Date(draft.created_at).toLocaleString("en-US")}</div></div>)}
        </div>
      </aside>
    </div>
  );
}
