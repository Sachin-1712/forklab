"use client";

import { useRef, useState } from "react";
import { BrowserPodStatusCard } from "@/components/BrowserPodStatusCard";
import { BranchCard } from "@/components/BranchCard";
import { DiffViewer } from "@/components/DiffViewer";
import { ProofReport } from "@/components/ProofReport";
import { SprintTimeline } from "@/components/SprintTimeline";
import { TerminalPanel } from "@/components/TerminalPanel";
import {
  bootForkLabPod,
  makeStorageKey,
  readTextFile,
  toUserFacingError,
  writeTextFile,
  type BrowserPodInstance,
  type PodStatus,
  type UserFacingError,
} from "@/lib/browserpod";
import { exportCsvDiff, sampleFiles } from "@/lib/sampleSprint";

type SprintStage = "idle" | "failed-test" | "patched" | "passed";
type TestStatus = "not-run" | "failed" | "passed";
type PodTestResult = {
  status: "failed" | "passed";
  failures: Array<{ name: string; message: string }>;
};

const filesChanged = ["src/exportCsv.js"];

const prSummary = `## Summary
- Fix CSV export filenames by slugifying report names before appending .csv
- Preserve CSV content generation behavior

## Verification
- BrowserPod live branch: CSV Export Fix
- First run: node tests/test-exportCsv.js failed on the filename assertion
- Patch: deterministic fallback patch applied inside BrowserPod
- Second run: node tests/test-exportCsv.js passed

## Scope
- Only the CSV Export Fix branch is live in this build
- Sidebar Fix and Email Validation Fix are queued visual placeholders`;

