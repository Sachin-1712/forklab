"use client";

import {
  isSandboxIssueBranch,
  sandboxIssueNumberFromBranchId,
} from "./sandboxIssues";
import type { SandboxIssueId } from "./sandboxIssues";

export type BranchId =
  | "access-control-fix"
  | "csv-export-fix"
  | "email-validation-fix"
  | "sidebar-toggle-fix"
  | "sidebar-minimal-fix"
  | "sidebar-robust-fix"
  | "sidebar-ux-polish"
  | SandboxIssueId;

export type RunEventType =
  | "run.created"
  | "branch.opened"
  | "branch.booting"
  | "branch.files_written"
  | "branch.test_failed"
  | "branch.llm_patch_proposed"
  | "branch.awaiting_human_approval"
  | "branch.human_approved"
  | "branch.patch_applied"
  | "branch.test_passed"
  | "branch.verified"
  | "branch.queued"
  | "branch.failed"
  | "run.completed";

export type BranchDefinition = {
  id: BranchId;
  title: string;
  description: string;
  risk: "Low" | "Medium" | "Unknown";
  mode: "live" | "preview" | "queued";
};

export type BranchSnapshot = BranchDefinition & {
  status: string;
  progress: number;
  lastEvent?: RunEventType;
  detail: string;
  terminal: string[];
  updatedAt: number;
};

export type RunEvent = {
  type: RunEventType;
  branchId?: BranchId;
  message?: string;
  terminalLine?: string;
  createdAt?: number;
};

export type RunEventMessage = RunEvent & {
  createdAt: number;
};

export type ArenaPatchRecord = {
  branchId: BranchId;
  provider: "gemini" | "groq" | "fallback";
  diagnosis: string;
  summary: string;
  patchedContent: string;
  isFallback: boolean;
  testsPassed: boolean;
  failingTestCount: number;
  recordedAt: number;
};

export type ArenaJudgeBranch = {
  branchId: BranchId;
  score: {
    correctness: number;
    maintainability: number;
    risk: number;
    ux: number;
    overall: number;
  };
  reasoning: string;
};

export type ArenaJudgeRecord = {
  provider: "gemini" | "groq" | "fallback";
  winnerBranchId: BranchId;
  winnerReason: string;
  branches: ArenaJudgeBranch[];
  isFallback: boolean;
  recordedAt: number;
};

export type RunSnapshot = {
  runId: string;
  prompt: string;
  mode?: "standard" | "sidebar-arena" | "sandbox-issues";
  winnerBranchId?: BranchId;
  repoFullName?: string;
  createdAt: number;
  updatedAt: number;
  branches: BranchSnapshot[];
  events: RunEventMessage[];
  tabsBlocked?: boolean;
  arenaPatches?: ArenaPatchRecord[];
  arenaJudge?: ArenaJudgeRecord;
};

const storagePrefix = "forklab:run:";

