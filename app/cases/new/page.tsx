import Link from "next/link";
import { createCaseWithEvidence } from "./actions";

type NewCasePageProps = {
  searchParams: Promise<{ error?: string }>;
};

const issueTypes = [
  ["missing_delivery", "Missing delivery"],
  ["damaged_item", "Damaged item"],
  ["refund_not_received", "Refund not received"],
  ["duplicate_charge", "Duplicate charge"],
  ["return_rejected", "Return rejected"],
  ["cancelled_order", "Cancelled order"],
  ["poor_service", "Poor service"],
] as const;

export default async function NewCasePage({ searchParams }: NewCasePageProps) {
  const { error } = await searchParams;

  return (
    <div className="page-wrap">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Secure intake</div>
          <h1>New case</h1>
          <p>Create the case and attach only the evidence you want CaseKit to organize.</p>
        </div>
        <Link className="text-button intake-link-button" href="/cases">Back to cases</Link>
      </div>

      <section className="panel intake-panel">
        {error ? <div className="auth-error" role="alert">{error}</div> : null}
        <form action={createCaseWithEvidence} className="intake-form">
          <div className="intake-grid">
            <label>
              <span>Merchant</span>
              <input name="merchantName" required maxLength={160} placeholder="Merchant or marketplace" />
            </label>
            <label>
              <span>Issue type</span>
              <select name="issueType" required defaultValue="">
                <option value="" disabled>Select issue</option>
                {issueTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>

          <label>
            <span>Desired resolution</span>
            <textarea name="desiredResolution" rows={3} maxLength={1500} placeholder="For example: refund to the original payment method." />
          </label>

          <label>
            <span>Upload evidence</span>
            <input name="documents" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.txt,.eml,application/pdf,image/jpeg,image/png,text/plain,message/rfc822" />
            <small>PDF, JPEG, PNG, TXT, or EML. Maximum 10 MB per file. Uploaded content is treated as untrusted evidence, never as instructions.</small>
          </label>

          <label>
            <span>Or paste supporting text</span>
            <textarea name="pastedText" rows={8} placeholder="Paste order details, support messages, or other evidence here." />
          </label>

          <label className="retention-field">
            <span>Retention period</span>
            <select name="retentionDays" defaultValue="">
              <option value="">No expiry selected</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
            </select>
            <small>You can choose an expiry for uploaded evidence; no expiry is assumed automatically.</small>
          </label>

          <div className="intake-actions">
            <button className="primary-button" type="submit">Create case securely</button>
            <span>Nothing is emailed or submitted to a merchant by this action.</span>
          </div>
        </form>
      </section>
    </div>
  );
}
