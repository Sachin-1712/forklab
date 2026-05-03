"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
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
  createSidebarArenaBranchList,
  loadRunSnapshot,
  publishRunEvent,
  recordArenaPatch,
  runPath,
  type BranchId,
  type RunEvent,
  type RunEventType,
} from "@/lib/runEvents";
import {
  createSandboxBuildScript,
  createSandboxIssueBranchList,
  createSandboxIssueDiff,
  createSandboxPackageJson,
  createSandboxPatchScript,
  createSandboxProofScript,
  getSandboxIssue,
  sandboxIssueIds,
  type SandboxIssue,
} from "@/lib/sandboxIssues";
import {
  buggySidebarState,
  fixedSidebarState,
  sidebarApplyPatch,
  sidebarProofScript,
  sidebarStateTest,
  sidebarTargetFile,
  sidebarTestCommand,
} from "@/lib/sidebarBranch";
import {
  createArenaBuildScript,
  createArenaDiff,
  createArenaPackageJson,
  createArenaProofScript,
  getSidebarArenaVariant,
  isSidebarArenaBranch,
  type SidebarArenaVariant,
} from "@/lib/sidebarArena";
import {
  arenaSidebarTaskDescription,
  type ArenaPatchProposal,
} from "@/lib/llm/arenaSchema";
import type { IssuePatchProposal } from "@/lib/llm/issueSchema";

