import type { PodStatus } from "@/lib/browserpod";
import type { CSSProperties } from "react";

const statusLabels: Record<PodStatus, string> = {
  idle: "Idle",
  booting: "Booting pod",
  "writing-files": "Writing files",
  "running-command": "Running command",
  patching: "Applying patch",
  passed: "Passed",
  failed: "Failed",
};

const progress: Record<PodStatus, string> = {
  idle: "8%",
  booting: "28%",
  "writing-files": "48%",
  "running-command": "68%",
  patching: "78%",
  passed: "100%",
  failed: "100%",
};

export function BrowserPodStatusCard({
  status,
  title = "BrowserPod runtime",
  detail,
}: {
  status: PodStatus;
  title?: string;
  detail?: string;
}) {
  const tone = status === "passed" ? "ok" : status === "failed" ? "fail" : "info";

  return (
    <div className={`card status-card${status === "passed" ? " card-glow" : ""}`}>
      <div className="status-row">
        <span className={`badge ${tone}`}>{statusLabels[status]}</span>
        <span className="badge">SharedArrayBuffer</span>
        <span className="badge">Node 22</span>
      </div>
      <div>
        <h3 style={{ fontSize: 16 }}>{title}</h3>
        <p style={{ color: "var(--outline)", marginBottom: 0, fontSize: 13 }}>
          {detail ?? "Disposable in-browser sandbox controlled from ForkLab."}
        </p>
      </div>
      <div className="status-meter" aria-label={`Status: ${statusLabels[status]}`}>
        <span style={{ "--progress": progress[status] } as CSSProperties} />
      </div>
    </div>
  );
}
