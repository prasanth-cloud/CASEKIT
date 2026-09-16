import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import type { OutboundEmailCommandStatus, ReminderStatus, ReminderType } from "@/lib/database.types";
import { authorizeOutboundEmail, dismissFollowUpReminder, scheduleFollowUpReminder, setNotificationConsent } from "./follow-up-actions";
import styles from "./workspace.module.css";

type FollowUpPanelProps = { caseId: string };

function dateInputMin() {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

function statusLabel(status: ReminderStatus | ReminderType | OutboundEmailCommandStatus) {
  return status.replaceAll("_", " ");
}

export async function FollowUpPanel({ caseId }: FollowUpPanelProps) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const [profileResult, remindersResult, draftsResult, commandsResult] = await Promise.all([
    supabase.from("profiles").select("notification_consent").eq("id", auth.user.id).maybeSingle(),
    supabase
      .from("reminders")
      .select("id,reminder_type,due_at,status,idempotency_key,created_at")
      .eq("case_id", caseId)
      .order("due_at", { ascending: true }),
    supabase
      .from("drafts")
      .select("id,version,subject,status,approved_at,sent_at")
      .eq("case_id", caseId)
      .order("version", { ascending: false })
      .limit(1),
    supabase
      .from("outbound_email_commands")
      .select("id,draft_id,draft_version,recipient_email,attachment_document_ids,status,send_authorized_at,created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false }),
  ]);

  if (profileResult.error || remindersResult.error || draftsResult.error || commandsResult.error) {
    return <section className={`${styles.panel} ${styles.error}`} role="alert">Follow-up controls could not be loaded. Reload the case and try again.</section>;
  }

  const notificationConsent = profileResult.data?.notification_consent === true;
  const reminders = remindersResult.data ?? [];
  const latestDraft = draftsResult.data?.[0] ?? null;
  const canAuthorizeOutbound = Boolean(latestDraft?.status === "approved" && latestDraft.approved_at && !latestDraft.sent_at);
  const schedule = scheduleFollowUpReminder.bind(null, caseId);
  const consent = setNotificationConsent.bind(null, caseId);
  const dismiss = dismissFollowUpReminder.bind(null, caseId);
  const authorize = authorizeOutboundEmail.bind(null, caseId);

  return (
    <div className={styles.grid}>
      <section className={styles.panel} aria-labelledby="reminders-heading">
        <div className={styles.panelHeader}>
          <h2 id="reminders-heading">Follow-up reminders</h2>
          <p>Reminders stay inside CaseKit. No customer or merchant notification is sent by scheduling one.</p>
        </div>
        <div className={styles.readiness}>
          <div className={styles.consentRow}>
            <div>
              <strong>Reminder notifications</strong>
              <p>{notificationConsent ? "Enabled for this workspace." : "Disabled until you explicitly enable them."}</p>
            </div>
            <form action={consent}>
              <input type="hidden" name="notificationConsent" value={notificationConsent ? "false" : "true"} />
              <button className="text-button intake-link-button" type="submit">{notificationConsent ? "Disable" : "Enable"}</button>
            </form>
          </div>
          {notificationConsent ? (
            <form action={schedule} className={styles.form}>
              <input type="hidden" name="idempotencyKey" value={randomUUID()} />
              <label className={`${styles.field} ${styles.full}`}>Follow up on
                <input name="dueDate" type="date" min={dateInputMin()} required />
                <span className={styles.helper}>The preview boundary records 09:00 UTC on this date. Retries with the same form key do not create duplicates.</span>
              </label>
              <button className="primary-button" type="submit">Schedule follow-up</button>
            </form>
          ) : <p>Enable reminder notifications before scheduling a follow-up. Consent is checked again on the server.</p>}
        </div>
        <div className={styles.panelHeader}><h2>Reminder history</h2><p>Newest due date first.</p></div>
        <div className={styles.versionList}>
          {reminders.length ? reminders.map((reminder) => (
            <div className={styles.version} key={reminder.id}>
              <strong>{statusLabel(reminder.reminder_type)} · {statusLabel(reminder.status)}</strong>
              <div>Due {formatDate(reminder.due_at)}</div>
              {reminder.status === "scheduled" ? <form action={dismiss} className={styles.inlineForm}><input type="hidden" name="reminderId" value={reminder.id} /><button className="text-button intake-link-button" type="submit">Dismiss reminder</button></form> : null}
            </div>
          )) : <div className={styles.empty}>No follow-up reminders scheduled.</div>}
        </div>
      </section>

      <aside className={styles.panel} aria-labelledby="outbound-heading">
        <div className={styles.panelHeader}>
          <h2 id="outbound-heading">Outbound email boundary</h2>
          <p>Approval does not send. This step records explicit authorization for a later provider integration.</p>
        </div>
        <div className={styles.readiness}>
          {canAuthorizeOutbound && latestDraft ? (
            <>
              <p>Current approved draft: version <strong>{latestDraft.version}</strong> · {latestDraft.subject}</p>
              <form action={authorize} className={styles.form}>
                <input type="hidden" name="draftId" value={latestDraft.id} />
                <input type="hidden" name="draftVersion" value={latestDraft.version} />
                <input type="hidden" name="idempotencyKey" value={randomUUID()} />
                <label className={`${styles.field} ${styles.full}`}>Destination email
                  <input name="recipientEmail" type="email" autoComplete="email" required placeholder="you@example.com" />
                </label>
                <label className={styles.checkboxField}><input name="destinationConfirmed" type="checkbox" required /> I confirmed this destination.</label>
                <label className={styles.checkboxField}><input name="attachmentsConfirmed" type="checkbox" required /> I confirmed the attachment list. No attachments are selected.</label>
                <label className={styles.checkboxField}><input name="sendAuthorized" type="checkbox" required /> I understand this records authorization only; it sends nothing.</label>
                <button className="primary-button" type="submit">Record send authorization</button>
              </form>
            </>
          ) : <p>Approve the current grounded draft before recording an outbound authorization. No send control is available here.</p>}
        </div>
        <div className={styles.panelHeader}><h2>Authorization history</h2><p>Prepared commands are auditable and do not represent delivered messages.</p></div>
        <div className={styles.versionList}>
          {commandsResult.data?.length ? commandsResult.data.map((command) => (
            <div className={styles.version} key={command.id}>
              <strong>Draft v{command.draft_version} · {statusLabel(command.status)}</strong>
              <div>Destination {command.recipient_email} · authorized {formatDate(command.send_authorized_at)}</div>
              <div>{command.attachment_document_ids.length} attachment{command.attachment_document_ids.length === 1 ? "" : "s"}; no message sent by CaseKit.</div>
            </div>
          )) : <div className={styles.empty}>No outbound authorization recorded.</div>}
        </div>
      </aside>
    </div>
  );
}