export function createRunId() {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBranchList(): BranchDefinition[] {
  return [
    {
      id: "access-control-fix",
      title: "Access-Control Fix",
      description:
        "Live SEC-101 branch for the tenant invoice access-control bug. Verification runs through /workbench.",
      risk: "Low",
      mode: "live",
    },
    {
      id: "csv-export-fix",
      title: "CSV Export Fix",
      description:
        "Live branch path for the known CSV filename bug. The real proof remains in /sprint.",
      risk: "Low",
      mode: "live",
    },
    {
      id: "email-validation-fix",
      title: "Email Validation Fix",
      description:
        "Prepared workspace for the next BrowserPod branch. It does not claim verification yet.",
      risk: "Unknown",
      mode: "preview",
    },
    {
      id: "sidebar-toggle-fix",
      title: "Sidebar Toggle Fix",
      description:
        "Live BrowserPod branch for mobile route-change sidebar state repair.",
      risk: "Low",
      mode: "live",
    },
  ];
}

export function createSidebarArenaBranchList(): BranchDefinition[] {
  return [
    {
      id: "sidebar-minimal-fix",
      title: "Minimal Fix",
      description:
        "Conservative solution branch for the sidebar route-change bug.",
      risk: "Low",
      mode: "live",
    },
    {
      id: "sidebar-robust-fix",
      title: "Robust Fix",
      description:
        "Test-first solution branch with defensive reducer coverage.",
      risk: "Low",
      mode: "live",
    },
    {
      id: "sidebar-ux-polish",
      title: "UX Polish",
      description:
        "Product-minded solution branch that adds route-close UX metadata.",
      risk: "Medium",
      mode: "live",
    },
  ];
}

export function createRunSnapshot({
  runId,
  prompt,
  branches = createBranchList(),
  mode = "standard",
  winnerBranchId,
  repoFullName,
  tabsBlocked,
}: {
  runId: string;
  prompt: string;
  branches?: BranchDefinition[];
  mode?: RunSnapshot["mode"];
  winnerBranchId?: BranchId;
  repoFullName?: string;
  tabsBlocked?: boolean;
}): RunSnapshot {
  const now = Date.now();

  return {
    runId,
    prompt,
    mode,
    winnerBranchId,
    repoFullName,
    createdAt: now,
    updatedAt: now,
    branches: branches.map((branch) => ({
      ...branch,
      status:
        branch.mode === "live"
          ? "Ready"
          : "Queued",
      progress:
        branch.mode === "live"
          ? 8
          : 4,
      detail:
        branch.id === "access-control-fix"
          ? "Ready to launch the live SEC-101 workbench proof."
          : branch.id === "csv-export-fix"
            ? "Ready to open the live CSV proof path."
          : branch.id === "sidebar-toggle-fix"
            ? "Ready to run the live sidebar BrowserPod proof."
          : isSidebarArenaBranchId(branch.id)
            ? "Ready to launch an isolated BrowserPod solution branch."
          : isSandboxIssueBranch(branch.id)
            ? `Ready to run sandbox issue #${sandboxIssueNumberFromBranchId(branch.id) ?? "?"}.`
          : "Waiting for the next real BrowserPod branch.",
      terminal: [
        branch.id === "access-control-fix"
          ? "$ waiting for SEC-101 BrowserPod proof"
          : branch.id === "csv-export-fix"
            ? "$ waiting for CSV BrowserPod proof"
          : branch.id === "sidebar-toggle-fix"
            ? "$ waiting for Sidebar BrowserPod proof"
          : isSidebarArenaBranchId(branch.id)
            ? `$ waiting for ${branch.title} BrowserPod`
          : isSandboxIssueBranch(branch.id)
            ? `$ waiting for issue #${sandboxIssueNumberFromBranchId(branch.id) ?? "?"} BrowserPod`
          : "$ queued for next BrowserPod branch",
      ],
      updatedAt: now,
    })),
    events: [],
    tabsBlocked,
  };
}

export function recordArenaPatch(runId: string, record: ArenaPatchRecord) {
  const snapshot =
    loadRunSnapshot(runId) ??
    createRunSnapshot({
      runId,
      prompt: "Fix the sidebar toggle bug with three solution branches.",
      branches: createSidebarArenaBranchList(),
      mode: "sidebar-arena",
    });

  const filtered = (snapshot.arenaPatches ?? []).filter(
    (entry) => entry.branchId !== record.branchId,
  );
  const next: RunSnapshot = {
    ...snapshot,
    arenaPatches: [...filtered, record],
    updatedAt: record.recordedAt,
  };
  saveRunSnapshot(runId, next);

  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    const channel = new BroadcastChannel(channelName(runId));
    channel.postMessage({ __forklab: "arena-patch", payload: record });
    channel.close();
  }
}

export function recordArenaJudge(runId: string, record: ArenaJudgeRecord) {
  const snapshot = loadRunSnapshot(runId);
  if (!snapshot) return;

  const next: RunSnapshot = {
    ...snapshot,
    arenaJudge: record,
    winnerBranchId: record.winnerBranchId,
    updatedAt: record.recordedAt,
  };
  saveRunSnapshot(runId, next);

  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    const channel = new BroadcastChannel(channelName(runId));
    channel.postMessage({ __forklab: "arena-judge", payload: record });
    channel.close();
  }
}

export function subscribeToArenaUpdates(
  runId: string,
  onPatch: (patch: ArenaPatchRecord) => void,
  onJudge: (judge: ArenaJudgeRecord) => void,
) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return () => {};
  }
  const channel = new BroadcastChannel(channelName(runId));
  channel.onmessage = (message) => {
    const data = message.data as
      | { __forklab?: "arena-patch"; payload?: ArenaPatchRecord }
      | { __forklab?: "arena-judge"; payload?: ArenaJudgeRecord }
      | RunEvent;
    if (data && (data as { __forklab?: string }).__forklab === "arena-patch") {
      onPatch((data as { payload: ArenaPatchRecord }).payload);
    } else if (
      data &&
      (data as { __forklab?: string }).__forklab === "arena-judge"
    ) {
      onJudge((data as { payload: ArenaJudgeRecord }).payload);
    }
  };
  return () => channel.close();
}