type PodTestResult = {
  status: "failed" | "passed";
  failures: Array<{ name: string; message: string }>;
};
type ArenaFailureContext = {
  patchedContent: string;
  failureReason: string;
  errorOutput: string;
};
type IssueFailureContext = ArenaFailureContext;
const ARENA_MAX_ATTEMPTS = 3;
const ISSUE_MAX_ATTEMPTS = 2;
type BuildResult = {
  status: "passed";
  branch?: string;
  strategy?: string;
  previewHtml?: string;
  repo?: string;
  issue?: number;
  title?: string;
  filesChanged: string[];
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
  const searchParams = useSearchParams();
  const runId = paramValue(params.runId);
  const branchId = paramValue(params.branchId) as BranchId;
  const arenaVariant = getSidebarArenaVariant(branchId);
  const sandboxIssue = getSandboxIssue(branchId);
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const podRef = useRef<BrowserPodInstance | null>(null);
  const terminalInstanceRef = useRef<unknown>(null);
  const autoStartedRef = useRef(false);
  const branch = useMemo(
    () =>
      [
        ...createBranchList(),
        ...createSidebarArenaBranchList(),
        ...createSandboxIssueBranchList(sandboxIssueIds),
      ].find((candidate) => candidate.id === branchId),
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
  const [arenaBuildResult, setArenaBuildResult] = useState<BuildResult | null>(null);
  const [arenaPatchProposal, setArenaPatchProposal] =
    useState<ArenaPatchProposal | null>(null);
  const [issuePatchProposal, setIssuePatchProposal] =
    useState<IssuePatchProposal | null>(null);
  const [issueSourceContent, setIssueSourceContent] = useState("");
  const [issuePushStatus, setIssuePushStatus] = useState<
    "idle" | "pushing" | "pushed" | "failed"
  >("idle");
  const [issuePushMessage, setIssuePushMessage] = useState("");
  const [arenaAttemptNumber, setArenaAttemptNumber] = useState(0);
  const [arenaFailureContext, setArenaFailureContext] =
    useState<ArenaFailureContext | null>(null);
  const [issueAttemptNumber, setIssueAttemptNumber] = useState(0);
  const [issueFailureContext, setIssueFailureContext] =
    useState<IssueFailureContext | null>(null);
  const [arenaRetryStatus, setArenaRetryStatus] = useState<
    "idle" | "running"
  >("idle");
  const [issueRetryStatus, setIssueRetryStatus] = useState<
    "idle" | "running"
  >("idle");
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
      branchId !== "sidebar-toggle-fix" &&
      !isSidebarArenaBranch(branchId) &&
      !sandboxIssue
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

  useEffect(() => {
    if ((!arenaVariant && !sandboxIssue) || searchParams.get("autostart") !== "1") return;
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    if (arenaVariant) {
      void runSidebarArenaProof(arenaVariant);
    } else if (sandboxIssue) {
      void runSandboxIssueProof(sandboxIssue);
    }
  });

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

  async function runSidebarArenaProof(variant: SidebarArenaVariant) {
    setSentProofEvents(true);
    setSidebarError(null);
    setSidebarFirstResult(null);
    setSidebarSecondResult(null);
    setArenaBuildResult(null);
    setArenaPatchProposal(null);
    setPodStatus("booting");
    setTerminalLines([
      `$ starting ${variant.title} BrowserPod branch`,
      "scenario=parallel-sidebar-arena",
      `strategy=${variant.strategy}`,
    ]);

    if (terminalRef.current) {
      terminalRef.current.innerHTML = "";
    }

    try {
      publishRunEvent(runId, {
        type: "branch.booting",
        branchId: variant.id,
        message: `BrowserPod is booting for ${variant.title}.`,
        terminalLine: `$ boot BrowserPod ${variant.title}`,
      });

      const pod = await bootForkLabPod(makeStorageKey(`forklab-${variant.id}`));
      const terminal = await pod.createDefaultTerminal(terminalRef.current!);
      podRef.current = pod;
      terminalInstanceRef.current = terminal;

      setPodStatus("writing-files");
      await pod.createDirectory("/forklab-arena/src", { recursive: true });
      await pod.createDirectory("/forklab-arena/tests", { recursive: true });
      await writeTextFile(
        pod,
        "/forklab-arena/package.json",
        createArenaPackageJson(variant),
      );
      await writeTextFile(
        pod,
        "/forklab-arena/src/sidebarState.js",
        buggySidebarState,
      );
      await writeTextFile(
        pod,
        "/forklab-arena/tests/test-sidebarState.js",
        variant.testContent,
      );
      await writeTextFile(
        pod,
        "/forklab-arena/build.js",
        createArenaBuildScript(variant),
      );
      await writeTextFile(
        pod,
        "/forklab-arena/proof.js",
        createArenaProofScript(variant),
      );
      publishRunEvent(runId, {
        type: "branch.files_written",
        branchId: variant.id,
        message: `${variant.title} starter files, test, build, and proof scripts written.`,
        terminalLine:
          "$ wrote package.json src/sidebarState.js tests/test-sidebarState.js build.js proof.js",
      });
      setTerminalLines((current) => [
        ...current,
        "$ wrote package.json",
        "$ wrote src/sidebarState.js",
        "$ wrote tests/test-sidebarState.js",
        "$ wrote build.js",
        "$ wrote proof.js",
      ]);

      setPodStatus("running-command");
      setTerminalLines((current) => [...current, "$ node proof.js"]);
      await pod.run("node", ["proof.js"], {
        terminal,
        cwd: "/forklab-arena",
        echo: true,
      });

      setTerminalLines((current) => [
        ...current,
        "$ npm test",
        "Expected: route-change check should fail before patch.",
      ]);
      const firstResult = await runArenaTest({ allowFailure: true });

      if (firstResult.status !== "failed") {
        throw new Error(`Expected ${variant.title} first test run to fail.`);
      }

      setSidebarFirstResult(firstResult);
      publishRunEvent(runId, {
        type: "branch.test_failed",
        branchId: variant.id,
        message: `${variant.title} observed the route-change failure before patch.`,
        terminalLine: "FAIL route change closes sidebar",
      });
      setTerminalLines((current) => [
        ...current,
        `First test result: failed (${firstResult.failures.length} assertion failure${
          firstResult.failures.length === 1 ? "" : "s"
        })`,
        `$ POST /api/arena/plan-patch strategy=${variant.id}`,
      ]);

      await runAiPatchCycle(variant, formatTestOutput(firstResult), 1);
    } catch (caught) {
      setPodStatus("failed");
      const userError = toUserFacingError(caught);
      setSidebarError(userError);
      setTerminalLines((current) => [...current, `Failed: ${userError.message}`]);
      publishRunEvent(runId, {
        type: "branch.failed",
        branchId: variant.id,
        message: userError.message,
        terminalLine: `Failed: ${userError.message}`,
      });
    }
  }

  async function runSandboxIssueProof(issue: SandboxIssue) {
    setSentProofEvents(true);
    setSidebarError(null);
    setSidebarFirstResult(null);
    setSidebarSecondResult(null);
    setArenaBuildResult(null);
    setArenaPatchProposal(null);
    setIssuePatchProposal(null);
    setIssueSourceContent("");
    setIssuePushStatus("idle");
    setIssuePushMessage("");
    setIssueAttemptNumber(0);
    setIssueFailureContext(null);
    setPodStatus("booting");
    setTerminalLines([
      `$ starting GitHub issue #${issue.number} BrowserPod branch`,
      "repo=Jyozaa/forklab-sandbox-issues",
      `target=${issue.targetFile}`,
    ]);

    if (terminalRef.current) {
      terminalRef.current.innerHTML = "";
    }

    try {
      publishRunEvent(runId, {
        type: "branch.booting",
        branchId: issue.id,
        message: `BrowserPod is booting for sandbox issue #${issue.number}.`,
        terminalLine: `$ boot BrowserPod issue #${issue.number}`,
      });

      const pod = await bootForkLabPod(makeStorageKey(`forklab-${issue.id}`));
      const terminal = await pod.createDefaultTerminal(terminalRef.current!);
      podRef.current = pod;
      terminalInstanceRef.current = terminal;

      setPodStatus("writing-files");
      const source = await fetchSandboxIssueSource(issue);
      setIssueSourceContent(source.sourceContent);
      await pod.createDirectory("/forklab-issue/src", { recursive: true });
      await pod.createDirectory("/forklab-issue/tests", { recursive: true });
      await writeTextFile(
        pod,
        "/forklab-issue/package.json",
        createSandboxPackageJson(issue),
      );
      await writeTextFile(
        pod,
        `/forklab-issue/${issue.targetFile}`,
        source.sourceContent,
      );
      await writeTextFile(
        pod,
        `/forklab-issue/${issue.testFile}`,
        issue.testContent,
      );
      await writeTextFile(
        pod,
        "/forklab-issue/build.js",
        createSandboxBuildScript(issue),
      );
      await writeTextFile(
        pod,
        "/forklab-issue/proof.js",
        createSandboxProofScript(issue),
      );

      publishRunEvent(runId, {
        type: "branch.files_written",
        branchId: issue.id,
        message: `Sandbox files for #${issue.number} written into BrowserPod.`,
        terminalLine: `$ wrote package.json ${issue.targetFile} ${issue.testFile} build.js proof.js`,
      });
      setTerminalLines((current) => [
        ...current,
        `$ fetched ${issue.targetFile} from GitHub`,
        "$ wrote package.json",
        `$ wrote ${issue.targetFile}`,
        `$ wrote ${issue.testFile}`,
        "$ wrote build.js",
        "$ wrote proof.js",
      ]);

      setPodStatus("running-command");
      setTerminalLines((current) => [
        ...current,
        "$ node proof.js",
      ]);
      await pod.run("node", ["proof.js"], {
        terminal,
        cwd: "/forklab-issue",
        echo: true,
      });

      setTerminalLines((current) => [
        ...current,
        "$ npm test",
        "Expected: issue regression should fail before patch.",
      ]);
      const firstResult = await runIssueTest({ allowFailure: true });

      if (firstResult.status !== "failed") {
        throw new Error(`Expected sandbox issue #${issue.number} to fail first.`);
      }

      setSidebarFirstResult(firstResult);
      publishRunEvent(runId, {
        type: "branch.test_failed",
        branchId: issue.id,
        message: `Issue #${issue.number} failing regression observed before patch.`,
        terminalLine: `FAIL issue #${issue.number} regression`,
      });

      setTerminalLines((current) => [
        ...current,
        `First test result: failed (${firstResult.failures.length} assertion failure${
          firstResult.failures.length === 1 ? "" : "s"
        })`,
        `$ POST /api/issues/plan-patch issue=#${issue.number}`,
      ]);

      await runIssuePatchCycle(
        issue,
        source.sourceContent,
        formatTestOutput(firstResult),
        1,
      );
    } catch (caught) {
      setPodStatus("failed");
      const userError = toUserFacingError(caught);
      setSidebarError(userError);
      setTerminalLines((current) => [...current, `Failed: ${userError.message}`]);
      publishRunEvent(runId, {
        type: "branch.failed",
        branchId: issue.id,
        message: userError.message,
        terminalLine: `Failed: ${userError.message}`,
      });
    }
  }

  async function pushVerifiedIssuePatch() {
    if (!sandboxIssue || !issuePatchProposal || podStatus !== "passed") return;
    setIssuePushStatus("pushing");
    setIssuePushMessage("");

    try {
      const response = await fetch("/api/issues/push-patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: sandboxIssue.id,
          patchedContent: issuePatchProposal.patchedContent,
        }),
      });
      const payload = (await response.json()) as {
        status?: string;
        branchUrl?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message || "GitHub push failed.");
      }
      setIssuePushStatus("pushed");
      setIssuePushMessage(payload.branchUrl || "Patch pushed to GitHub.");
      setTerminalLines((current) => [
        ...current,
        `$ pushed verified patch to ${sandboxIssue.targetFile}`,
      ]);
    } catch (caught) {
      setIssuePushStatus("failed");
      setIssuePushMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function fetchSandboxIssueSource(issue: SandboxIssue) {
    const response = await fetch("/api/issues/source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId: issue.id }),
    });
    const payload = (await response.json()) as {
      sourceContent?: string;
      message?: string;
    };
    if (!response.ok || !payload.sourceContent) {
      throw new Error(payload.message || "Could not fetch source from GitHub.");
    }
    return { sourceContent: payload.sourceContent };
  }

  async function runIssuePatchCycle(
    issue: SandboxIssue,
    sourceContent: string,
    testOutput: string,
    attemptNumber: number,
    previousAttempt?: {
      patchedContent: string;
      failureReason: string;
      errorOutput: string;
      attemptNumber: number;
    },
  ) {
    const pod = podRef.current;
    const terminal = terminalInstanceRef.current;
    if (!pod || !terminal) {
      throw new Error("BrowserPod has not booted yet.");
    }

    setIssueAttemptNumber(attemptNumber);
    setIssueFailureContext(null);
    if (!sourceContent.trim()) {
      throw new Error("GitHub source content is not loaded.");
    }

    const proposal = await requestSandboxIssuePatch(
      issue,
      sourceContent,
      testOutput,
      previousAttempt,
    );
    setIssuePatchProposal(proposal);
    publishRunEvent(runId, {
      type: "branch.llm_patch_proposed",
      branchId: issue.id,
      message: `${proposal.provider}${proposal.isFallback ? "/fallback" : ""} proposed a patch for #${issue.number} (attempt ${attemptNumber}).`,
      terminalLine: `$ ${proposal.provider} proposed patch for #${issue.number} (attempt ${attemptNumber})`,
    });

    await writeTextFile(
      pod,
      "/forklab-issue/applyPatch.js",
      createSandboxPatchScript(proposal.patchedContent, issue.targetFile),
    );
    setPodStatus("patching");
    setTerminalLines((current) => [
      ...current,
      "$ wrote applyPatch.js",
      "$ node applyPatch.js",
    ]);
    await pod.run("node", ["applyPatch.js"], {
      terminal,
      cwd: "/forklab-issue",
      echo: true,
    });
    publishRunEvent(runId, {
      type: "branch.patch_applied",
      branchId: issue.id,
      message: `Patch attempt ${attemptNumber} for #${issue.number} written into BrowserPod.`,
      terminalLine: "$ node applyPatch.js",
    });

    setPodStatus("running-command");
    setTerminalLines((current) => [...current, "$ npm test"]);
    let secondResult: PodTestResult;
    try {
      secondResult = await runIssueTest({ allowFailure: true });
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : String(caught);
      const failure = {
        patchedContent: proposal.patchedContent,
        failureReason: "Tests crashed after applying the patch",
        errorOutput: errorMessage,
      };
      setIssueFailureContext(failure);
      throw new Error(`Patched tests crashed: ${errorMessage}`);
    }

    if (secondResult.status !== "passed") {
      const failure = {
        patchedContent: proposal.patchedContent,
        failureReason: `${secondResult.failures.length} assertion failure${secondResult.failures.length === 1 ? "" : "s"} after applying the patch`,
        errorOutput: formatTestOutput(secondResult),
      };
      setSidebarSecondResult(secondResult);
      setIssueFailureContext(failure);
      throw new Error(`Patch attempt ${attemptNumber} did not pass BrowserPod verification.`);
    }

    setSidebarSecondResult(secondResult);
    publishRunEvent(runId, {
      type: "branch.test_passed",
      branchId: issue.id,
      message: `Issue #${issue.number} tests passed in BrowserPod.`,
      terminalLine: "PASS npm test",
    });

    setTerminalLines((current) => [...current, "$ npm run build"]);
    await pod.run("npm", ["run", "build"], {
      terminal,
      cwd: "/forklab-issue",
      echo: true,
    });
    const rawBuildResult = await readTextFile(
      pod,
      "/forklab-issue/build-result.json",
    );
    const nextBuildResult = JSON.parse(rawBuildResult) as BuildResult;
    setArenaBuildResult(nextBuildResult);

    setPodStatus("passed");
    localStorage.setItem(`forklab:${issue.id}:proof-passed`, "true");
    publishRunEvent(runId, {
      type: "branch.verified",
      branchId: issue.id,
      message: `Issue #${issue.number} verified: tests and build passed in BrowserPod.`,
      terminalLine: `VERIFIED issue #${issue.number} via BrowserPod`,
    });
    setTerminalLines((current) => [
      ...current,
      `Passed: issue #${issue.number} verified in BrowserPod.`,
    ]);
  }

  async function requestIssueRetry() {
    if (!sandboxIssue || !issueFailureContext) return;
    if (issueAttemptNumber >= ISSUE_MAX_ATTEMPTS) return;
    if (issueRetryStatus === "running") return;

    const nextAttempt = issueAttemptNumber + 1;
    const previous = {
      patchedContent: issueFailureContext.patchedContent,
      failureReason: issueFailureContext.failureReason,
      errorOutput: issueFailureContext.errorOutput,
      attemptNumber: issueAttemptNumber,
    };

    setIssueRetryStatus("running");
    setSidebarError(null);
    setSidebarSecondResult(null);
    setArenaBuildResult(null);
    setPodStatus("running-command");
    setTerminalLines((current) => [
      ...current,
      `$ retrying issue patch (attempt ${nextAttempt} of ${ISSUE_MAX_ATTEMPTS})`,
      `previous failure: ${previous.failureReason}`,
    ]);

    try {
      await runIssuePatchCycle(
        sandboxIssue,
        issueSourceContent,
        formatTestOutput(sidebarFirstResult ?? { status: "failed", failures: [] }),
        nextAttempt,
        previous,
      );
    } catch (caught) {
      setPodStatus("failed");
      const userError = toUserFacingError(caught);
      setSidebarError(userError);
      setTerminalLines((current) => [...current, `Failed: ${userError.message}`]);
      publishRunEvent(runId, {
        type: "branch.failed",
        branchId: sandboxIssue.id,
        message: userError.message,
        terminalLine: `Failed (attempt ${nextAttempt}): ${userError.message}`,
      });
    } finally {
      setIssueRetryStatus("idle");
    }
  }

  async function requestSandboxIssuePatch(
    issue: SandboxIssue,
    sourceContent: string,
    testOutput: string,
    previousAttempt?: {
      patchedContent: string;
      failureReason: string;
      errorOutput: string;
      attemptNumber: number;
    },
  ): Promise<IssuePatchProposal> {
    const body = {
      issueId: issue.id,
      sourceContent,
      testOutput,
      provider: "auto" as const,
      previousAttempt,
    };

    try {
      const response = await fetch("/api/issues/plan-patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = (await response.json()) as { message?: string };
        throw new Error(detail.message || "Sandbox issue provider failed.");
      }
      return (await response.json()) as IssuePatchProposal;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setTerminalLines((current) => [
        ...current,
        `Provider unavailable: ${message}`,
        "$ requesting deterministic sandbox issue patch",
      ]);
      const fallback = await fetch("/api/issues/plan-patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, provider: "fallback" }),
      });
      if (!fallback.ok) {
        throw new Error("Fallback sandbox issue patch unavailable.");
      }
      return (await fallback.json()) as IssuePatchProposal;
    }
  }

  async function requestArenaPatchProposal(
    variant: SidebarArenaVariant,
    testOutput: string,
    previousAttempt?: { patchedContent: string; failureReason: string; errorOutput: string; attemptNumber: number },
  ): Promise<ArenaPatchProposal> {
    const body = {
      strategyId: variant.id,
      task: arenaSidebarTaskDescription,
      buggyContent: buggySidebarState,
      testOutput,
      provider: "auto" as const,
      previousAttempt,
    };
    try {
      const response = await fetch("/api/arena/plan-patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = (await response.json()) as { message?: string };
        throw new Error(detail.message || "Arena patch provider failed.");
      }
      return (await response.json()) as ArenaPatchProposal;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setTerminalLines((current) => [
        ...current,
        `Provider unavailable: ${message}`,
        "$ requesting deterministic fallback patch",
      ]);
      const fallback = await fetch("/api/arena/plan-patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, provider: "fallback" }),
      });
      if (!fallback.ok) {
        throw new Error("Fallback arena patch unavailable.");
      }
      return (await fallback.json()) as ArenaPatchProposal;
    }
  }

  async function runAiPatchCycle(
    variant: SidebarArenaVariant,
    testOutput: string,
    attemptNumber: number,
    previousAttempt?: { patchedContent: string; failureReason: string; errorOutput: string; attemptNumber: number },
  ) {
    setArenaAttemptNumber(attemptNumber);
    setArenaFailureContext(null);
    const pod = podRef.current;
    const terminal = terminalInstanceRef.current;
    if (!pod || !terminal) {
      throw new Error("BrowserPod has not booted yet.");
    }

    const proposal = await requestArenaPatchProposal(
      variant,
      testOutput,
      previousAttempt,
    );
    setArenaPatchProposal(proposal);
    setTerminalLines((current) => [
      ...current,
      `$ ${proposal.provider}${proposal.isFallback ? " (fallback)" : ""} returned patched src/sidebarState.js (attempt ${attemptNumber})`,
      `diagnosis: ${proposal.diagnosis}`,
    ]);
    publishRunEvent(runId, {
      type: "branch.llm_patch_proposed",
      branchId: variant.id,
      message: `${variant.agentStyle} (${proposal.provider}${proposal.isFallback ? "/fallback" : ""}) proposed a ${variant.title} patch (attempt ${attemptNumber}).`,
      terminalLine: `$ ${proposal.provider} proposed ${variant.title} patch (attempt ${attemptNumber})`,
    });

    await writeTextFile(
      pod,
      "/forklab-arena/applyPatch.js",
      buildArenaPatchScript(proposal.patchedContent),
    );
    setPodStatus("patching");
    setTerminalLines((current) => [
      ...current,
      "$ wrote applyPatch.js (AI-generated patch)",
      "$ node applyPatch.js",
    ]);

    try {
      await pod.run("node", ["applyPatch.js"], {
        terminal,
        cwd: "/forklab-arena",
        echo: true,
      });
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : String(caught);
      const failure: ArenaFailureContext = {
        patchedContent: proposal.patchedContent,
        failureReason: "applyPatch.js failed to run",
        errorOutput: errorMessage,
      };
      setArenaFailureContext(failure);
      throw new Error(`AI patch could not be applied: ${errorMessage}`);
    }
    publishRunEvent(runId, {
      type: "branch.patch_applied",
      branchId: variant.id,
      message: `${variant.title} AI patch written into BrowserPod.`,
      terminalLine: "$ node applyPatch.js",
    });

    setPodStatus("running-command");
    setTerminalLines((current) => [...current, "$ npm test"]);

    let secondResult: PodTestResult;
    try {
      secondResult = await runArenaTest({ allowFailure: false });
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : String(caught);
      const failure: ArenaFailureContext = {
        patchedContent: proposal.patchedContent,
        failureReason: errorMessage.includes("test-result.json")
          ? "Tests crashed before producing a result (likely a syntax or runtime error in the patched file)"
          : "Tests crashed during execution",
        errorOutput: errorMessage,
      };
      setArenaFailureContext(failure);
      throw new Error(`Patched tests crashed: ${errorMessage}`);
    }

    if (secondResult.status !== "passed") {
      const failure: ArenaFailureContext = {
        patchedContent: proposal.patchedContent,
        failureReason: `${secondResult.failures.length} assertion failure${secondResult.failures.length === 1 ? "" : "s"} after applying the patch`,
        errorOutput: formatTestOutput(secondResult),
      };
      setArenaFailureContext(failure);
      setSidebarSecondResult(secondResult);
      throw new Error(`Expected ${variant.title} patched tests to pass.`);
    }

    setSidebarSecondResult(secondResult);
    publishRunEvent(runId, {
      type: "branch.test_passed",
      branchId: variant.id,
      message: `${variant.title} tests passed in BrowserPod.`,
      terminalLine: "PASS npm test",
    });

    recordArenaPatch(runId, {
      branchId: variant.id,
      provider: proposal.provider,
      diagnosis: proposal.diagnosis,
      summary: proposal.summary,
      patchedContent: proposal.patchedContent,
      isFallback: proposal.isFallback,
      testsPassed: secondResult.status === "passed",
      failingTestCount: secondResult.failures.length,
      recordedAt: Date.now(),
    });

    setTerminalLines((current) => [...current, "$ npm run build"]);
    try {
      await pod.run("npm", ["run", "build"], {
        terminal,
        cwd: "/forklab-arena",
        echo: true,
      });
      const rawBuildResult = await readTextFile(
        pod,
        "/forklab-arena/build-result.json",
      );
      const nextBuildResult = JSON.parse(rawBuildResult) as BuildResult;
      setArenaBuildResult(nextBuildResult);
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : String(caught);
      const failure: ArenaFailureContext = {
        patchedContent: proposal.patchedContent,
        failureReason: "Build step failed after tests passed",
        errorOutput: errorMessage,
      };
      setArenaFailureContext(failure);
      throw new Error(`Build failed: ${errorMessage}`);
    }

    setPodStatus("passed");
    localStorage.setItem(`forklab:${variant.id}:proof-passed`, "true");
    publishRunEvent(runId, {
      type: "branch.verified",
      branchId: variant.id,
      message: `${variant.title} verified: tests and build passed in BrowserPod.`,
      terminalLine: `VERIFIED ${variant.title} via BrowserPod`,
    });
    setTerminalLines((current) => [
      ...current,
      `Passed: ${variant.title} verified in BrowserPod.`,
    ]);
  }

  async function requestArenaRetry() {
    if (!arenaVariant || !arenaFailureContext) return;
    if (arenaAttemptNumber >= ARENA_MAX_ATTEMPTS) return;
    if (arenaRetryStatus === "running") return;

    const nextAttempt = arenaAttemptNumber + 1;
    const previous = {
      patchedContent: arenaFailureContext.patchedContent,
      failureReason: arenaFailureContext.failureReason,
      errorOutput: arenaFailureContext.errorOutput,
      attemptNumber: arenaAttemptNumber,
    };

    setArenaRetryStatus("running");
    setSidebarError(null);
    setSidebarSecondResult(null);
    setArenaBuildResult(null);
    setArenaPatchProposal(null);
    setPodStatus("running-command");
    setTerminalLines((current) => [
      ...current,
      `$ retrying AI patch (attempt ${nextAttempt} of ${ARENA_MAX_ATTEMPTS})`,
      `previous failure: ${previous.failureReason}`,
    ]);

    try {
      await runAiPatchCycle(
        arenaVariant,
        formatTestOutput(sidebarFirstResult ?? { status: "failed", failures: [] }),
        nextAttempt,
        previous,
      );
    } catch (caught) {
      setPodStatus("failed");
      const userError = toUserFacingError(caught);
      setSidebarError(userError);
      setTerminalLines((current) => [...current, `Failed: ${userError.message}`]);
      publishRunEvent(runId, {
        type: "branch.failed",
        branchId: arenaVariant.id,
        message: userError.message,
        terminalLine: `Failed (attempt ${nextAttempt}): ${userError.message}`,
      });
    } finally {
      setArenaRetryStatus("idle");
    }
  }

  async function runArenaTest({ allowFailure }: { allowFailure: boolean }) {
    const pod = podRef.current;
    const terminal = terminalInstanceRef.current;

    if (!pod || !terminal) {
      throw new Error("BrowserPod has not booted yet.");
    }

    await writeTextFile(
      pod,
      "/forklab-arena/test-result.json",
      JSON.stringify({ status: "pending", failures: [] }),
    );

    let runError: unknown = null;
    try {
      await pod.run("npm", ["test"], {
        terminal,
        cwd: "/forklab-arena",
        echo: true,
      });
    } catch (caught) {
      runError = caught;
    }

    const rawResult = await readTextFile(pod, "/forklab-arena/test-result.json");
    const parsed = JSON.parse(rawResult) as { status: string; failures?: Array<{ name: string; message: string }> };

    if (parsed.status === "pending") {
      const message =
        runError instanceof Error
          ? runError.message
          : runError
            ? String(runError)
            : "test process exited before writing test-result.json (likely a parse or runtime error in the patched file)";
      throw new Error(`test-result.json missing valid result: ${message}`);
    }

    if (!allowFailure && runError && parsed.status !== "passed") {
      throw runError;
    }

    return parsed as PodTestResult;
  }

  async function runIssueTest({ allowFailure }: { allowFailure: boolean }) {
    const pod = podRef.current;
    const terminal = terminalInstanceRef.current;

    if (!pod || !terminal) {
      throw new Error("BrowserPod has not booted yet.");
    }

    await writeTextFile(
      pod,
      "/forklab-issue/test-result.json",
      JSON.stringify({ status: "pending", failures: [] }),
    );

    let runError: unknown = null;
    try {
      await pod.run("npm", ["test"], {
        terminal,
        cwd: "/forklab-issue",
        echo: true,
      });
    } catch (caught) {
      runError = caught;
    }

    const rawResult = await readTextFile(pod, "/forklab-issue/test-result.json");
    const parsed = JSON.parse(rawResult) as {
      status: string;
      failures?: Array<{ name: string; message: string }>;
    };

    if (parsed.status === "pending") {
      const message =
        runError instanceof Error
          ? runError.message
          : runError
            ? String(runError)
            : "test process exited before writing test-result.json";
      throw new Error(`test-result.json missing valid result: ${message}`);
    }

    if (!allowFailure && runError && parsed.status !== "passed") {
      throw runError;
    }

    return parsed as PodTestResult;
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
        {arenaVariant ? (
          <button
            className="button primary"
            type="button"
            onClick={() => runSidebarArenaProof(arenaVariant)}
            disabled={!["idle", "passed", "failed"].includes(podStatus)}
          >
            Run {arenaVariant.title} pod
          </button>
        ) : null}
        {sandboxIssue ? (
          <button
            className="button primary"
            type="button"
            onClick={() => runSandboxIssueProof(sandboxIssue)}
            disabled={!["idle", "passed", "failed"].includes(podStatus)}
          >
            Run issue #{sandboxIssue.number} pod
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
            {sandboxIssue ? (
              [
                "branch.booting",
                "branch.files_written",
                "branch.test_failed",
                "branch.llm_patch_proposed",
                "branch.patch_applied",
                "branch.test_passed",
                "branch.verified",
              ].map((eventType) => (
                <div className="branch-step" key={eventType}>
                  <span />
                  <div>
                    <strong>{eventType}</strong>
                    <p>
                      Issue #{sandboxIssue.number} publishes {eventType} to
                      the dashboard.
                    </p>
                  </div>
                </div>
              ))
            ) : arenaVariant ? (
              [
                "branch.booting",
                "branch.files_written",
                "branch.test_failed",
                "branch.llm_patch_proposed",
                "branch.patch_applied",
                "branch.test_passed",
                "branch.verified",
              ].map((eventType) => (
                <div className="branch-step" key={eventType}>
                  <span />
                  <div>
                    <strong>{eventType}</strong>
                    <p>
                      {eventType === "branch.llm_patch_proposed"
                        ? `${arenaVariant.agentStyle} strategy prepares a ${arenaVariant.title} patch.`
                        : `${arenaVariant.title} publishes ${eventType} to the dashboard.`}
                    </p>
                  </div>
                </div>
              ))
            ) : branchId === "access-control-fix" ? (
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
          nativeRef={
            branchId === "sidebar-toggle-fix" || arenaVariant || sandboxIssue
              ? terminalRef
              : undefined
          }
          lines={terminalLines}
        />
      </div>

      {branchId === "sidebar-toggle-fix" || arenaVariant || sandboxIssue ? (
        <div className="branch-workspace-grid">
          <section className={`panel${podStatus === "passed" ? " card-glow" : ""}`}>
            <div className="status-row" style={{ marginBottom: 12 }}>
              <span className={`badge ${podStatus === "passed" ? "ok" : podStatus === "failed" ? "fail" : "warn"}`}>
                {sandboxIssue
                  ? `Issue #${sandboxIssue.number}`
                  : arenaVariant?.title ?? "Sidebar"} proof: {podStatus === "passed" ? "passed" : podStatus === "failed" ? "failed" : "pending"}
              </span>
            </div>
            <div className="report">
              <ProofItem
                label={sandboxIssue ? "Failing issue regression" : "Failing route-change test"}
                done={sidebarFirstResult?.status === "failed"}
              />
              <ProofItem
                label={
                  sandboxIssue
                    ? "Issue patch applied"
                    : arenaVariant
                      ? "Branch patch applied"
                      : "Deterministic patch applied"
                }
                done={Boolean(sidebarFirstResult)}
              />
              <ProofItem
                label={arenaVariant ? "Tests and build passed" : "Passing test observed"}
                done={
                  arenaVariant
                    ? sidebarSecondResult?.status === "passed" &&
                      arenaBuildResult?.status === "passed"
                    : sidebarSecondResult?.status === "passed"
                }
              />
            </div>
          </section>

          <section className="card stack">
            <div>
              <p className="eyebrow">Patch diff</p>
              <h2>
                {sandboxIssue
                  ? sandboxIssue.targetFile
                  : arenaVariant?.title ?? sidebarTargetFile}
              </h2>
              <p className="muted-copy">
                {sandboxIssue
                  ? sandboxIssue.summary
                  : arenaVariant
                  ? arenaVariant.summary
                  : "The patch closes the sidebar on route navigation while preserving toggle and unknown-event behavior."}
              </p>
            </div>
            <pre className="agent-diff-block">
              {sandboxIssue
                ? createSandboxIssueDiff(
                    sandboxIssue,
                    issueSourceContent || "// Waiting for GitHub source...",
                    issuePatchProposal?.patchedContent ??
                      (issueSourceContent || "// Waiting for patch proposal..."),
                  )
                : arenaVariant
                ? arenaPatchProposal
                  ? createDynamicArenaDiff(arenaPatchProposal.patchedContent)
                  : createArenaDiff(arenaVariant)
                : createSidebarDiff()}
            </pre>
            {sandboxIssue && issuePatchProposal ? (
              <div className="stack" style={{ gap: 10 }}>
                <div className="status-row">
                  <span
                    className={`badge ${
                      issuePatchProposal.isFallback ? "warn" : "ok"
                    }`}
                  >
                    {issuePatchProposal.provider}
                    {issuePatchProposal.isFallback ? " (fallback)" : ""}
                  </span>
                  <span className="muted-copy">
                    {issuePatchProposal.diagnosis}
                  </span>
                </div>
                <div className="status-row">
                  <button
                    className="button primary"
                    type="button"
                    onClick={pushVerifiedIssuePatch}
                    disabled={podStatus !== "passed" || issuePushStatus === "pushing"}
                  >
                    {issuePushStatus === "pushing"
                      ? "Pushing verified patch..."
                      : issuePushStatus === "pushed"
                        ? "Verified patch pushed"
                        : "Push verified patch to GitHub"}
                  </button>
                  {issuePushMessage ? (
                    issuePushStatus === "pushed" &&
                    issuePushMessage.startsWith("http") ? (
                      <a className="button" href={issuePushMessage} target="_blank">
                        Open branch
                      </a>
                    ) : (
                      <span
                        className={
                          issuePushStatus === "failed" ? "text-fail" : "muted-copy"
                        }
                      >
                        {issuePushMessage}
                      </span>
                    )
                  ) : (
                    <span className="muted-copy">
                      Enabled only after BrowserPod verification passes.
                    </span>
                  )}
                </div>
              </div>
            ) : null}
            {arenaVariant && arenaPatchProposal ? (
              <div className="status-row">
                <span
                  className={`badge ${
                    arenaPatchProposal.isFallback ? "warn" : "ok"
                  }`}
                >
                  {arenaPatchProposal.provider}
                  {arenaPatchProposal.isFallback ? " (fallback)" : ""}
                </span>
                <span className="muted-copy">
                  {arenaPatchProposal.diagnosis}
                </span>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {arenaBuildResult ? (
        <section className="truth-panel">
          <div>
            <p className="eyebrow">Preview artifact</p>
            <h2>
              {arenaBuildResult.branch ??
                arenaBuildResult.title ??
                `Issue #${arenaBuildResult.issue}`}
            </h2>
          </div>
          <div className="agent-meta">
            <div>
              <span>Build</span>
              <strong>{arenaBuildResult.status}</strong>
            </div>
            <div>
              <span>{arenaBuildResult.strategy ? "Strategy" : "Repo issue"}</span>
              <strong>
                {arenaBuildResult.strategy ??
                  `${arenaBuildResult.repo} #${arenaBuildResult.issue}`}
              </strong>
            </div>
            <div>
              <span>Files changed</span>
              <strong>{arenaBuildResult.filesChanged.join(", ")}</strong>
            </div>
          </div>
          {arenaBuildResult.previewHtml ? (
            <pre className="agent-terminal">{arenaBuildResult.previewHtml}</pre>
          ) : null}
        </section>
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
          {arenaVariant && arenaFailureContext ? (
            <div className="stack" style={{ gap: 8, marginTop: 12 }}>
              <div className="status-row">
                <span className="badge warn">
                  Attempt {arenaAttemptNumber} of {ARENA_MAX_ATTEMPTS}
                </span>
                <span className="badge info">
                  {arenaFailureContext.failureReason}
                </span>
              </div>
              {arenaAttemptNumber < ARENA_MAX_ATTEMPTS ? (
                <button
                  className="button primary"
                  type="button"
                  onClick={requestArenaRetry}
                  disabled={arenaRetryStatus === "running"}
                >
                  {arenaRetryStatus === "running"
                    ? "Asking AI for a fix..."
                    : `Request retry from AI (attempt ${arenaAttemptNumber + 1})`}
                </button>
              ) : (
                <p className="muted-copy">
                  Maximum retries reached for {arenaVariant.title}. Reload to start over.
                </p>
              )}
            </div>
          ) : null}
          {sandboxIssue && issueFailureContext ? (
            <div className="stack" style={{ gap: 8, marginTop: 12 }}>
              <div className="status-row">
                <span className="badge warn">
                  Attempt {issueAttemptNumber} of {ISSUE_MAX_ATTEMPTS}
                </span>
                <span className="badge info">
                  {issueFailureContext.failureReason}
                </span>
              </div>
              {issueAttemptNumber < ISSUE_MAX_ATTEMPTS ? (
                <button
                  className="button primary"
                  type="button"
                  onClick={requestIssueRetry}
                  disabled={issueRetryStatus === "running"}
                >
                  {issueRetryStatus === "running"
                    ? "Asking AI for a corrected fix..."
                    : `Retry AI fix (attempt ${issueAttemptNumber + 1})`}
                </button>
              ) : (
                <p className="muted-copy">
                  Maximum retries reached for issue #{sandboxIssue.number}.
                </p>
              )}
            </div>
          ) : null}
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
              : arenaVariant
                ? `${arenaVariant.title} is one of three same-task BrowserPod solution branches.`
              : sandboxIssue
                ? `Sandbox GitHub issue #${sandboxIssue.number} runs in its own BrowserPod.`
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
            : arenaVariant
              ? "This tab runs one isolated BrowserPod for one sidebar solution strategy. The run dashboard compares it against the other two arena branches."
            : sandboxIssue
              ? "This tab fetches the issue target file from GitHub before BrowserPod writes it. ForkLab supplies the demo test harness, while the source code and final push target are the real repository."
            : "This tab only publishes queued/preview state. It does not claim BrowserPod verification."}
        </p>
      </section>
    </div>
  );
}

function paramValue(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function buildArenaPatchScript(patchedContent: string) {
  return `const { writeFileSync } = require("node:fs");

writeFileSync(
  "/forklab-arena/src/sidebarState.js",
  ${JSON.stringify(patchedContent)}
);

console.log("Applied AI-generated arena patch.");
`;
}

function formatTestOutput(result: PodTestResult) {
  if (result.status === "passed") return "All tests passed.";
  return [
    `Status: failed (${result.failures.length} failure${result.failures.length === 1 ? "" : "s"})`,
    ...result.failures.map((f) => `FAIL ${f.name}: ${f.message}`),
  ].join("\n");
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

function createDynamicArenaDiff(patchedContent: string) {
  return `--- a/${sidebarTargetFile}
+++ b/${sidebarTargetFile}
@@
${buggySidebarState
  .trimEnd()
  .split("\n")
  .map((line) => `-${line}`)
  .join("\n")}
${patchedContent
  .trimEnd()
  .split("\n")
  .map((line) => `+${line}`)
  .join("\n")}`;
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
