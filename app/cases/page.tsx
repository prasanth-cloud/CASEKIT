import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function label(value: string | null) {
  if (!value) return "Not set";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type CasesPageProps = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const { q = "", status = "" } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("cases")
    .select("id,merchant_name,issue_type,status,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (q.trim()) query = query.ilike("merchant_name", `%${q.trim()}%`);
  if (status) query = query.eq("status", status as never);

  const { data: cases, error } = await query;

  return (
    <div className="page-wrap cases-page">
      <header className="page-heading cases-heading">
        <div>
          <div className="eyebrow">Workspace</div>
          <h1>Cases</h1>
          <p>Your case queue is loaded through Supabase RLS, so only records owned by the signed-in user are returned.</p>
        </div>
        <Link className="primary-button intake-link-button" href="/cases/new">New case</Link>
      </header>

      <form className="cases-toolbar" aria-label="Case controls">
        <label className="case-search">
          <span className="sr-only">Search cases</span>
          <input name="q" type="search" defaultValue={q} placeholder="Search merchant…" />
        </label>
        <div className="case-filters">
          <select name="status" defaultValue={status} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="processing">Processing</option>
            <option value="needs_review">Needs review</option>
            <option value="draft_ready">Draft ready</option>
            <option value="waiting_for_response">Waiting for response</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="blocked">Blocked</option>
          </select>
          <button className="text-button" type="submit">Apply</button>
          {(q || status) ? <Link className="text-button intake-link-button" href="/cases">Clear</Link> : null}
        </div>
      </form>

      <section className="panel cases-panel" aria-labelledby="cases-list-heading">
        <div className="panel-heading compact-panel-heading">
          <div>
            <h2 id="cases-list-heading">All cases</h2>
            <p>{cases?.length ?? 0} {(cases?.length ?? 0) === 1 ? "case" : "cases"}</p>
          </div>
        </div>

        {error ? (
          <div className="case-empty" role="alert">Case data could not be loaded. Please retry.</div>
        ) : cases && cases.length > 0 ? (
          <div className="table-wrap">
            <table className="cases-table">
              <thead><tr><th>Case</th><th>Issue</th><th>Status</th><th>Created</th><th>Recent activity</th></tr></thead>
              <tbody>
                {cases.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/cases/${item.id}`} className="primary-cell intake-link-button">{item.merchant_name || "Unnamed merchant"}</Link>
                      <div className="muted-cell">{item.id.slice(0, 8)}</div>
                    </td>
                    <td>{label(item.issue_type)}</td>
                    <td><span className={`status-badge status-${item.status.replaceAll("_", "-")}`}>{label(item.status)}</span></td>
                    <td>{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="muted-cell">{new Date(item.updated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="case-empty">
            <strong>No cases found.</strong>
            <span>{q || status ? "Change your filters or clear the search." : "Create a case and attach evidence to start the workflow."}</span>
            {!q && !status ? <Link className="primary-button intake-link-button" href="/cases/new">Create first case</Link> : null}
          </div>
        )}
      </section>
    </div>
  );
}
