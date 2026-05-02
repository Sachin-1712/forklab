"use client";

import { useEffect, useState } from "react";
import { getBrowserPodApiKey } from "@/lib/browserpod";

type ChecklistState = {
  crossOriginIsolated: boolean;
  keyLoaded: boolean;
  smokeTestPassed: boolean;
  sprintProofPassed: boolean;
};

function hasBrowserPodKey() {
  const key = getBrowserPodApiKey();
  return Boolean(
    key && key !== "replace_me" && key !== "paste_browserpod_key_here",
  );
}

export function DemoReadyChecklist({
  sprintProofPassed,
  smokeTestPassed,
}: {
  sprintProofPassed?: boolean;
  smokeTestPassed?: boolean;
}) {
  const [state, setState] = useState<ChecklistState>({
    crossOriginIsolated: false,
    keyLoaded: false,
    smokeTestPassed: false,
    sprintProofPassed: false,
  });

  useEffect(() => {
    setState({
      crossOriginIsolated: window.crossOriginIsolated,
      keyLoaded: hasBrowserPodKey(),
      smokeTestPassed:
        smokeTestPassed ?? localStorage.getItem("forklab:smoke-test-passed") === "true",
      sprintProofPassed:
        sprintProofPassed ?? localStorage.getItem("forklab:sprint-proof-passed") === "true",
    });
  }, [smokeTestPassed, sprintProofPassed]);

  const checks = [
    ["crossOriginIsolated true", state.crossOriginIsolated],
    ["BrowserPod key loaded", state.keyLoaded],
    ["Smoke test passed", state.smokeTestPassed],
    ["Sprint proof passed", state.sprintProofPassed],
  ] as const;

  return (
    <section className="demo-checklist" aria-label="Demo Ready Checklist">
      <div className="status-row">
        <span className="badge info">Demo Ready Checklist</span>
      </div>
      <div className="checklist-grid">
        {checks.map(([label, passed]) => (
          <div className={passed ? "checklist-item ok" : "checklist-item"} key={label}>
            <span>{passed ? "✓" : "◌"}</span>
            <strong>{label}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
