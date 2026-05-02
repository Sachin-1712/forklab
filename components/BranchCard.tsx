export function BranchCard({
  title,
  status,
  live,
  description,
}: {
  title: string;
  status: string;
  live?: boolean;
  description: string;
}) {
  return (
    <div className="card">
      <div className="status-row" style={{ marginBottom: 12 }}>
        <span className={`badge ${status === "Verified" ? "ok" : "warn"}`}>
          {status}
        </span>
        <span className="badge">{live ? "Live BrowserPod" : "Planned branch"}</span>
      </div>
      <h3>{title}</h3>
      <p style={{ color: "var(--muted)", marginBottom: 0 }}>{description}</p>
    </div>
  );
}
