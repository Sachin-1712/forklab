"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  applyRunEvent,
  branchPath,
  createRunSnapshot,
  loadRunSnapshot,
  publishRunEvent,
  saveRunSnapshot,
  subscribeToRunEvents,
  type BranchId,
  type BranchSnapshot,
  type RunSnapshot,
} from "@/lib/runEvents";

export default function RunDashboardPage() {
  const params = useParams<{ runId: string }>();
  const runId = paramValue(params.runId);
  const [snapshot, setSnapshot] = useState<RunSnapshot | null>(null);

  useEffect(() => {
    const savedSnapshot =
      loadRunSnapshot(runId) ??
      createRunSnapshot({
        runId,
        prompt: "Fix the tenant access-control bug and compare queued branches.",
      });

    setSnapshot(savedSnapshot);
    saveRunSnapshot(runId, savedSnapshot);

    return subscribeToRunEvents(runId, (event) => {
      setSnapshot((current) => {
        const baseSnapshot = current ?? savedSnapshot;
        const nextSnapshot = applyRunEvent(baseSnapshot, event);
        saveRunSnapshot(runId, nextSnapshot);
        return nextSnapshot;
      });
    });
  }, [runId]);

  const branches = snapshot?.branches ?? [];
  const events = snapshot?.events ?? [];
  const verifiedCount = useMemo(
    () => branches.filter((branch) => branch.status === "Live verified").length,
    [branches],
  );

  function openBranch(branchId: BranchId) {
    const opened = window.open(branchPath(runId, branchId), "_blank");

    if (!opened) {
      setSnapshot((current) => {
        if (!current) return current;
        const nextSnapshot = { ...current, tabsBlocked: true };
        saveRunSnapshot(runId, nextSnapshot);
        return nextSnapshot;
      });
    }
  }

  function openAllBranches() {
    let blocked = false;
    branches.forEach((branch) => {
      const opened = window.open(branchPath(runId, branch.id), "_blank");
      if (!opened) blocked = true;
    });

    if (blocked) {
      setSnapshot((current) => {
        if (!current) return current;
        const nextSnapshot = { ...current, tabsBlocked: true };
        saveRunSnapshot(runId, nextSnapshot);
        return nextSnapshot;
      });
    }
  }

  return (
    <div className="run-shell">
      <header className="run-hero">
        <div>
          <p className="eyebrow">Live Agent Run</p>
          <h1>Live Agent Run</h1>
          <p className="muted-copy">
            BroadcastChannel orchestration for branch tabs. The SEC-101 branch
            publishes real /workbench BrowserPod proof events as it progresses.
          </p>
        </div>
        <div className="run-id-panel">
          <span>runId</span>
          <strong>{runId}</strong>
        </div>
      </header>

      {snapshot?.tabsBlocked ? (
        <section className="info-callout">
          Some branch tabs may have been blocked by the browser. Use the manual
          branch buttons below to open them one at a time.
        </section>
      ) : null}

      <section className="run-prompt-panel">
        <div>
          <p className="eyebrow">Task prompt</p>
          <h2>{snapshot?.prompt ?? "Loading run..."}</h2>
        </div>
        <div className="status-row">
          <span className="badge ok">{verifiedCount} verified</span>
          <span className="badge info">{branches.length} branches</span>
          <span className="badge">localStorage + BroadcastChannel</span>
        </div>
      </section>

      <section className="run-toolbar" aria-label="Run controls">
        <button className="button primary" type="button" onClick={openAllBranches}>
          Open all branch tabs
        </button>
        <button
          className="button"
          type="button"
          onClick={() => openBranch("access-control-fix")}
        >
          Open Access branch
        </button>
        <button
          className="button"
          type="button"
          onClick={() => openBranch("csv-export-fix")}
        >
          Open CSV branch
        </button>
        <button
          className="button"
          type="button"
          onClick={() => openBranch("email-validation-fix")}
        >
          Open Email branch
        </button>
        <button
          className="button"
          type="button"
          onClick={() => openBranch("sidebar-toggle-fix")}
        >
          Open Sidebar branch
        </button>
        <Link className="button" href="/sprint">
          Open /sprint proof
        </Link>
        <Link className="button" href="/workbench">
          Open /workbench
        </Link>
      </section>

      <div className="run-dashboard-grid">
        <section className="run-branch-grid">
          {branches.map((branch) => (
            <DashboardBranchCard branch={branch} key={branch.id} runId={runId} />
          ))}
        </section>

        <aside className="run-side-panels">
          <section className="card stack">
            <div>
              <p className="eyebrow">Event timeline</p>
              <h2>Real-time events</h2>
            </div>
            <div className="run-event-list">
              {events.length ? (
                events
                  .slice()
                  .reverse()
                  .map((event) => (
                    <div className="run-event" key={`${event.type}-${event.createdAt}`}>
                      <span>{new Date(event.createdAt).toLocaleTimeString()}</span>
                      <strong>{event.type}</strong>
                      <p>{event.message || event.branchId || "Run event"}</p>
                    </div>
                  ))
              ) : (
                <div className="run-empty-state">
                  Branch events appear here as tabs open and send progress.
                </div>
              )}
            </div>
          </section>

          <section className="truth-panel">
            <div>
              <p className="eyebrow">What is real?</p>
              <h2>Execution boundary</h2>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              <TruthRow label="Real" text="Access-Control branch launches the live /workbench BrowserPod proof." />
              <TruthRow label="Real" text="Sidebar branch runs its own deterministic BrowserPod proof." />
              <TruthRow label="Real" text="CSV branch can launch the live /sprint BrowserPod proof." />
              <TruthRow label="Preview" text="Email branch is prepared for a future BrowserPod branch." />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DashboardBranchCard({
  branch,
  runId,
}: {
  branch: BranchSnapshot;
  runId: string;
}) {
  const tone =
    branch.status === "Live verified"
      ? "ok"
      : branch.status.includes("Failed")
        ? "fail"
        : branch.status.includes("Queued")
          ? "warn"
          : "info";

  return (
    <article className={`run-branch-card ${branch.status === "Live verified" ? "card-glow" : ""}`}>
      <div className="status-row">
        <span className={`badge ${tone}`}>{branch.status}</span>
        <span className="badge">Risk: {branch.risk}</span>
      </div>
      <div>
        <h3>{branch.title}</h3>
        <p>{branch.description}</p>
      </div>
      <div className="run-progress" aria-label={`${branch.title} progress`}>
        <span style={{ width: `${branch.progress}%` }} />
      </div>
      <div className="agent-meta">
        <div>
          <span>Mode</span>
          <strong>{branch.mode}</strong>
        </div>
        <div>
          <span>Latest</span>
          <strong>{branch.detail}</strong>
        </div>
      </div>
      <pre className="agent-terminal">{branch.terminal.join("\n")}</pre>
      <Link className="button" href={branchPath(runId, branch.id)} target="_blank">
        Open branch tab
      </Link>
    </article>
  );
}

function TruthRow({ label, text }: { label: string; text: string }) {
  const tone = label === "Real" ? "ok" : label === "Preview" ? "info" : "warn";

  return (
    <div className="truth-row">
      <span className={`badge ${tone}`}>{label}</span>
      <p>{text}</p>
    </div>
  );
}

function paramValue(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
