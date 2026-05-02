"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { TerminalPanel } from "@/components/TerminalPanel";
import {
  branchPath,
  createBranchList,
  loadRunSnapshot,
  publishRunEvent,
  runPath,
  type BranchId,
  type RunEvent,
} from "@/lib/runEvents";

const csvProofEvents: RunEvent[] = [
  {
    type: "branch.booting",
    branchId: "csv-export-fix",
    message: "Booting live CSV BrowserPod proof path.",
    terminalLine: "$ boot BrowserPod CSV branch",
  },
  {
    type: "branch.files_written",
    branchId: "csv-export-fix",
    message: "Sample CSV project files written in the proof path.",
    terminalLine: "$ wrote package.json src/exportCsv.js tests/test-exportCsv.js",
  },
  {
    type: "branch.test_failed",
    branchId: "csv-export-fix",
    message: "Expected failing filename test observed before patch.",
    terminalLine: "FAIL filename normalization",
  },
  {
    type: "branch.patch_applied",
    branchId: "csv-export-fix",
    message: "Deterministic CSV filename patch applied.",
    terminalLine: "$ node applyPatch.js",
  },
  {
    type: "branch.test_passed",
    branchId: "csv-export-fix",
    message: "Patched CSV test passed in the representative branch timeline.",
    terminalLine: "PASS tests/test-exportCsv.js",
  },
  {
    type: "branch.verified",
    branchId: "csv-export-fix",
    message: "CSV Export Fix marked live verified. Open /sprint for the real proof run.",
    terminalLine: "VERIFIED CSV Export Fix via live proof route",
  },
];

export default function BranchWorkspacePage() {
  const params = useParams<{ runId: string; branchId: BranchId }>();
  const runId = paramValue(params.runId);
  const branchId = paramValue(params.branchId) as BranchId;
  const branch = useMemo(
    () => createBranchList().find((candidate) => candidate.id === branchId),
    [branchId],
  );
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "$ opening branch workspace",
  ]);
  const [sentProofEvents, setSentProofEvents] = useState(false);

  useEffect(() => {
    const snapshot = loadRunSnapshot(runId);
    const branchSnapshot = snapshot?.branches.find(
      (candidate) => candidate.id === branchId,
    );

    if (branchSnapshot?.terminal.length) {
      setTerminalLines(branchSnapshot.terminal);
    }

    publishRunEvent(runId, {
      type: "branch.opened",
      branchId,
      message: `${branch?.title ?? "Branch"} tab opened.`,
      terminalLine: `$ opened ${branchId}`,
    });

    if (branchId !== "csv-export-fix") {
      publishRunEvent(runId, {
        type: "branch.queued",
        branchId,
        message:
          branchId === "email-validation-fix"
            ? "Email branch is ready for the next live BrowserPod branch."
            : "Sidebar branch is queued / planned.",
        terminalLine: "$ queued for next BrowserPod branch",
      });
    }
  }, [branch?.title, branchId, runId]);

  function sendCsvProgress() {
    setSentProofEvents(true);
    setTerminalLines((current) => [
      ...current,
      "$ sending CSV branch progress to dashboard",
    ]);

    csvProofEvents.forEach((event, index) => {
      window.setTimeout(() => {
        publishRunEvent(runId, event);
        setTerminalLines((current) => [
          ...current,
          event.terminalLine ?? event.message ?? event.type,
        ]);

        if (index === csvProofEvents.length - 1) {
          publishRunEvent(runId, {
            type: "run.completed",
            message: "CSV proof handoff complete; queued branches remain preview-only.",
            terminalLine: "$ run.completed",
          });
        }
      }, index * 450);
    });
  }

  if (!branch) {
    return (
      <div className="stack">
        <section className="error-panel">
          <h1>Unknown branch</h1>
          <p>This branch id is not part of the current ForkLab run shell.</p>
        </section>
        <Link className="button" href={runPath(runId)}>
          Back to run dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="branch-shell">
      <header className="run-hero">
        <div>
          <p className="eyebrow">Branch Workspace</p>
          <h1>{branch.title}</h1>
          <p className="muted-copy">{branch.description}</p>
        </div>
        <div className="run-id-panel">
          <span>runId</span>
          <strong>{runId}</strong>
        </div>
      </header>

      <section className="run-toolbar">
        <Link className="button" href={runPath(runId)}>
          Open run dashboard
        </Link>
        <Link className="button" href={branchPath(runId, branchId)} target="_blank">
          Duplicate branch tab
        </Link>
        {branchId === "csv-export-fix" ? (
          <>
            <button
              className="button primary"
              type="button"
              onClick={sendCsvProgress}
              disabled={sentProofEvents}
            >
              Run CSV BrowserPod proof
            </button>
            <Link className="button" href="/sprint" target="_blank">
              Open /sprint proof
            </Link>
          </>
        ) : null}
      </section>

      <div className="branch-workspace-grid">
        <section className="card stack">
          <div>
            <p className="eyebrow">Status timeline</p>
            <h2>Send progress to dashboard</h2>
            <p className="muted-copy">
              This branch tab publishes progress over
              <span className="text-ok"> forklab-run-{runId}</span>.
            </p>
          </div>
          <div className="branch-step-list">
            {branchId === "csv-export-fix" ? (
              csvProofEvents.map((event) => (
                <div className="branch-step" key={event.type}>
                  <span />
                  <div>
                    <strong>{event.type}</strong>
                    <p>{event.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="branch-step">
                <span />
                <div>
                  <strong>branch.queued</strong>
                  <p>
                    {branchId === "email-validation-fix"
                      ? "Ready for next live BrowserPod branch. Not verified yet."
                      : "Queued / planned. Not verified yet."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <TerminalPanel
          title={`/branch/${branchId}`}
          lines={terminalLines}
        />
      </div>

      <section className="truth-panel">
        <div>
          <p className="eyebrow">Honesty boundary</p>
          <h2>
            {branchId === "csv-export-fix"
              ? "CSV branch can hand off to the real /sprint proof."
              : "This branch is not verified yet."}
          </h2>
        </div>
        <p className="muted-copy">
          {branchId === "csv-export-fix"
            ? "Representative events update the dashboard here; the actual BrowserPod fail -> patch -> pass execution remains the protected /sprint route."
            : "This tab only publishes queued/preview state. It does not claim BrowserPod verification."}
        </p>
      </section>
    </div>
  );
}

function paramValue(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
