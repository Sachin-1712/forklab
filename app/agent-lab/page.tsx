"use client";

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

type TestStatus = "not-run" | "failed" | "passed";
type AgentConfig = {
  defaultProvider: "gemini" | "groq" | "auto";
  geminiModel: string;
  groqModel: string;
};
type PodTestResult = {
  status: "failed" | "passed";
  failures: Array<{ name: string; message: string }>;
};

const task =
  "Fix canViewInvoice so tenant boundaries are enforced before admin or owner access.";

const sourceFiles = [
  { path: tenantTargetFile, content: buggyAccessControl },
  { path: "tests/test-access-control.js", content: accessControlTest },
];

export default function AgentLabPage() {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const podRef = useRef<BrowserPodInstance | null>(null);
  const terminalInstanceRef = useRef<unknown>(null);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [provider, setProvider] = useState<AgentProvider>("auto");
  const [status, setStatus] = useState<PodStatus>("idle");
  const [firstTestStatus, setFirstTestStatus] = useState<TestStatus>("not-run");
  const [secondTestStatus, setSecondTestStatus] = useState<TestStatus>("not-run");
  const [proposal, setProposal] = useState<PatchProposal | null>(null);
  const [llmUnavailable, setLlmUnavailable] = useState<string | null>(null);
  const [humanApproved, setHumanApproved] = useState(false);
  const [patchApplied, setPatchApplied] = useState(false);
  const [testOutput, setTestOutput] = useState("");
  const [activeSource, setActiveSource] = useState(tenantTargetFile);
  const [logs, setLogs] = useState<string[]>([
    "Ready. Boot BrowserPod to run the access-control security test.",
  ]);
  const [error, setError] = useState<UserFacingError | null>(null);

  useEffect(() => {
    const uninstall = installBrowserPodRuntimeErrorGuard();

    fetch("/api/agent/plan-patch")
      .then((response) => response.json())
      .then((nextConfig: AgentConfig) => {
        setConfig(nextConfig);
        setProvider(nextConfig.defaultProvider ?? "auto");
      })
      .catch(() => {
        setProvider("auto");
      });

    return uninstall;
  }, []);

  async function bootAndRunFailingTest() {
    setStatus("booting");
    setError(null);
    setProposal(null);
    setLlmUnavailable(null);
    setHumanApproved(false);
    setPatchApplied(false);
    setFirstTestStatus("not-run");
    setSecondTestStatus("not-run");
    setTestOutput("");
    setLogs([
      "$ boot BrowserPod agent lab",
      "$ scenario=tenant-access-control",
    ]);

    if (terminalRef.current) {
      terminalRef.current.innerHTML = "";
    }

    try {
      const pod = await bootForkLabPod(makeStorageKey("forklab-agent"));
      const terminal = await pod.createDefaultTerminal(terminalRef.current!);

      podRef.current = pod;
      terminalInstanceRef.current = terminal;

      setStatus("writing-files");
      await pod.createDirectory("/forklab-agent/src", { recursive: true });
      await pod.createDirectory("/forklab-agent/tests", { recursive: true });
      await writeTextFile(
        pod,
        "/forklab-agent/src/accessControl.js",
        buggyAccessControl,
      );
      await writeTextFile(
        pod,
        "/forklab-agent/tests/test-access-control.js",
        accessControlTest,
      );
      setLogs((current) => [
        ...current,
        "$ wrote src/accessControl.js",
        "$ wrote tests/test-access-control.js",
      ]);

      setStatus("running-command");
      setLogs((current) => [...current, `$ ${tenantAllowedCommand}`]);
      const result = await runAccessControlTest({ allowFailure: true });

      if (result.status !== "failed") {
        throw new Error("Expected the first access-control test run to fail.");
      }

      setStatus("failed");
      setFirstTestStatus("failed");
      setTestOutput(formatTestResult(result));
      setLogs((current) => [
        ...current,
        `First test result: failed (${result.failures.length} assertion failure${
          result.failures.length === 1 ? "" : "s"
        })`,
      ]);
    } catch (caught) {
      setStatus("failed");
      const userError = toUserFacingError(caught);
      setError(userError);
      setLogs((current) => [...current, `Failed: ${userError.message}`]);
    }
  }

  async function askForPatch(selectedProvider = provider) {
    setError(null);
    setLlmUnavailable(null);
    setProposal(null);
    setHumanApproved(false);
    setPatchApplied(false);
    setLogs((current) => [
      ...current,
      `$ request patch provider=${selectedProvider}`,
    ]);

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
        throw new Error(detail.message || "LLM provider failed.");
      }

      const nextProposal = validatePatchProposal(await response.json());
      setProposal(nextProposal);
      setLogs((current) => [
        ...current,
        nextProposal.isFallback
          ? "$ fallback patch prepared"
          : `$ ${nextProposal.provider} patch proposal received`,
      ]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setLlmUnavailable(message);
      setLogs((current) => [
        ...current,
        `LLM unavailable: ${message}`,
        "$ deterministic fallback remains available",
      ]);
    }
  }

  function approvePatch() {
    setHumanApproved(true);
    setLogs((current) => [...current, "$ human approved patch proposal"]);
  }

  async function applyApprovedPatch() {
    if (!proposal || !humanApproved || !podRef.current) return;

    setStatus("patching");
    setError(null);
    setLogs((current) => [...current, "$ write approved src/accessControl.js"]);

    try {
      await writeTextFile(
        podRef.current,
        "/forklab-agent/src/accessControl.js",
        proposal.patchedContent,
      );
      setPatchApplied(true);
      setLogs((current) => [...current, "Patch applied: src/accessControl.js"]);
    } catch (caught) {
      setStatus("failed");
      const userError = toUserFacingError(caught);
      setError(userError);
      setLogs((current) => [...current, `Failed: ${userError.message}`]);
    }
  }

  async function rerunTest() {
    if (!patchApplied) return;

    setStatus("running-command");
    setError(null);
    setLogs((current) => [...current, `$ ${tenantAllowedCommand}`]);

    try {
      const result = await runAccessControlTest({ allowFailure: false });

      if (result.status !== "passed") {
        throw new Error("Expected the approved access-control patch to pass.");
      }

      setStatus("passed");
      setSecondTestStatus("passed");
      setLogs((current) => [
        ...current,
        "Passed: tenant access-control patch verified in BrowserPod.",
      ]);
    } catch (caught) {
      setStatus("failed");
      setSecondTestStatus("failed");
      const userError = toUserFacingError(caught);
      setError(userError);
      setLogs((current) => [...current, `Failed: ${userError.message}`]);
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
    } catch (caught) {
      if (!allowFailure) throw caught;
    }

    const rawResult = await readTextFile(
      pod,
      "/forklab-agent/test-result.json",
    );
    return JSON.parse(rawResult) as PodTestResult;
  }

  const activeFile =
    activeSource === tenantTargetFile
      ? { path: tenantTargetFile, content: proposal?.patchedContent ?? buggyAccessControl }
      : { path: "tests/test-access-control.js", content: accessControlTest };
  const proofComplete =
    firstTestStatus === "failed" &&
    Boolean(proposal) &&
    humanApproved &&
    patchApplied &&
    secondTestStatus === "passed";

  return (
    <div className="agent-lab-shell">
      <header className="agent-lab-hero">
        <div>
          <p className="eyebrow">LLM Agent Lab</p>
          <h1>LLM Agent Lab</h1>
          <p className="muted-copy">
            One BrowserPod branch, one failing security test, one AI-generated
            patch proposal, human-approved before execution.
          </p>
        </div>
        <div className="status-row">
          <span className="badge ok">BrowserPod verified</span>
          <span className="badge info">Server-side LLM keys</span>
          <span className="badge warn">Human approval gate</span>
        </div>
      </header>

      <section className="agent-provider-panel">
        <div>
          <p className="eyebrow">Provider control</p>
          <h2>Patch planner</h2>
          <p className="muted-copy">
            Model names come from server env. API keys never leave the server route.
          </p>
        </div>
        <div className="provider-controls">
          {[
            ["gemini", "Gemini"],
            ["groq", "Groq"],
            ["auto", "Auto"],
            ["fallback", "Fallback demo patch"],
          ].map(([value, label]) => (
            <button
              className={`provider-option${provider === value ? " selected" : ""}`}
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
            <span>Fallback mode</span>
            <strong>{proposal?.isFallback ? "Used" : "Not used"}</strong>
          </div>
        </div>
      </section>

      <section className="proof-banner">
        AI-generated code is untrusted until BrowserPod verifies it.
      </section>

      <div className="agent-lab-grid">
        <section className="card stack">
          <div>
            <p className="eyebrow">Run control</p>
            <h2>Human-approved patch loop</h2>
          </div>
          <div className="agent-step-controls">
            <button
              className="button primary"
              type="button"
              onClick={bootAndRunFailingTest}
              disabled={!["idle", "failed", "passed"].includes(status)}
            >
              Boot BrowserPod and run failing test
            </button>
            <button
              className="button"
              type="button"
              onClick={() => askForPatch()}
              disabled={firstTestStatus !== "failed"}
            >
              Ask LLM for patch
            </button>
            <button
              className="button"
              type="button"
              onClick={applyApprovedPatch}
              disabled={!proposal || !humanApproved || patchApplied}
            >
              Approve and apply patch
            </button>
            <button
              className="button"
              type="button"
              onClick={rerunTest}
              disabled={!patchApplied || secondTestStatus === "passed"}
            >
              Rerun test
            </button>
          </div>
          <div className="artifact-list">
            <div>
              <span>First run</span>
              <strong className={firstTestStatus === "failed" ? "text-fail" : ""}>
                {firstTestStatus}
              </strong>
            </div>
            <div>
              <span>Patch approval</span>
              <strong className={humanApproved ? "text-ok" : ""}>
                {humanApproved ? "approved" : "waiting"}
              </strong>
            </div>
            <div>
              <span>Second run</span>
              <strong className={secondTestStatus === "passed" ? "text-ok" : ""}>
                {secondTestStatus}
              </strong>
            </div>
          </div>
        </section>

        <section className="card stack">
          <div>
            <p className="eyebrow">Why this bug matters</p>
            <h2>Multi-tenant access risk</h2>
          </div>
          <p className="muted-copy">
            Tenant isolation bugs let privileged users cross account boundaries.
            In billing or invoice systems, checking role before tenant identity can
            expose another customer&apos;s data even when the user is otherwise valid.
          </p>
        </section>
      </div>

      <TerminalPanel
        title="/agent-lab · tenant-access-control"
        nativeRef={terminalRef}
        lines={logs}
      />

      <div className="agent-lab-grid">
        <section className="card stack">
          <div>
            <p className="eyebrow">File viewer</p>
            <h2>BrowserPod files</h2>
          </div>
          <div className="provider-controls">
            {[tenantTargetFile, "tests/test-access-control.js"].map((path) => (
              <button
                className={`provider-option${activeSource === path ? " selected" : ""}`}
                key={path}
                type="button"
                onClick={() => setActiveSource(path)}
              >
                {path}
              </button>
            ))}
          </div>
          <pre className="agent-code-block">{activeFile.content}</pre>
        </section>

        <section className="card stack">
          <div>
            <p className="eyebrow">LLM patch proposal</p>
            <h2>{proposal ? "Proposal ready" : "Waiting for proposal"}</h2>
          </div>

          {llmUnavailable ? (
            <div className="error-panel">
              <h3>LLM unavailable</h3>
              <p>{llmUnavailable}</p>
              <button
                className="button"
                type="button"
                onClick={() => askForPatch("fallback")}
              >
                Use deterministic fallback patch
              </button>
            </div>
          ) : null}

          {proposal ? (
            <>
              <div className="agent-proposal-grid">
                <div>
                  <span>Provider</span>
                  <strong>
                    {proposal.provider}
                    {proposal.isFallback ? " · fallback" : ""}
                  </strong>
                </div>
                <div>
                  <span>Risk</span>
                  <strong>{proposal.risk}</strong>
                </div>
                <div>
                  <span>Target file</span>
                  <strong>{proposal.targetFile}</strong>
                </div>
              </div>
              <p className="muted-copy">{proposal.diagnosis}</p>
              <p className="muted-copy">{proposal.summary}</p>
              <pre className="agent-diff-block">
                {createSimpleDiff(buggyAccessControl, proposal.patchedContent)}
              </pre>
              <button
                className="button primary"
                type="button"
                onClick={approvePatch}
                disabled={humanApproved}
              >
                Approve patch
              </button>
            </>
          ) : (
            <div className="run-empty-state">
              Run the failing test, then ask the selected provider for a patch.
            </div>
          )}
        </section>
      </div>

      <section className={`panel${proofComplete ? " card-glow" : ""}`}>
        <div className="status-row" style={{ marginBottom: 12 }}>
          <span className={`badge ${proofComplete ? "ok" : "warn"}`}>
            Proof report: {proofComplete ? "passed" : "pending"}
          </span>
        </div>
        <div className="report">
          <ProofItem label="Failing test observed" done={firstTestStatus === "failed"} />
          <ProofItem label="LLM patch proposed" done={Boolean(proposal)} />
          <ProofItem label="Human approved" done={humanApproved} />
          <ProofItem label="Patch written into BrowserPod" done={patchApplied} />
          <ProofItem label="Passing test observed" done={secondTestStatus === "passed"} />
        </div>
      </section>

      <section className="truth-panel">
        <div>
          <p className="eyebrow">Next scenario</p>
          <h2>Frontend Sidebar Route Change Bug</h2>
        </div>
        <p className="muted-copy">
          Prepared / not live yet. Planned files:
          /forklab-frontend/src/sidebarState.js and
          /forklab-frontend/tests/test-sidebarState.js. This scenario is not
          verified in v1.
        </p>
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

function ProofItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="card">
      <strong>{label}</strong>
      <span className={done ? "text-ok" : ""}>
        {done ? "Verified in flow" : "Waiting"}
      </span>
    </div>
  );
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

function formatTestResult(result: PodTestResult) {
  return JSON.stringify(result, null, 2);
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