export default function SprintPage() {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<PodStatus>("idle");
  const [stage, setStage] = useState<SprintStage>("idle");
  const [firstTestStatus, setFirstTestStatus] = useState<TestStatus>("not-run");
  const [secondTestStatus, setSecondTestStatus] = useState<TestStatus>("not-run");
  const [patchApplied, setPatchApplied] = useState(false);
  const [filesWritten, setFilesWritten] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [safeMode, setSafeMode] = useState(true);
  const [logs, setLogs] = useState<string[]>([
    "Ready. This sprint uses one live BrowserPod branch for the CSV export bug.",
  ]);
  const [error, setError] = useState<UserFacingError | null>(null);

  async function runSprint() {
    setStatus("booting");
    setStage("idle");
    setFirstTestStatus("not-run");
    setSecondTestStatus("not-run");
    setPatchApplied(false);
    setFilesWritten([]);
    setActiveIndex(0);
    setError(null);
    setLogs([
      "$ starting ForkLab sample sprint",
      `demoSafeMode=${safeMode ? "on" : "off"}`,
      "branch=CSV Export Fix (live BrowserPod)",
    ]);

    if (terminalRef.current) {
      terminalRef.current.innerHTML = "";
    }

    try {
      const pod = await bootForkLabPod(makeStorageKey("forklab-sprint"));
      const terminal = await pod.createDefaultTerminal(terminalRef.current!);

      setStatus("writing-files");
      setActiveIndex(1);
      await writeSampleProject(pod);
      setFilesWritten(Object.keys(sampleFiles).map((path) => path.replace("/forklab/", "")));
      setLogs((current) => [
        ...current,
        "$ wrote package.json",
        "$ wrote src/exportCsv.js",
        "$ wrote tests/test-exportCsv.js",
      ]);

      setStatus("running-command");
      setActiveIndex(2);
      setLogs((current) => [
        ...current,
        "$ node tests/test-exportCsv.js",
        "Expected: first run should fail because filenames are not slugified.",
      ]);

      const firstResult = await runTestCommand(
        pod,
        terminal,
        "first",
      );

      if (firstResult.status !== "failed") {
        throw new Error(
          "Expected the first CSV export test run to fail, but it completed successfully.",
        );
      }
      setFirstTestStatus("failed");
      setStage("failed-test");
      setLogs((current) => [
        ...current,
        `First test result: failed (${firstResult.failures.length} assertion failure${
          firstResult.failures.length === 1 ? "" : "s"
        })`,
      ]);

      setStatus("patching");
      setActiveIndex(3);
      setLogs((current) => [...current, "$ node applyPatch.js"]);
      await runCommand(pod, terminal, "node", ["applyPatch.js"], false);
      setPatchApplied(true);
      setStage("patched");

      setStatus("running-command");
      setActiveIndex(4);
      setLogs((current) => [...current, "$ node tests/test-exportCsv.js"]);
      const secondResult = await runTestCommand(
        pod,
        terminal,
        "second",
      );

      if (secondResult.status !== "passed") {
        throw new Error("Expected the patched CSV export test run to pass.");
      }
      setStatus("passed");
      setSecondTestStatus("passed");
      setStage("passed");
      setActiveIndex(6);
      setLogs((current) => [
        ...current,
        "Passed: failing CSV export test became green after the deterministic patch.",
      ]);
    } catch (caught) {
      setStatus("failed");
      const userError = toUserFacingError(caught);
      setError(userError);
      setLogs((current) => [...current, `Failed: ${userError.message}`]);
    }
  }

  async function writeSampleProject(pod: BrowserPodInstance) {
    await pod.createDirectory("/forklab/src", { recursive: true });
    await pod.createDirectory("/forklab/tests", { recursive: true });

    for (const [path, content] of Object.entries(sampleFiles)) {
      await writeTextFile(pod, path, content);
    }
  }

  async function runCommand(
    pod: BrowserPodInstance,
    terminal: unknown,
    executable: string,
    args: string[],
    allowFailure: boolean,
  ) {
    try {
      await pod.run(executable, args, {
        terminal,
        cwd: "/forklab",
        echo: true,
      });
      return false;
    } catch (caught) {
      if (allowFailure) {
        return true;
      }
      throw caught;
    }
  }

  async function runTestCommand(
    pod: BrowserPodInstance,
    terminal: unknown,
    label: "first" | "second",
  ) {
    await pod.run("node", ["tests/test-exportCsv.js"], {
      terminal,
      cwd: "/forklab",
      echo: true,
    });

    const rawResult = await readTextFile(pod, "/forklab/test-result.json");
    const result = JSON.parse(rawResult) as PodTestResult;
    setLogs((current) => [
      ...current,
      `${label === "first" ? "First" : "Second"} test result file: ${result.status}`,
    ]);
    return result;
  }

  const isRunning = !["idle", "passed", "failed"].includes(status);
  const proofReady = status === "passed";

  return (
    <main className="stack">
      <header className="page-header">
        <p className="eyebrow">Phase 2</p>
        <h1>Sample Sprint</h1>
        <p>
          A single reliable BrowserPod branch writes a tiny sample project, runs a
          failing CSV export test, applies a deterministic patch, and reruns the test
          to produce proof.
        </p>
      </header>

      <section className="proof-banner">
        AI-generated code is untrusted until verified inside BrowserPod.
      </section>

      <div className="grid two">
        <BrowserPodStatusCard
          status={status}
          title="CSV Export Fix"
          detail="One live BrowserPod branch. The two extra branch cards show the intended expansion path."
        />
        <div className="card">
          <div className="status-row" style={{ marginBottom: 12 }}>
            <span className="badge ok">Demo Safe Mode</span>
            <label className="badge" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={safeMode}
                onChange={(event) => setSafeMode(event.target.checked)}
                disabled={isRunning}
              />{" "}
              ON by default
            </label>
          </div>
          <h3>Run control</h3>
          <p style={{ color: "var(--muted)" }}>
            Uses deterministic fallback patches so the live demo completes even if
            AI/network fails.
          </p>
          <button
            className="button primary"
            type="button"
            onClick={runSprint}
            disabled={isRunning}
          >
            Start Sample Sprint
          </button>
        </div>
      </div>

      <div className="grid three">
        <BranchCard
          title="Sidebar Fix"
          status="Queued"
          description="Fallback branch card reserved for the later 3-pod visual mode."
        />
        <BranchCard
          title="CSV Export Fix"
          status={stage === "passed" ? "Verified" : stage === "idle" ? "Ready" : "Running"}
          live
          description="Live BrowserPod branch executing the fail to patch to pass flow."
        />
        <BranchCard
          title="Email Validation Fix"
          status="Queued"
          description="Fallback branch card reserved for the later 3-pod visual mode."
        />
      </div>

      <div className="grid two">
        <SprintTimeline activeIndex={activeIndex} />
        <div className="card stack">
          <div>
            <h3>Test status</h3>
            <div className="artifact-list">
              <div>
                <span>First run</span>
                <strong className={firstTestStatus === "failed" ? "text-fail" : ""}>
                  {firstTestStatus === "failed" ? "failed as expected" : "not run"}
                </strong>
              </div>
              <div>
                <span>Patch</span>
                <strong className={patchApplied ? "text-ok" : ""}>
                  {patchApplied ? "applied" : "waiting"}
                </strong>
              </div>
              <div>
                <span>Second run</span>
                <strong className={secondTestStatus === "passed" ? "text-ok" : ""}>
                  {secondTestStatus === "passed" ? "passed" : "not run"}
                </strong>
              </div>
            </div>
          </div>

          <div>
            <h3>Files written</h3>
            <div className="artifact-list">
              {(filesWritten.length ? filesWritten : [
                "package.json",
                "src/exportCsv.js",
                "tests/test-exportCsv.js",
                "applyPatch.js",
              ]).map((file) => (
                <div key={file}>
                  <span>{file}</span>
                  <strong>{filesWritten.length ? "written" : "queued"}</strong>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3>Files changed</h3>
            <div className="artifact-list">
              {filesChanged.map((file) => (
                <div key={file}>
                  <span>{file}</span>
                  <strong>{patchApplied ? "patched" : "waiting"}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <h3>Before/after diff</h3>
          <p style={{ color: "var(--muted)" }}>
            The known patch slugifies report names before adding the .csv extension.
          </p>
          <DiffViewer diff={exportCsvDiff} />
        </div>
        <div className="card">
          <h3>Copyable PR summary placeholder</h3>
          <p style={{ color: "var(--muted)" }}>
            Not connected to GitHub yet. This is a prepared handoff artifact for the
            verified CSV branch.
          </p>
          <textarea
            className="summary-box"
            readOnly
            value={proofReady ? prSummary : "Run the sample sprint to generate the verified PR summary."}
          />
          <button
            className="button"
            type="button"
            disabled={!proofReady}
            onClick={() => navigator.clipboard.writeText(prSummary)}
          >
            Copy summary
          </button>
        </div>
      </div>

      <TerminalPanel title="/sprint · CSV Export Fix" nativeRef={terminalRef} lines={logs} />

      <ProofReport
        status={status === "passed" ? "passed" : status === "failed" ? "failed" : "pending"}
        summary={
          status === "passed"
            ? "ForkLab proved the CSV filename bug in a disposable BrowserPod sandbox and verified the deterministic patch with a passing Node test run."
            : "The proof report completes after the BrowserPod branch reaches a passing test run."
        }
        checks={[
          "Failing test observed",
          "Patch written inside pod",
          "Passing test observed",
        ]}
      />

      {error ? (
        <section className="error-panel" aria-live="polite">
          <h3>{error.title}</h3>
          <p>{error.message}</p>
          <ul>
            {error.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
