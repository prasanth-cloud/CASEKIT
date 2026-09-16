const cases = [
  { id: "CK-1042", client: "Maya Chen", merchant: "Northstar Market", issue: "Refund not received", status: "Needs review", owner: "Prasanth", deadline: "Sep 18", activity: "12 min ago" },
  { id: "CK-1041", client: "Daniel Ortiz", merchant: "Aster Home", issue: "Damaged item", status: "Draft ready", owner: "Prasanth", deadline: "Sep 20", activity: "1 hr ago" },
  { id: "CK-1039", client: "Ava Brooks", merchant: "Field & Form", issue: "Return rejected", status: "Waiting", owner: "Rudra", deadline: "Sep 23", activity: "Yesterday" },
  { id: "CK-1037", client: "Noah Patel", merchant: "Orbit Supply", issue: "Missing delivery", status: "Processing", owner: "Rudra", deadline: "Sep 25", activity: "Yesterday" },
  { id: "CK-1035", client: "Sofia Kim", merchant: "Lumen Goods", issue: "Duplicate charge", status: "Resolved", owner: "Prasanth", deadline: "—", activity: "Sep 14" },
];

export default function CasesPage() {
  return (
    <div className="page-wrap cases-page">
      <header className="page-heading cases-heading">
        <div>
          <div className="eyebrow">Workspace</div>
          <h1>Cases</h1>
          <p>Track evidence, review status, deadlines, and recent work without leaving the case queue.</p>
        </div>
        <button className="primary-button" type="button">New case</button>
      </header>

      <section className="cases-toolbar" aria-label="Case controls">
        <label className="case-search">
          <span className="sr-only">Search cases</span>
          <input type="search" placeholder="Search case, client, or merchant…" />
        </label>
        <div className="case-filters">
          <button className="text-button filter-active" type="button">All cases <span>5</span></button>
          <button className="text-button" type="button">Needs attention <span>2</span></button>
          <button className="text-button" type="button">Open <span>4</span></button>
          <button className="text-button" type="button">Filter</button>
          <button className="text-button" type="button">Sort: Recent</button>
        </div>
      </section>

      <section className="panel cases-panel" aria-labelledby="cases-list-heading">
        <div className="panel-heading compact-panel-heading">
          <div>
            <h2 id="cases-list-heading">All cases</h2>
            <p>5 cases · updated just now</p>
          </div>
          <button className="text-button" type="button">Saved views</button>
        </div>
        <div className="table-wrap">
          <table className="cases-table">
            <thead><tr><th>Case</th><th>Client</th><th>Issue</th><th>Status</th><th>Responsible</th><th>Deadline</th><th>Recent activity</th></tr></thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id} tabIndex={0}>
                  <td><div className="primary-cell">{item.merchant}</div><div className="muted-cell">{item.id}</div></td>
                  <td>{item.client}</td>
                  <td>{item.issue}</td>
                  <td><span className={`status-badge status-${item.status.toLowerCase().replaceAll(" ", "-")}`}>{item.status}</span></td>
                  <td>{item.owner}</td>
                  <td className={item.deadline === "Sep 18" ? "deadline-soon" : ""}>{item.deadline}</td>
                  <td className="muted-cell">{item.activity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="cases-footer"><span>Showing 1–5 of 5</span><span>Reference data only · production data connects after authentication.</span></footer>
      </section>

      <div className="cases-state-note" role="note">
        <strong>Reference screen.</strong> Search, filter, sort, row focus, empty/loading/error states will use these same controls when live case data is connected.
      </div>
    </div>
  );
}
