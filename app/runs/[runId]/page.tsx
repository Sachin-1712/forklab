"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  applyRunEvent,
  branchPath,
  createRunSnapshot,
  createSidebarArenaBranchList,
  loadRunSnapshot,
  saveRunSnapshot,
  subscribeToRunEvents,
  type BranchId,
  type BranchSnapshot,
  type RunSnapshot,
} from "@/lib/runEvents";
import {
  isSidebarArenaBranch,
  sidebarArenaVariants,
} from "@/lib/sidebarArena";

export default function RunDashboardPage() {
  const params = useParams<{ runId: string }>();
  const runId = paramValue(params.runId);
  const [snapshot, setSnapshot] = useState<RunSnapshot | null>(null);

  useEffect(() => {
    const savedSnapshot =
      loadRunSnapshot(runId) ??
      createRunSnapshot({
        runId,
        prompt: "Fix the sidebar toggle bug with three solution branches.",
        branches: createSidebarArenaBranchList(),
        mode: "sidebar-arena",
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
  const isSidebarArena = snapshot?.mode === "sidebar-arena";
  const verifiedArenaCount = useMemo(
    () =>
      branches.filter(
        (branch) =>
          isSidebarArenaBranch(branch.id) && branch.status === "Live verified",
      ).length,
    [branches],
  );
  function openBranch(branchId: BranchId) {
    const href =
      isSidebarArena && isSidebarArenaBranch(branchId)
        ? `${branchPath(runId, branchId)}?autostart=1`
        : branchPath(runId, branchId);
    const opened = window.open(href, "_blank");

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
      const href =
        isSidebarArena && isSidebarArenaBranch(branch.id)
          ? `${branchPath(runId, branch.id)}?autostart=1`
          : branchPath(runId, branch.id);
      const opened = window.open(href, "_blank");
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
          <h1>{isSidebarArena ? "Parallel Solution Arena" : "Live Agent Run"}</h1>
          <p className="muted-copy">
            {isSidebarArena
              ? "Three BrowserPod branches solve the same sidebar bug, stream proof back here, and produce a winner recommendation."
              : "BroadcastChannel orchestration for branch tabs. The SEC-101 branch publishes real /workbench BrowserPod proof events as it progresses."}
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
          {isSidebarArena ? "Launch / reopen all pods" : "Open all branch tabs"}
        </button>
        {isSidebarArena ? (
          <>
            {branches.map((branch) => (
              <button
                className="button"
                key={branch.id}
                type="button"
                onClick={() => openBranch(branch.id)}
              >
                Open {branch.title}
              </button>
            ))}
            <Link className="button" href="/arena">
              New arena
            </Link>
          </>
        ) : (
          <>
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
          </>
        )}
      </section>

      {isSidebarArena ? (
        <ArenaComparison
          branches={branches}
          verifiedArenaCount={verifiedArenaCount}
        />
      ) : null}

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
              {isSidebarArena ? (
                <>
                  <TruthRow label="Real" text="Each branch gets its own BrowserPod tab and sandbox." />
                  <TruthRow label="Real" text="Each branch runs failing tests, applies its patch, reruns tests, and runs a build script." />
                  <TruthRow label="Real" text="All three branches run the same test suite and must pass before being marked verified." />
                  <TruthRow label="Preview" text="Preview output is an HTML artifact, not a full React portal yet." />
                </>
              ) : (
                <>
                  <TruthRow label="Real" text="Access-Control branch launches the live /workbench BrowserPod proof." />
                  <TruthRow label="Real" text="Sidebar branch runs its own deterministic BrowserPod proof." />
                  <TruthRow label="Real" text="CSV branch can launch the live /sprint BrowserPod proof." />
                  <TruthRow label="Preview" text="Email branch is prepared for a future BrowserPod branch." />
                </>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ArenaComparison({
  branches,
  verifiedArenaCount,
}: {
  branches: BranchSnapshot[];
  verifiedArenaCount: number;
}) {
  const allVerified = verifiedArenaCount === sidebarArenaVariants.length;
  const winnerReport = createWinnerReport(branches);

  return (
    <section className={`truth-panel${allVerified ? " card-glow" : ""}`}>
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Comparison matrix</p>
          <h2>Three branches, same bug</h2>
        </div>
        <div className="status-row">
          <span className={`badge ${allVerified ? "ok" : "warn"}`}>
            {verifiedArenaCount}/3 verified
          </span>
        </div>
      </div>

      <div className="comparison-table" role="table" aria-label="Arena branch comparison">
        <div className="comparison-row comparison-head" role="row">
          <span>Branch</span>
          <span>Strategy</span>
          <span>Proof</span>
        </div>
        {sidebarArenaVariants.map((variant) => {
          const branch = branches.find((candidate) => candidate.id === variant.id);
          const verified = branch?.status === "Live verified";
          const failed = branch?.status === "Failed";

          return (
            <div className="comparison-row" key={variant.id} role="row">
              <span>
                <strong>{variant.title}</strong>
                <small>{variant.agentStyle}</small>
              </span>
              <span>{variant.strategy}</span>
              <span className={verified ? "text-ok" : failed ? "text-fail" : ""}>
                {verified ? "tests + build passed" : failed ? "failed" : branch?.status ?? "waiting"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="arena-report-grid">
        <div className="card">
          <h3>Branch summary</h3>
          <p className="muted-copy">
            {allVerified
              ? "All three branches verified in BrowserPod."
              : "Branch summaries update as each BrowserPod proof completes."}
          </p>
          <textarea className="summary-box" readOnly value={winnerReport} />
          <button
            className="button"
            type="button"
            disabled={!allVerified}
            onClick={() => navigator.clipboard.writeText(winnerReport)}
          >
            Copy branch summary
          </button>
        </div>

        <div className="card">
          <h3>Run-level proof</h3>
          <div className="artifact-list">
            {sidebarArenaVariants.map((variant) => {
              const branch = branches.find((candidate) => candidate.id === variant.id);
              const verified = branch?.status === "Live verified";
              return (
                <div key={variant.id}>
                  <span>{variant.title}</span>
                  <strong className={verified ? "text-ok" : ""}>
                    {verified ? "verified" : branch?.status ?? "waiting"}
                  </strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
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

function createWinnerReport(branches: BranchSnapshot[]) {
  const lines = [
    "ForkLab Parallel Solution Arena",
    "",
    "Task: Fix the sidebar toggle bug in the sample React app.",
    "",
    "Branch results:",
  ];

  sidebarArenaVariants.forEach((variant) => {
    const branch = branches.find((candidate) => candidate.id === variant.id);
    lines.push(
      `- ${variant.title} (${variant.agentStyle}): ${branch?.status ?? "Waiting"}; ${variant.strategy}.`,
    );
  });

  return lines.join("\n");
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
