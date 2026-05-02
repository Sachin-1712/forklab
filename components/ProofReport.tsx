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
    <div className={`panel${status === "passed" ? " card-glow" : ""}`}>
      <div className="status-row" style={{ marginBottom: 12 }}>
        <span className={`badge ${tone}`}>
          {status === "passed" ? "✓" : status === "failed" ? "✗" : "◌"} Proof report: {status}
        </span>
      </div>
      <p style={{ color: "var(--outline)", fontSize: 13, lineHeight: 1.6 }}>{summary}</p>
      <div className="report">
        {checks.map((check) => (
          <div className="card" key={check}>
            <strong>{check}</strong>
            <span>
              {status === "passed" ? "✓ Verified in BrowserPod" : "Waiting for run"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
