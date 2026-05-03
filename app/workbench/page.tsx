"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  accessControlTest,
  buggyAccessControl,
  tenantAllowedCommand,
  tenantScenarioId,
  tenantTargetFile,
  validatePatchProposal,
  type AgentProvider,
  type PatchProposal,
} from "@/lib/llm/patchSchema";
import {
  publishRunEvent,
  runPath,
  type BranchId,
  type RunEventType,
} from "@/lib/runEvents";

type AgentConfig = {
  defaultProvider: "gemini" | "groq" | "auto";
  geminiModel: string;
  groqModel: string;
};
type WorkbenchPhase =
  | "idle"
  | "running"
  | "proposal-ready"
  | "applying"
  | "verified"
  | "accepted"
  | "failed";
type TestStatus = "not-run" | "failed" | "passed";
type TimelineStatus = "waiting" | "running" | "done" | "failed";
type PodTestResult = {
  status: "failed" | "passed";
  failures: Array<{ name: string; message: string }>;
};
type ProofSignals = {
  crossOriginIsolated: boolean | null;
  bootTimestamp: string;
  commandExecuted: string;
  filesWritten: string[];
  methodSequence: string[];
  testResultJson: string;
  nonce: string;
  nonceOutput: string;
  proofResultJson: string;
};
type DashboardContext = {
  runId: string;
  branchId: Extract<BranchId, "access-control-fix">;
};

const sourceFiles = [
  { path: tenantTargetFile, content: buggyAccessControl },
  { path: "tests/test-access-control.js", content: accessControlTest },
];

const defaultTask =
  "Fix canViewInvoice so tenant boundaries are enforced before admin or owner access.";

const issues = [
  {
    id: "SEC-101",
    title: "Tenant admins can view cross-tenant invoices",
    repo: "acme-billing",
    risk: "Security",
    status: "Live BrowserPod proof",
    description:
      "Admin access is checked before tenant identity, allowing an admin from tenant B to view tenant A invoices.",
    live: true,
  },
  {
    id: "UI-204",
    title: "Mobile sidebar remains open after route change",
    repo: "acme-web",
    risk: "UX",
    status: "Preview only",
    description:
      "Prepared second scenario for a future branch. Not verified by BrowserPod in this build.",
    live: false,
  },
] as const;

const initialTimeline = [
  ["select", "Issue selected", "Built-in repo context is staged."],
  ["sandbox", "Secure sandbox run", "BrowserPod boots and receives source files."],
  ["fail", "Failure evidence", "The tenant access-control test fails first."],
  ["proposal", "Patch proposal", "A provider returns a constrained full-file patch."],
  ["approval", "Human approval gate", "ForkLab waits before writing AI output."],
  ["verify", "BrowserPod verification", "The approved patch is executed and tested."],
  ["accept", "Verified fix accepted", "The result is ready for handoff."],
] as const;

