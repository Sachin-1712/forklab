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
  const tone =
    status === "Verified" ? "ok"
      : status === "Running" ? "info"
        : "warn";

  return (
    <div className={`card${live ? " card-glow" : ""}`}>
      <div className="status-row" style={{ marginBottom: 10 }}>
        <span className={`badge ${tone}`}>{status}</span>
        <span className="badge">{live ? "◆ Live BrowserPod" : "◇ Planned"}</span>
      </div>
      <h3 style={{ fontSize: 16 }}>{title}</h3>
      <p style={{ color: "var(--outline)", marginBottom: 0, fontSize: 13 }}>
        {description}
      </p>
    </div>
  );
}
