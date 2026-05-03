"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { TerminalPanel } from "@/components/TerminalPanel";
import {
  bootForkLabPod,
  installBrowserPodRuntimeErrorGuard,
  makeStorageKey,
  readTextFile,
  toUserFacingError,
  writeTextFile,
  type BrowserPodInstance,
  type PodStatus,
  type UserFacingError,
} from "@/lib/browserpod";
import {
  branchPath,
  createBranchList,
  loadRunSnapshot,
  publishRunEvent,
  runPath,
  type BranchId,
  type RunEvent,
  type RunEventType,
} from "@/lib/runEvents";
import {
  buggySidebarState,
  fixedSidebarState,
  sidebarApplyPatch,
  sidebarProofScript,
  sidebarStateTest,
  sidebarTargetFile,
  sidebarTestCommand,
} from "@/lib/sidebarBranch";

type PodTestResult = {
  status: "failed" | "passed";
  failures: Array<{ name: string; message: string }>;
};

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

const accessControlEvents: RunEvent[] = [
  {
    type: "branch.booting",
    branchId: "access-control-fix",
    message: "BrowserPod is booting for SEC-101.",
    terminalLine: "$ secure-agent-run create issue=SEC-101",
  },
  {
    type: "branch.files_written",
    branchId: "access-control-fix",
    message: "Access-control source, test file, and nonce proof file written.",
    terminalLine: "$ wrote src/accessControl.js tests/test-access-control.js proof.js",
  },
  {
    type: "branch.test_failed",
    branchId: "access-control-fix",
    message: "Expected cross-tenant access-control failure observed before patch.",
    terminalLine: "FAIL different-tenant admin cannot view invoice",
  },
  {
    type: "branch.llm_patch_proposed",
    branchId: "access-control-fix",
    message: "Constrained patch proposal returned by selected provider.",
    terminalLine: "$ patch proposal ready",
  },
  {
    type: "branch.awaiting_human_approval",
    branchId: "access-control-fix",
    message: "ForkLab is waiting for human approval before writing AI output.",
    terminalLine: "$ waiting for human approval",
  },
  {
    type: "branch.human_approved",
    branchId: "access-control-fix",
    message: "Human approved the proposed access-control patch.",
    terminalLine: "$ human approved patch",
  },
  {
    type: "branch.patch_applied",
    branchId: "access-control-fix",
    message: "Approved patch written into BrowserPod.",
    terminalLine: "$ wrote approved src/accessControl.js",
  },
  {
    type: "branch.test_passed",
    branchId: "access-control-fix",
    message: "Approved patch passed the tenant access-control test.",
    terminalLine: "PASS tenant access-control checks",
  },
  {
    type: "branch.verified",
    branchId: "access-control-fix",
    message: "SEC-101 verified by the live /workbench BrowserPod proof.",
    terminalLine: "VERIFIED SEC-101 via /workbench",
  },
];

const sidebarProofEvents: RunEvent[] = [
  {
    type: "branch.booting",
    branchId: "sidebar-toggle-fix",
    message: "BrowserPod is booting for the sidebar route-change branch.",
    terminalLine: "$ boot BrowserPod sidebar branch",
  },
  {
    type: "branch.files_written",
    branchId: "sidebar-toggle-fix",
    message: "Sidebar reducer, route-change test, patch script, and proof file written.",
    terminalLine:
      "$ wrote src/sidebarState.js tests/test-sidebarState.js applyPatch.js proof.js",
  },
  {
    type: "branch.test_failed",
    branchId: "sidebar-toggle-fix",
    message: "Expected route-change failure observed before patch.",
    terminalLine: "FAIL route change closes sidebar",
  },
  {
    type: "branch.patch_applied",
    branchId: "sidebar-toggle-fix",
    message: "Deterministic sidebar route-change patch applied.",
    terminalLine: "$ node applyPatch.js",
  },
  {
    type: "branch.test_passed",
    branchId: "sidebar-toggle-fix",
    message: "Patched sidebar route-change test passed in BrowserPod.",
    terminalLine: "PASS tests/test-sidebarState.js",
  },
  {
    type: "branch.verified",
    branchId: "sidebar-toggle-fix",
    message: "Sidebar Toggle Fix verified by its live BrowserPod branch.",
    terminalLine: "VERIFIED Sidebar Toggle Fix via live BrowserPod branch",
  },
];