export function publishRunEvent(runId: string, event: RunEvent) {
  const stampedEvent = normalizeEvent(event);
  const snapshot = applyRunEvent(
    loadRunSnapshot(runId) ??
      createRunSnapshot({
        runId,
        prompt: "Fix the sidebar toggle bug with three solution branches.",
        branches: createSidebarArenaBranchList(),
        mode: "sidebar-arena",
        winnerBranchId: "sidebar-robust-fix",
      }),
    stampedEvent,
  );

  saveRunSnapshot(runId, snapshot);

  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    const channel = new BroadcastChannel(channelName(runId));
    channel.postMessage(stampedEvent);
    channel.close();
  }
}

export function subscribeToRunEvents(
  runId: string,
  callback: (event: RunEventMessage) => void,
) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return () => {};
  }

  const channel = new BroadcastChannel(channelName(runId));

  channel.onmessage = (message) => {
    const data = message.data as RunEvent & { __forklab?: string };
    if (data && data.__forklab) return;
    callback(normalizeEvent(data as RunEvent));
  };

  return () => channel.close();
}

export function saveRunSnapshot(runId: string, snapshot: RunSnapshot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(runId), JSON.stringify(snapshot));
}

export function loadRunSnapshot(runId: string) {
  if (typeof window === "undefined") return null;

  try {
    const rawSnapshot = localStorage.getItem(storageKey(runId));
    return rawSnapshot ? (JSON.parse(rawSnapshot) as RunSnapshot) : null;
  } catch {
    return null;
  }
}

export function applyRunEvent(snapshot: RunSnapshot, event: RunEventMessage) {
  const nextSnapshot: RunSnapshot = {
    ...snapshot,
    updatedAt: event.createdAt,
    events: [...snapshot.events, event].slice(-80),
  };

  if (event.type === "run.completed") {
    return nextSnapshot;
  }

  if (!event.branchId) return nextSnapshot;

  nextSnapshot.branches = snapshot.branches.map((branch) =>
    branch.id === event.branchId ? updateBranch(branch, event) : branch,
  );

  return nextSnapshot;
}

export function branchPath(runId: string, branchId: BranchId) {
  return `/branch/${encodeURIComponent(runId)}/${branchId}`;
}

export function runPath(runId: string) {
  return `/runs/${encodeURIComponent(runId)}`;
}

function updateBranch(branch: BranchSnapshot, event: RunEventMessage) {
  const progressByEvent: Partial<Record<RunEventType, number>> = {
    "branch.opened": Math.max(branch.progress, 16),
    "branch.booting": Math.max(branch.progress, 30),
    "branch.files_written": Math.max(branch.progress, 48),
    "branch.test_failed": Math.max(branch.progress, 64),
    "branch.llm_patch_proposed": Math.max(branch.progress, 70),
    "branch.awaiting_human_approval": Math.max(branch.progress, 74),
    "branch.human_approved": Math.max(branch.progress, 78),
    "branch.patch_applied": Math.max(branch.progress, 84),
    "branch.test_passed": Math.max(branch.progress, 92),
    "branch.verified": 100,
    "branch.queued": Math.max(branch.progress, 10),
    "branch.failed": 100,
  };

  return {
    ...branch,
    status: statusForEvent(event.type),
    progress: progressByEvent[event.type] ?? branch.progress,
    lastEvent: event.type,
    detail: event.message || branch.detail,
    terminal: event.terminalLine
      ? [...branch.terminal, event.terminalLine].slice(-10)
      : branch.terminal,
    updatedAt: event.createdAt,
  };
}

function statusForEvent(type: RunEventType) {
  if (type === "branch.verified") return "Live verified";
  if (type === "branch.failed") return "Failed";
  if (type === "branch.queued") return "Queued / next branch";
  if (type === "branch.test_passed") return "Tests passed";
  if (type === "branch.patch_applied") return "Patch applied";
  if (type === "branch.human_approved") return "Human approved";
  if (type === "branch.awaiting_human_approval") return "Awaiting approval";
  if (type === "branch.llm_patch_proposed") return "Patch proposed";
  if (type === "branch.test_failed") return "Failing test observed";
  if (type === "branch.files_written") return "Files written";
  if (type === "branch.booting") return "Booting sandbox";
  if (type === "branch.opened") return "Branch tab opened";
  return "Running";
}

function normalizeEvent(event: RunEvent): RunEventMessage {
  return {
    type: event.type,
    branchId: event.branchId,
    message: event.message ?? "",
    terminalLine: event.terminalLine ?? "",
    createdAt: event.createdAt ?? Date.now(),
  };
}

function channelName(runId: string) {
  return `forklab-run-${runId}`;
}

function storageKey(runId: string) {
  return `${storagePrefix}${runId}`;
}

function isSidebarArenaBranchId(branchId: BranchId) {
  return (
    branchId === "sidebar-minimal-fix" ||
    branchId === "sidebar-robust-fix" ||
    branchId === "sidebar-ux-polish"
  );
}
