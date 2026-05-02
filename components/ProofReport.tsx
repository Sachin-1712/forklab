export function ProofReport({
  status,
  checks,
  summary,
}: {
  status: "pending" | "passed" | "failed";
  checks: string[];
  summary: string;
}) {
  const tone = status === "passed" ? "ok" : status === "failed" ? "fail" : "warn";

  return (
    <div className="panel">
      <div className="status-row" style={{ marginBottom: 14 }}>
        <span className={`badge ${tone}`}>Proof report: {status}</span>
      </div>
      <p style={{ color: "var(--soft)" }}>{summary}</p>
      <div className="report">
        {checks.map((check) => (
          <div className="card" key={check}>
            <strong>{check}</strong>
            <span>{status === "passed" ? "Verified in BrowserPod" : "Waiting for run"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