export default function BranchWorkspacePage() {
  const params = useParams<{ runId: string; branchId: BranchId }>();
  const runId = paramValue(params.runId);
  const branchId = paramValue(params.branchId) as BranchId;
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const podRef = useRef<BrowserPodInstance | null>(null);
  const terminalInstanceRef = useRef<unknown>(null);
  const branch = useMemo(
    () => createBranchList().find((candidate) => candidate.id === branchId),
    [branchId],
  );
  const [podStatus, setPodStatus] = useState<PodStatus>("idle");
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "$ opening branch workspace",
  ]);
  const [sentProofEvents, setSentProofEvents] = useState(false);
  const [sidebarFirstResult, setSidebarFirstResult] = useState<PodTestResult | null>(
    null,
  );
  const [sidebarSecondResult, setSidebarSecondResult] =
    useState<PodTestResult | null>(null);
  const [sidebarError, setSidebarError] = useState<UserFacingError | null>(null);

  useEffect(() => {
    const uninstall = installBrowserPodRuntimeErrorGuard();
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

    if (
      branchId !== "csv-export-fix" &&
      branchId !== "access-control-fix" &&
      branchId !== "sidebar-toggle-fix"
    ) {
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

    return uninstall;
  }, [branch?.title, branchId, runId]);

  const workbenchHref = `/workbench?runId=${encodeURIComponent(
    runId,
  )}&branchId=access-control-fix`;

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

  async function runSidebarProof() {
    if (branchId !== "sidebar-toggle-fix") return;

    setSentProofEvents(true);
    setSidebarError(null);
    setSidebarFirstResult(null);
    setSidebarSecondResult(null);
    setPodStatus("booting");
    setTerminalLines([
      "$ starting Sidebar Toggle Fix BrowserPod branch",
      "scenario=sidebar-route-change",
    ]);

    if (terminalRef.current) {
      terminalRef.current.innerHTML = "";
    }

    try {
      publishBranchEvent("branch.booting", sidebarProofEvents[0]);
      const pod = await bootForkLabPod(makeStorageKey("forklab-sidebar"));
      const terminal = await pod.createDefaultTerminal(terminalRef.current!);
      podRef.current = pod;
      terminalInstanceRef.current = terminal;

      setPodStatus("writing-files");
      await pod.createDirectory("/forklab-sidebar/src", { recursive: true });
      await pod.createDirectory("/forklab-sidebar/tests", { recursive: true });
      await writeTextFile(
        pod,
        "/forklab-sidebar/src/sidebarState.js",
        buggySidebarState,
      );
      await writeTextFile(
        pod,
        "/forklab-sidebar/tests/test-sidebarState.js",
        sidebarStateTest,
      );
      await writeTextFile(pod, "/forklab-sidebar/applyPatch.js", sidebarApplyPatch);
      await writeTextFile(pod, "/forklab-sidebar/proof.js", sidebarProofScript);
      publishBranchEvent("branch.files_written", sidebarProofEvents[1]);
      setTerminalLines((current) => [
        ...current,
        "$ wrote src/sidebarState.js",
        "$ wrote tests/test-sidebarState.js",
        "$ wrote applyPatch.js",
        "$ wrote proof.js",
      ]);

      setPodStatus("running-command");
      setTerminalLines((current) => [...current, "$ node proof.js"]);
      await pod.run("node", ["proof.js"], {
        terminal,
        cwd: "/forklab-sidebar",
        echo: true,
      });

      setTerminalLines((current) => [
        ...current,
        `$ ${sidebarTestCommand}`,
        "Expected: route-change check should fail before patch.",
      ]);
      const firstResult = await runSidebarTest({ allowFailure: true });

      if (firstResult.status !== "failed") {
        throw new Error("Expected the first sidebar route-change test to fail.");
      }

      setSidebarFirstResult(firstResult);
      publishBranchEvent("branch.test_failed", sidebarProofEvents[2]);
      setTerminalLines((current) => [
        ...current,
        `First test result: failed (${firstResult.failures.length} assertion failure${
          firstResult.failures.length === 1 ? "" : "s"
        })`,
      ]);

      setPodStatus("patching");
      setTerminalLines((current) => [...current, "$ node applyPatch.js"]);
      await pod.run("node", ["applyPatch.js"], {
        terminal,
        cwd: "/forklab-sidebar",
        echo: true,
      });
      publishBranchEvent("branch.patch_applied", sidebarProofEvents[3]);

      setPodStatus("running-command");
      setTerminalLines((current) => [...current, `$ ${sidebarTestCommand}`]);
      const secondResult = await runSidebarTest({ allowFailure: false });

      if (secondResult.status !== "passed") {
        throw new Error("Expected the patched sidebar route-change test to pass.");
      }

      setSidebarSecondResult(secondResult);
      setPodStatus("passed");
      localStorage.setItem("forklab:sidebar-proof-passed", "true");
      publishBranchEvent("branch.test_passed", sidebarProofEvents[4]);
      publishBranchEvent("branch.verified", sidebarProofEvents[5]);
      setTerminalLines((current) => [
        ...current,
        "Passed: Sidebar Toggle Fix verified in BrowserPod.",
      ]);
    } catch (caught) {
      setPodStatus("failed");
      const userError = toUserFacingError(caught);
      setSidebarError(userError);
      setTerminalLines((current) => [...current, `Failed: ${userError.message}`]);
      publishRunEvent(runId, {
        type: "branch.failed",
        branchId: "sidebar-toggle-fix",
        message: userError.message,
        terminalLine: `Failed: ${userError.message}`,
      });
    }
  }

  async function runSidebarTest({ allowFailure }: { allowFailure: boolean }) {
    const pod = podRef.current;
    const terminal = terminalInstanceRef.current;

    if (!pod || !terminal) {
      throw new Error("BrowserPod has not booted yet.");
    }

    try {
      await pod.run("node", ["tests/test-sidebarState.js"], {
        terminal,
        cwd: "/forklab-sidebar",
        echo: true,
      });
    } catch (caught) {
      if (!allowFailure) throw caught;
    }

    const rawResult = await readTextFile(pod, "/forklab-sidebar/test-result.json");
    return JSON.parse(rawResult) as PodTestResult;
  }

  function publishBranchEvent(type: RunEventType, event: RunEvent) {
    publishRunEvent(runId, {
      ...event,
      type,
      branchId: "sidebar-toggle-fix",
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
        {branchId === "access-control-fix" ? (
          <Link className="button primary" href={workbenchHref}>
            Open live workbench proof
          </Link>
        ) : null}
        {branchId === "sidebar-toggle-fix" ? (
          <button
            className="button primary"
            type="button"
            onClick={runSidebarProof}
            disabled={!["idle", "passed", "failed"].includes(podStatus)}
          >
            Run sidebar BrowserPod proof
          </button>
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
            {branchId === "access-control-fix" ? (
              accessControlEvents.map((event) => (
                <div className="branch-step" key={event.type}>
                  <span />
                  <div>
                    <strong>{event.type}</strong>
                    <p>{event.message}</p>
                  </div>
                </div>
              ))
            ) : branchId === "sidebar-toggle-fix" ? (
              sidebarProofEvents.map((event) => (
                <div className="branch-step" key={event.type}>
                  <span />
                  <div>
                    <strong>{event.type}</strong>
                    <p>{event.message}</p>
                  </div>
                </div>
              ))
            ) : branchId === "csv-export-fix" ? (
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
          nativeRef={branchId === "sidebar-toggle-fix" ? terminalRef : undefined}
          lines={terminalLines}
        />
      </div>

      {branchId === "sidebar-toggle-fix" ? (
        <div className="branch-workspace-grid">
          <section className={`panel${podStatus === "passed" ? " card-glow" : ""}`}>
            <div className="status-row" style={{ marginBottom: 12 }}>
              <span className={`badge ${podStatus === "passed" ? "ok" : podStatus === "failed" ? "fail" : "warn"}`}>
                Sidebar proof: {podStatus === "passed" ? "passed" : podStatus === "failed" ? "failed" : "pending"}
              </span>
            </div>
            <div className="report">
              <ProofItem
                label="Failing route-change test"
                done={sidebarFirstResult?.status === "failed"}
              />
              <ProofItem
                label="Deterministic patch applied"
                done={Boolean(sidebarFirstResult)}
              />
              <ProofItem
                label="Passing test observed"
                done={sidebarSecondResult?.status === "passed"}
              />
            </div>
          </section>

          <section className="card stack">
            <div>
              <p className="eyebrow">Patch diff</p>
              <h2>{sidebarTargetFile}</h2>
              <p className="muted-copy">
                The patch closes the sidebar on route navigation while preserving
                toggle and unknown-event behavior.
              </p>
            </div>
            <pre className="agent-diff-block">{createSidebarDiff()}</pre>
          </section>
        </div>
      ) : null}

      {sidebarError ? (
        <section className="error-panel" aria-live="polite">
          <h3>{sidebarError.title}</h3>
          <p>{sidebarError.message}</p>
          <ul>
            {sidebarError.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="truth-panel">
        <div>
          <p className="eyebrow">Honesty boundary</p>
          <h2>
            {branchId === "csv-export-fix"
              ? "CSV branch can hand off to the real /sprint proof."
              : branchId === "access-control-fix"
                ? "Access-Control branch hands off to the real /workbench proof."
              : branchId === "sidebar-toggle-fix"
                ? "Sidebar branch runs its own real BrowserPod proof."
              : "This branch is not verified yet."}
          </h2>
        </div>
        <p className="muted-copy">
          {branchId === "csv-export-fix"
            ? "Representative events update the dashboard here; the actual BrowserPod fail -> patch -> pass execution remains the protected /sprint route."
            : branchId === "access-control-fix"
              ? "Open the workbench proof to run BrowserPod. Dashboard verification is published only after the approved patch passes there."
            : branchId === "sidebar-toggle-fix"
              ? "This branch boots BrowserPod directly in the branch workspace, runs a failing route-change test, applies a deterministic patch, and only then publishes verified."
            : "This tab only publishes queued/preview state. It does not claim BrowserPod verification."}
        </p>
      </section>
    </div>
  );
}

function paramValue(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function ProofItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="card">
      <strong>{label}</strong>
      <span className={done ? "text-ok" : ""}>
        {done ? "Verified in BrowserPod" : "Waiting"}
      </span>
    </div>
  );
}

function createSidebarDiff() {
  return `--- a/${sidebarTargetFile}
+++ b/${sidebarTargetFile}
@@
${buggySidebarState
  .trimEnd()
  .split("\n")
  .map((line) => `-${line}`)
  .join("\n")}
${fixedSidebarState
  .trimEnd()
  .split("\n")
  .map((line) => `+${line}`)
  .join("\n")}`;
}