export default function WorkbenchPage() {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const podRef = useRef<BrowserPodInstance | null>(null);
  const terminalInstanceRef = useRef<unknown>(null);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [provider, setProvider] = useState<AgentProvider>("auto");
  const [selectedIssueId, setSelectedIssueId] = useState<(typeof issues)[number]["id"]>(
    "SEC-101",
  );
  const [task, setTask] = useState(defaultTask);
  const [phase, setPhase] = useState<WorkbenchPhase>("idle");
  const [status, setStatus] = useState<PodStatus>("idle");
  const [proposal, setProposal] = useState<PatchProposal | null>(null);
  const [llmUnavailable, setLlmUnavailable] = useState<string | null>(null);
  const [reviewViewed, setReviewViewed] = useState(false);
  const [humanApproved, setHumanApproved] = useState(false);
  const [firstTestStatus, setFirstTestStatus] = useState<TestStatus>("not-run");
  const [secondTestStatus, setSecondTestStatus] = useState<TestStatus>("not-run");
  const [logs, setLogs] = useState<string[]>([
    "Ready. Select SEC-101 and launch a secure agent run.",
  ]);
  const [proof, setProof] = useState<ProofSignals>({
    crossOriginIsolated: null,
    bootTimestamp: "",
    commandExecuted: tenantAllowedCommand,
    filesWritten: [],
    methodSequence: [],
    testResultJson: "",
    nonce: "",
    nonceOutput: "",
    proofResultJson: "",
  });
  const [error, setError] = useState<UserFacingError | null>(null);
  const [dashboardContext, setDashboardContext] = useState<DashboardContext | null>(
    null,
  );

  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId) ?? issues[0];
  const canLaunch = selectedIssue.live && ["idle", "failed", "verified", "accepted"].includes(phase);
  const proofComplete = phase === "verified" || phase === "accepted";

  useEffect(() => {
    const uninstall = installBrowserPodRuntimeErrorGuard();

    fetch("/api/agent/plan-patch")
      .then((response) => response.json())
      .then((nextConfig: AgentConfig) => {
        setConfig(nextConfig);
        setProvider(nextConfig.defaultProvider ?? "auto");
      })
      .catch(() => setProvider("auto"));

    setProof((current) => ({
      ...current,
      crossOriginIsolated:
        typeof window === "undefined" ? null : window.crossOriginIsolated,
    }));

    const params = new URLSearchParams(window.location.search);
    const runId = params.get("runId");
    const branchId = params.get("branchId");

    if (runId && branchId === "access-control-fix") {
      const context: DashboardContext = { runId, branchId };
      setDashboardContext(context);
      publishWorkbenchEvent(context, "branch.opened", {
        message: "Workbench opened for SEC-101 access-control proof.",
        terminalLine: "$ opened /workbench SEC-101 proof",
      });
    }

    return uninstall;
  }, []);

  async function launchSecureRun() {
    if (!selectedIssue.live) return;

    resetRunState();
    setPhase("running");
    setStatus("booting");
    setLogs([
      "$ secure-agent-run create",
      `issue=${selectedIssue.id}`,
      `provider=${provider}`,
      "policy=human-approval-required",
    ]);
    publishWorkbenchEvent(dashboardContext, "branch.booting", {
      message: "BrowserPod is booting for SEC-101.",
      terminalLine: "$ secure-agent-run create issue=SEC-101",
    });

    if (terminalRef.current) {
      terminalRef.current.innerHTML = "";
    }

    try {
      const nonce = createNonce();
      const pod = await bootForkLabPod(makeStorageKey("forklab-workbench"));
      const terminal = await pod.createDefaultTerminal(terminalRef.current!);
      const bootTimestamp = new Date().toISOString();

      podRef.current = pod;
      terminalInstanceRef.current = terminal;
      setProof((current) => ({
        ...current,
        bootTimestamp,
        crossOriginIsolated: window.crossOriginIsolated,
        nonce,
        methodSequence: ["boot"],
      }));

      setStatus("writing-files");
      await pod.createDirectory("/forklab-agent/src", { recursive: true });
      await pod.createDirectory("/forklab-agent/tests", { recursive: true });
      appendMethod("createDirectory");
      await writeTextFile(pod, "/forklab-agent/src/accessControl.js", buggyAccessControl);
      await writeTextFile(
        pod,
        "/forklab-agent/tests/test-access-control.js",
        accessControlTest,
      );
      await writeTextFile(pod, "/forklab-agent/proof.js", createProofScript(nonce));
      appendMethod("createFile");
      setProof((current) => ({
        ...current,
        filesWritten: [
          "/forklab-agent/src/accessControl.js",
          "/forklab-agent/tests/test-access-control.js",
          "/forklab-agent/proof.js",
        ],
      }));
      setLogs((current) => [
        ...current,
        "$ context staged in BrowserPod",
        "$ wrote src/accessControl.js",
        "$ wrote tests/test-access-control.js",
        "$ wrote proof.js",
      ]);
      publishWorkbenchEvent(dashboardContext, "branch.files_written", {
        message: "Access-control source, test file, and nonce proof file written.",
        terminalLine:
          "$ wrote src/accessControl.js tests/test-access-control.js proof.js",
      });

      setStatus("running-command");
      setLogs((current) => [...current, "$ node proof.js"]);
      await pod.run("node", ["proof.js"], {
        terminal,
        cwd: "/forklab-agent",
        echo: true,
      });
      appendMethod("run");
      const rawProofResult = await readTextFile(pod, "/forklab-agent/proof-result.json");
      appendMethod("openFile");
      setProof((current) => ({
        ...current,
        nonceOutput: `ForkLab BrowserPod proof nonce: ${nonce}`,
        proofResultJson: rawProofResult,
      }));
      setLogs((current) => [
        ...current,
        `ForkLab BrowserPod proof nonce: ${nonce}`,
      ]);

      setLogs((current) => [
        ...current,
        `$ ${tenantAllowedCommand}`,
        "Expected: first run should fail before any patch is trusted.",
      ]);
      const firstResult = await runAccessControlTest({ allowFailure: true });

      if (firstResult.status !== "failed") {
        throw new Error("Expected the first access-control run to fail.");
      }

      setFirstTestStatus("failed");
      setStatus("failed");
      const firstResultJson = JSON.stringify(firstResult, null, 2);
      setProof((current) => ({
        ...current,
        testResultJson: firstResultJson,
      }));
      setLogs((current) => [
        ...current,
        `First test result: failed (${firstResult.failures.length} assertion failure${
          firstResult.failures.length === 1 ? "" : "s"
        })`,
        "$ requesting constrained patch proposal",
      ]);
      publishWorkbenchEvent(dashboardContext, "branch.test_failed", {
        message: "Expected cross-tenant access-control failure observed before patch.",
        terminalLine: "FAIL different-tenant admin cannot view invoice",
      });

      const nextProposal = await requestPatchProposal(provider, firstResultJson);
      setProposal(nextProposal);
      setPhase("proposal-ready");
      publishWorkbenchEvent(dashboardContext, "branch.llm_patch_proposed", {
        message: `${nextProposal.provider} patch proposal ready for review.`,
        terminalLine: nextProposal.isFallback
          ? "$ deterministic fallback proposal ready"
          : `$ ${nextProposal.provider} proposal ready`,
      });
      publishWorkbenchEvent(dashboardContext, "branch.awaiting_human_approval", {
        message: "ForkLab is waiting for human approval before writing AI output.",
        terminalLine: "$ waiting for human approval",
      });
      setLogs((current) => [
        ...current,
        nextProposal.isFallback
          ? "$ deterministic fallback proposal ready"
          : `$ ${nextProposal.provider} proposal ready`,
        "$ waiting for human approval",
      ]);
    } catch (caught) {
      setPhase("failed");
      setStatus("failed");
      const userError = toUserFacingError(caught);
      setError(userError);
      setLogs((current) => [...current, `Failed: ${userError.message}`]);
      publishWorkbenchEvent(dashboardContext, "branch.failed", {
        message: userError.message,
        terminalLine: `Failed: ${userError.message}`,
      });
    }
  }

  function reviewPatchProposal() {
    if (!proposal) return;
    setReviewViewed(true);
    setLogs((current) => [...current, "$ human reviewed patch proposal"]);
  }

  async function approvePatch() {
    if (!proposal || !podRef.current || !terminalInstanceRef.current) return;

    setHumanApproved(true);
    setPhase("applying");
    setStatus("patching");
    setError(null);
    setLogs((current) => [
      ...current,
      "$ human approved patch",
      "$ writing approved replacement file",
    ]);
    publishWorkbenchEvent(dashboardContext, "branch.human_approved", {
      message: "Human approved the proposed access-control patch.",
      terminalLine: "$ human approved patch",
    });

    try {
      await writeTextFile(
        podRef.current,
        "/forklab-agent/src/accessControl.js",
        proposal.patchedContent,
      );
      appendMethod("createFile");
      publishWorkbenchEvent(dashboardContext, "branch.patch_applied", {
        message: "Approved patch written into BrowserPod.",
        terminalLine: "$ wrote approved src/accessControl.js",
      });

      setStatus("running-command");
      setLogs((current) => [...current, `$ ${tenantAllowedCommand}`]);
      const secondResult = await runAccessControlTest({ allowFailure: false });

      if (secondResult.status !== "passed") {
        throw new Error("Expected the approved patch to pass verification.");
      }

      setSecondTestStatus("passed");
      setStatus("passed");
      setPhase("verified");
      setProof((current) => ({
        ...current,
        testResultJson: JSON.stringify(secondResult, null, 2),
      }));
      localStorage.setItem("forklab:workbench-proof-passed", "true");
      publishWorkbenchEvent(dashboardContext, "branch.test_passed", {
        message: "Approved patch passed the tenant access-control test.",
        terminalLine: "PASS tenant access-control checks",
      });
      publishWorkbenchEvent(dashboardContext, "branch.verified", {
        message: "SEC-101 verified by the live /workbench BrowserPod proof.",
        terminalLine: "VERIFIED SEC-101 via /workbench",
      });
      setLogs((current) => [
        ...current,
        "Passed: approved tenant access-control patch verified in BrowserPod.",
      ]);
    } catch (caught) {
      setPhase("failed");
      setStatus("failed");
      setSecondTestStatus("failed");
      const userError = toUserFacingError(caught);
      setError(userError);
      setLogs((current) => [...current, `Failed: ${userError.message}`]);
      publishWorkbenchEvent(dashboardContext, "branch.failed", {
        message: userError.message,
        terminalLine: `Failed: ${userError.message}`,
      });
    }
  }

  function acceptVerifiedFix() {
    if (!proofComplete) return;
    setPhase("accepted");
    setLogs((current) => [...current, "$ verified fix accepted for handoff"]);
    publishWorkbenchEvent(dashboardContext, "run.completed", {
      message: "SEC-101 verified fix accepted for handoff.",
      terminalLine: "$ run.completed access-control-fix",
    });
  }

  async function requestPatchProposal(
    selectedProvider: AgentProvider,
    testOutput: string,
  ) {
    setLlmUnavailable(null);

    try {
      const response = await fetch("/api/agent/plan-patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: tenantScenarioId,
          task,
          files: sourceFiles,
          testOutput,
          provider: selectedProvider,
        }),
      });

      if (!response.ok) {
        const detail = (await response.json()) as { message?: string };
        throw new Error(detail.message || "Patch provider failed.");
      }

      return validatePatchProposal(await response.json());
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setLlmUnavailable(message);
      setLogs((current) => [
        ...current,
        `Provider unavailable: ${message}`,
        "$ using deterministic fallback proposal",
      ]);

      const fallbackResponse = await fetch("/api/agent/plan-patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: tenantScenarioId,
          task,
          files: sourceFiles,
          testOutput,
          provider: "fallback",
        }),
      });

      if (!fallbackResponse.ok) {
        throw new Error("Fallback patch proposal failed.");
      }

      return validatePatchProposal(await fallbackResponse.json());
    }
  }

  async function runAccessControlTest({
    allowFailure,
  }: {
    allowFailure: boolean;
  }) {
    const pod = podRef.current;
    const terminal = terminalInstanceRef.current;

    if (!pod || !terminal) {
      throw new Error("BrowserPod has not booted yet.");
    }

    try {
      await pod.run("node", ["tests/test-access-control.js"], {
        terminal,
        cwd: "/forklab-agent",
        echo: true,
      });
      appendMethod("run");
    } catch (caught) {
      appendMethod("run");
      if (!allowFailure) throw caught;
    }

    const rawResult = await readTextFile(pod, "/forklab-agent/test-result.json");
    appendMethod("openFile");
    return JSON.parse(rawResult) as PodTestResult;
  }

  function appendMethod(method: string) {
    setProof((current) => ({
      ...current,
      methodSequence: [...current.methodSequence, method],
    }));
  }

  function resetRunState() {
    podRef.current = null;
    terminalInstanceRef.current = null;
    setProposal(null);
    setLlmUnavailable(null);
    setReviewViewed(false);
    setHumanApproved(false);
    setFirstTestStatus("not-run");
    setSecondTestStatus("not-run");
    setError(null);
    setProof({
      crossOriginIsolated:
        typeof window === "undefined" ? null : window.crossOriginIsolated,
      bootTimestamp: "",
      commandExecuted: tenantAllowedCommand,
      filesWritten: [],
      methodSequence: [],
      testResultJson: "",
      nonce: "",
      nonceOutput: "",
      proofResultJson: "",
    });
  }

  return (
    <div className="workbench-shell">
      <header className="workbench-hero">
        <div>
          <p className="eyebrow">ForkLab Workbench</p>
          <h1>Enterprise AI coding workbench</h1>
          <p className="muted-copy">
            Select an issue, launch a secure agent run, review the patch proposal,
            and accept only after BrowserPod produces proof.
          </p>
        </div>
        <div className="status-row">
          <span className="badge ok">Human approval required</span>
          <span className="badge info">Server-side provider keys</span>
          <span className={`badge ${proof.crossOriginIsolated ? "ok" : "warn"}`}>
            crossOriginIsolated={String(proof.crossOriginIsolated ?? "loading")}
          </span>
        </div>
      </header>

      <section className="proof-banner">
        AI-generated code is untrusted until BrowserPod verifies it.
      </section>

      {dashboardContext ? (
        <section className="info-callout">
          This workbench run is linked to{" "}
          <Link href={runPath(dashboardContext.runId)} className="text-ok">
            {dashboardContext.runId}
          </Link>
          . Events publish to the Access-Control Fix branch as the real proof runs.
        </section>
      ) : null}

      <div className="workbench-layout">
        <aside className="workbench-sidebar">
          <section className="card stack">
            <div>
              <p className="eyebrow">Repository</p>
              <h2>Built-in context</h2>
              <p className="muted-copy">
                Demo context is local and deterministic. GitHub import is preview
                only in this build.
              </p>
            </div>
            <div className="artifact-list">
              <div>
                <span>acme-billing</span>
                <strong>sample repo</strong>
              </div>
              <div>
                <span>{tenantTargetFile}</span>
                <strong>live file</strong>
              </div>
              <div>
                <span>tests/test-access-control.js</span>
                <strong>live test</strong>
              </div>
            </div>
          </section>

          <section className="card stack">
            <div>
              <p className="eyebrow">Issue selector</p>
              <h2>Select issue</h2>
            </div>
            <div className="template-list">
              {issues.map((issue) => (
                <button
                  className={`template-card${
                    selectedIssueId === issue.id ? " selected" : ""
                  }`}
                  key={issue.id}
                  type="button"
                  onClick={() => setSelectedIssueId(issue.id)}
                  disabled={phase === "running" || phase === "applying"}
                >
                  <span className="status-row">
                    <span className="template-title">
                      {issue.id}: {issue.title}
                    </span>
                    <span className={`badge ${issue.live ? "ok" : "info"}`}>
                      {issue.status}
                    </span>
                  </span>
                  <span className="template-kicker">
                    {issue.repo} / Risk: {issue.risk}
                  </span>
                  <span className="template-description">{issue.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card stack">
            <div>
              <p className="eyebrow">Provider</p>
              <h2>Patch planner</h2>
            </div>
            <div className="provider-controls">
              {[
                ["gemini", "Gemini"],
                ["groq", "Groq"],
                ["auto", "Auto"],
                ["fallback", "Fallback"],
              ].map(([value, label]) => (
                <button
                  className={`provider-option${provider === value ? " selected" : ""}`}
                  disabled={phase === "running" || phase === "applying"}
                  key={value}
                  type="button"
                  onClick={() => setProvider(value as AgentProvider)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="agent-model-grid">
              <div>
                <span>Selected model</span>
                <strong>{modelLabel(provider, config)}</strong>
              </div>
              <div>
                <span>Fallback</span>
                <strong>{proposal?.isFallback ? "used" : "available"}</strong>
              </div>
            </div>
          </section>
        </aside>

        <section className="workbench-main">
          <section className="card stack">
            <div className="dashboard-header">
              <div>
                <p className="eyebrow">Agent task</p>
                <h2>Secure run request</h2>
              </div>
              <span className={`badge ${statusTone(status, phase)}`}>
                {phaseLabel(phase)}
              </span>
            </div>
            <div className="prompt-box">
              <textarea
                aria-label="Workbench task prompt"
                disabled={phase === "running" || phase === "applying"}
                value={task}
                onChange={(event) => setTask(event.target.value)}
              />
              <div className="prompt-actions">
                <button
                  className="button primary"
                  disabled={!canLaunch}
                  type="button"
                  onClick={launchSecureRun}
                >
                  Launch secure agent run
                </button>
                <button
                  className="button"
                  disabled={!proposal}
                  type="button"
                  onClick={reviewPatchProposal}
                >
                  Review patch proposal
                </button>
                <button
                  className="button"
                  disabled={!proposal || !reviewViewed || humanApproved}
                  type="button"
                  onClick={approvePatch}
                >
                  Approve patch
                </button>
                <button
                  className="button"
                  disabled={!proofComplete || phase === "accepted"}
                  type="button"
                  onClick={acceptVerifiedFix}
                >
                  Accept verified fix
                </button>
              </div>
              {!selectedIssue.live ? (
                <p className="prompt-helper">
                  This issue is a preview scenario. Select SEC-101 for the live
                  BrowserPod proof path.
                </p>
              ) : null}
            </div>
          </section>

          <div className="workbench-grid">
            <section className="card stack">
              <div>
                <p className="eyebrow">Agent activity</p>
                <h2>Timeline</h2>
              </div>
              <div className="timeline">
                {initialTimeline.map(([id, label, detail], index) => (
                  <TimelineItem
                    detail={detail}
                    key={id}
                    label={label}
                    status={timelineStatus(index, phase, proposal, reviewViewed, humanApproved)}
                  />
                ))}
              </div>
            </section>

            <section className="card stack">
              <div>
                <p className="eyebrow">Verification policy</p>
                <h2>Trust gate</h2>
              </div>
              <div className="artifact-list">
                <div>
                  <span>First test run</span>
                  <strong className={firstTestStatus === "failed" ? "text-fail" : ""}>
                    {firstTestStatus}
                  </strong>
                </div>
                <div>
                  <span>Patch proposal</span>
                  <strong className={proposal ? "text-ok" : ""}>
                    {proposal ? "ready" : "waiting"}
                  </strong>
                </div>
                <div>
                  <span>Human approval</span>
                  <strong className={humanApproved ? "text-ok" : ""}>
                    {humanApproved ? "approved" : "required"}
                  </strong>
                </div>
                <div>
                  <span>Final BrowserPod run</span>
                  <strong className={secondTestStatus === "passed" ? "text-ok" : ""}>
                    {secondTestStatus}
                  </strong>
                </div>
              </div>
            </section>
          </div>

          <TerminalPanel
            title="/workbench · secure-agent-run"
            nativeRef={terminalRef}
            lines={logs}
          />
        </section>

        <aside className="workbench-proof">
          <BrowserPodProofPanel proof={proof} proofComplete={proofComplete} />
        </aside>
      </div>

      <div className="workbench-grid">
        <section className="card stack">
          <div className="dashboard-header">
            <div>
              <p className="eyebrow">Patch proposal</p>
              <h2>{proposal ? "Ready for review" : "Waiting for secure run"}</h2>
            </div>
            {proposal ? (
              <span className={`badge ${proposal.isFallback ? "warn" : "ok"}`}>
                {proposal.provider}
              </span>
            ) : null}
          </div>

          {llmUnavailable ? (
            <div className="info-callout">
              Selected provider failed: {llmUnavailable}. ForkLab used the
              deterministic fallback patch and still requires approval before
              writing it.
            </div>
          ) : null}

          {proposal ? (
            <>
              <div className="agent-proposal-grid">
                <div>
                  <span>Target file</span>
                  <strong>{proposal.targetFile}</strong>
                </div>
                <div>
                  <span>Risk</span>
                  <strong>{proposal.risk}</strong>
                </div>
                <div>
                  <span>Tests</span>
                  <strong>{proposal.testsToRun.join(", ")}</strong>
                </div>
              </div>
              <p className="muted-copy">{proposal.diagnosis}</p>
              <p className="muted-copy">{proposal.summary}</p>
              <pre className="agent-diff-block">
                {createSimpleDiff(buggyAccessControl, proposal.patchedContent)}
              </pre>
            </>
          ) : (
            <div className="run-empty-state">
              Launch SEC-101 to generate a patch proposal. No patch is written
              until approval.
            </div>
          )}
        </section>

        <section className={`panel${proofComplete ? " card-glow" : ""}`}>
          <div className="status-row" style={{ marginBottom: 12 }}>
            <span className={`badge ${proofComplete ? "ok" : "warn"}`}>
              Proof report: {phase === "accepted" ? "accepted" : proofComplete ? "passed" : "pending"}
            </span>
          </div>
          <p className="muted-copy">
            {proofComplete
              ? "BrowserPod observed the original failure, executed the approved patch, and read back a passing test-result JSON from the pod filesystem."
              : "The proof report completes only after the approved patch passes inside BrowserPod."}
          </p>
          <div className="report">
            <ProofItem label="Failure observed" done={firstTestStatus === "failed"} />
            <ProofItem label="Patch approved" done={humanApproved} />
            <ProofItem label="Passing test observed" done={secondTestStatus === "passed"} />
          </div>
        </section>
      </div>

      <section className="truth-panel">
        <div>
          <p className="eyebrow">What is real vs preview?</p>
          <h2>Honest demo boundary</h2>
        </div>
        <div className="truth-grid">
          <TruthItem label="Real" text="SEC-101 writes files and runs Node tests in BrowserPod." />
          <TruthItem label="Real" text="/api/agent/plan-patch keeps Gemini and Groq keys server-side." />
          <TruthItem label="Real" text="Fallback mode is deterministic and still requires approval." />
          <TruthItem label="Preview" text="GitHub import, queued UI-204, and PR creation are not live yet." />
        </div>
        <div className="actions command-actions">
          <Link href="/agent-lab" className="button">
            Open Advanced Proof Lab
          </Link>
          <Link href="/sandbox-test" className="button">
            Open Smoke Test
          </Link>
        </div>
      </section>

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
    </div>
  );
}

function BrowserPodProofPanel({
  proof,
  proofComplete,
}: {
  proof: ProofSignals;
  proofComplete: boolean;
}) {
  return (
    <section className={`card stack${proofComplete ? " card-glow" : ""}`}>
      <div>
        <p className="eyebrow">BrowserPod proof</p>
        <h2>Runtime evidence</h2>
        <p className="muted-copy">
          Signals are filled only by the live client-side BrowserPod flow.
        </p>
      </div>

      <div className="artifact-list">
        <div>
          <span>crossOriginIsolated</span>
          <strong className={proof.crossOriginIsolated ? "text-ok" : ""}>
            {String(proof.crossOriginIsolated ?? "loading")}
          </strong>
        </div>
        <div>
          <span>Boot timestamp</span>
          <strong>{proof.bootTimestamp || "waiting"}</strong>
        </div>
        <div>
          <span>Command executed</span>
          <strong>{proof.commandExecuted}</strong>
        </div>
        <div>
          <span>Nonce challenge</span>
          <strong className={proof.nonceOutput ? "text-ok" : ""}>
            {proof.nonce ? "issued" : "waiting"}
          </strong>
        </div>
      </div>

      <div>
        <h3>Method sequence</h3>
        <pre className="workbench-proof-block">
          {(proof.methodSequence.length ? proof.methodSequence : ["waiting"])
            .map((method, index) => `${index + 1}. ${method}`)
            .join("\n")}
        </pre>
      </div>

      <div>
        <h3>Files written</h3>
        <pre className="workbench-proof-block">
          {proof.filesWritten.length ? proof.filesWritten.join("\n") : "waiting"}
        </pre>
      </div>

      <div>
        <h3>Nonce terminal output</h3>
        <pre className="workbench-proof-block">
          {proof.nonceOutput || "waiting for node proof.js"}
        </pre>
      </div>

      <div>
        <h3>proof-result.json</h3>
        <pre className="workbench-proof-block">
          {proof.proofResultJson || "waiting for BrowserPod file read"}
        </pre>
      </div>

      <div>
        <h3>test-result.json</h3>
        <pre className="workbench-proof-block">
          {proof.testResultJson || "waiting for test-result JSON"}
        </pre>
      </div>
    </section>
  );
}

function TimelineItem({
  label,
  detail,
  status,
}: {
  label: string;
  detail: string;
  status: TimelineStatus;
}) {
  return (
    <div className={`timeline-step ${status === "done" ? "done" : status === "running" ? "active" : ""}`}>
      <span className="dot" />
      <div>
        <strong>{label}</strong>
        <p>{detail}</p>
      </div>
      <span>{status}</span>
    </div>
  );
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

function TruthItem({ label, text }: { label: string; text: string }) {
  const tone = label === "Real" ? "ok" : label === "Preview" ? "info" : "warn";

  return (
    <div className="card">
      <span className={`badge ${tone}`}>{label}</span>
      <p className="truth-copy">{text}</p>
    </div>
  );
}

function timelineStatus(
  index: number,
  phase: WorkbenchPhase,
  proposal: PatchProposal | null,
  reviewViewed: boolean,
  humanApproved: boolean,
): TimelineStatus {
  if (phase === "failed") return index <= 2 ? "failed" : "waiting";
  if (phase === "idle") return index === 0 ? "done" : "waiting";
  if (phase === "running") return index < 1 ? "done" : index <= 3 ? "running" : "waiting";
  if (phase === "proposal-ready") {
    if (index <= 3 && proposal) return "done";
    if (index === 4) return reviewViewed ? "done" : "running";
    return "waiting";
  }
  if (phase === "applying") {
    if (index <= 4 && humanApproved) return "done";
    if (index === 5) return "running";
    return "waiting";
  }
  if (phase === "verified") return index <= 5 ? "done" : "running";
  if (phase === "accepted") return "done";
  return "waiting";
}

function modelLabel(provider: AgentProvider, config: AgentConfig | null) {
  if (provider === "gemini") return config?.geminiModel ?? "gemini-2.5-flash";
  if (provider === "groq") return config?.groqModel ?? "configured Groq model";
  if (provider === "auto") {
    return `${config?.geminiModel ?? "gemini"} -> ${
      config?.groqModel ?? "groq"
    }`;
  }
  return "deterministic local patch";
}

function phaseLabel(phase: WorkbenchPhase) {
  if (phase === "idle") return "Ready";
  if (phase === "running") return "Running secure agent";
  if (phase === "proposal-ready") return "Proposal ready";
  if (phase === "applying") return "Verifying approved patch";
  if (phase === "verified") return "Verified";
  if (phase === "accepted") return "Accepted";
  return "Failed";
}

function statusTone(status: PodStatus, phase: WorkbenchPhase) {
  if (phase === "verified" || phase === "accepted" || status === "passed") return "ok";
  if (phase === "proposal-ready") return "warn";
  if (phase === "failed" || status === "failed") return "fail";
  if (phase === "running" || phase === "applying") return "info";
  return "warn";
}

function publishWorkbenchEvent(
  context: DashboardContext | null,
  type: RunEventType,
  {
    message,
    terminalLine,
  }: {
    message: string;
    terminalLine: string;
  },
) {
  if (!context) return;

  publishRunEvent(context.runId, {
    type,
    branchId: type === "run.completed" ? undefined : context.branchId,
    message,
    terminalLine,
  });
}

function createNonce() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `nonce-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createProofScript(nonce: string) {
  return `const { writeFileSync } = require("node:fs");

const proof = {
  nonce: ${JSON.stringify(nonce)},
  executedAt: new Date().toISOString(),
  runtime: process.version,
  cwd: process.cwd()
};

console.log("ForkLab BrowserPod proof nonce:", proof.nonce);
writeFileSync("/forklab-agent/proof-result.json", JSON.stringify(proof, null, 2));
`;
}

function createSimpleDiff(before: string, after: string) {
  return `--- a/${tenantTargetFile}
+++ b/${tenantTargetFile}
@@
${before
  .trimEnd()
  .split("\n")
  .map((line) => `-${line}`)
  .join("\n")}
${after
  .trimEnd()
  .split("\n")
  .map((line) => `+${line}`)
  .join("\n")}`;
}
