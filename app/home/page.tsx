const recentCases = [
  { name: "Laptop delivery dispute", status: "Needs review", updated: "Today" },
  { name: "Damaged furniture order", status: "Draft ready", updated: "Yesterday" },
  { name: "Missing package claim", status: "Waiting", updated: "Sep 14" },
];

const tasks = [
  { title: "Confirm delivery date evidence", due: "Today" },
  { title: "Review complaint draft", due: "Tomorrow" },
  { title: "Add merchant response", due: "Sep 19" },
];

export default function AuthenticatedHomePage() {
  return (
    <div className="page-wrap"><section className="page-heading"><div><h1>What needs attention</h1><p>Review active case work and upcoming tasks.</p></div></section><div className="content-grid"><section className="panel" aria-labelledby="recent-cases-heading"><div className="panel-heading"><div><h2 id="recent-cases-heading">Recent cases</h2><p>Recently accessed workspaces</p></div></div><div className="table-wrap"><table><thead><tr><th>Case</th><th>Status</th><th>Updated</th></tr></thead><tbody>{recentCases.map((item) => <tr key={item.name}><td className="primary-cell">{item.name}</td><td><span className="status-badge">{item.status}</span></td><td className="muted-cell">{item.updated}</td></tr>)}</tbody></table></div></section><section className="panel" aria-labelledby="tasks-heading"><div className="panel-heading"><div><h2 id="tasks-heading">Upcoming tasks</h2><p>Items requiring action</p></div></div><ul className="task-list">{tasks.map((task) => <li key={task.title}><span className="task-check" aria-hidden="true" /><span className="task-copy"><strong>{task.title}</strong><span>{task.due}</span></span></li>)}</ul></section></div></div>
  );
}
