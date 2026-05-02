"use client";

export type BranchId =
  | "csv-export-fix"
  | "email-validation-fix"
  | "sidebar-toggle-fix";

export type RunEventType =
  | "run.created"
  | "branch.opened"
  | "branch.booting"
  | "branch.files_written"
  | "branch.test_failed"
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

export type RunSnapshot = {
  runId: string;
  prompt: string;
  createdAt: number;
  updatedAt: number;
  branches: BranchSnapshot[];
  events: RunEventMessage[];
  tabsBlocked?: boolean;
};

const storagePrefix = "forklab:run:";

export function createRunId() {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBranchList(): BranchDefinition[] {
  return [
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
        "Queued workspace for mobile navigation state repair. Planned, not verified.",
      risk: "Unknown",
      mode: "queued",
    },
  ];
}

export function createRunSnapshot({
  runId,
  prompt,
  tabsBlocked,
}: {
  runId: string;
  prompt: string;
  tabsBlocked?: boolean;
}): RunSnapshot {
  const now = Date.now();

  return {
    runId,
    prompt,
    createdAt: now,
    updatedAt: now,
    branches: createBranchList().map((branch) => ({
      ...branch,
      status: branch.id === "csv-export-fix" ? "Ready" : "Queued",
      progress: branch.id === "csv-export-fix" ? 8 : 4,
      detail:
        branch.id === "csv-export-fix"
          ? "Ready to open the live proof path."
          : "Waiting for the next real BrowserPod branch.",
      terminal: [
        branch.id === "csv-export-fix"
          ? "$ waiting for CSV BrowserPod proof"
          : "$ queued for next BrowserPod branch",
      ],
      updatedAt: now,
    })),
    events: [],
    tabsBlocked,
  };
}

export function publishRunEvent(runId: string, event: RunEvent) {
  const stampedEvent = normalizeEvent(event);
  const snapshot = applyRunEvent(
    loadRunSnapshot(runId) ??
      createRunSnapshot({
        runId,
        prompt: "Fix the CSV export bug and compare queued branches.",
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
    callback(normalizeEvent(message.data as RunEvent));
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
    "branch.patch_applied": Math.max(branch.progress, 78),
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
