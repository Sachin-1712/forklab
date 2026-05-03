import type { AgentProvider } from "./patchSchema";
import {
  buggySidebarState,
  fixedSidebarState,
  sidebarTargetFile,
  sidebarTestCommand,
} from "../sidebarBranch";

export type ArenaStrategyId =
  | "sidebar-minimal-fix"
  | "sidebar-robust-fix"
  | "sidebar-ux-polish";

export type ArenaStrategy = {
  id: ArenaStrategyId;
  title: string;
  agentStyle: string;
  systemDirective: string;
};

export const arenaStrategies: ArenaStrategy[] = [
  {
    id: "sidebar-minimal-fix",
    title: "Minimal Fix",
    agentStyle: "Conservative",
    systemDirective:
      "Make the SMALLEST possible change that closes the sidebar on ROUTE_CHANGE events. Do not add defensive defaults, do not add new state fields, do not refactor. One added branch in the reducer is the goal. Keep the existing function signature and module shape exactly as-is.",
  },
  {
    id: "sidebar-robust-fix",
    title: "Robust Fix",
    agentStyle: "Test-first",
    systemDirective:
      "Fix the ROUTE_CHANGE bug AND harden the reducer. Add default parameters so missing state defaults to { open: false } and missing event defaults to a NOOP. Keep behavior predictable. Do not add new state fields beyond what already exists.",
  },
  {
    id: "sidebar-ux-polish",
    title: "UX Polish",
    agentStyle: "Product-minded",
    systemDirective:
      "Fix the ROUTE_CHANGE bug AND enrich the state for UX. On TOGGLE include lastInteraction: 'toggle'. On ROUTE_CHANGE include lastInteraction: 'route-change' and announceNavigation: true. Preserve existing fields with spread.",
  },
];

export type ArenaPatchProposal = {
  provider: "gemini" | "groq" | "fallback";
  strategyId: ArenaStrategyId;
  diagnosis: string;
  targetFile: string;
  patchedContent: string;
  summary: string;
  isFallback: boolean;
};

export type ArenaPatchPreviousAttempt = {
  patchedContent: string;
  failureReason: string;
  errorOutput: string;
  attemptNumber: number;
};

export type ArenaPatchPlanInput = {
  strategyId: ArenaStrategyId;
  task: string;
  buggyContent: string;
  testOutput: string;
  provider: AgentProvider;
  previousAttempt?: ArenaPatchPreviousAttempt;
};

export const arenaPatchJsonSchema = {
  type: "object",
  properties: {
    provider: {
      type: "string",
      enum: ["gemini", "groq", "fallback"],
    },
    strategyId: {
      type: "string",
      enum: arenaStrategies.map((s) => s.id),
    },
    diagnosis: { type: "string" },
    targetFile: { type: "string" },
    patchedContent: { type: "string" },
    summary: { type: "string" },
    isFallback: { type: "boolean" },
  },
  required: [
    "provider",
    "strategyId",
    "diagnosis",
    "targetFile",
    "patchedContent",
    "summary",
    "isFallback",
  ],
  additionalProperties: false,
} as const;

export type ArenaScore = {
  correctness: number;
  maintainability: number;
  risk: number;
  ux: number;
  overall: number;
};

export type ArenaJudgeBranchResult = {
  strategyId: ArenaStrategyId;
  score: ArenaScore;
  reasoning: string;
};

export type ArenaJudgeVerdict = {
  provider: "gemini" | "groq" | "fallback";
  winnerStrategyId: ArenaStrategyId;
  winnerReason: string;
  branches: ArenaJudgeBranchResult[];
  isFallback: boolean;
};

export type ArenaJudgeInput = {
  task: string;
  buggyContent: string;
  proposals: Array<{
    strategyId: ArenaStrategyId;
    title: string;
    agentStyle: string;
    patchedContent: string;
    diagnosis: string;
    summary: string;
    testsPassed: boolean;
    failingTestCount: number;
  }>;
  provider: AgentProvider;
};

export const arenaJudgeJsonSchema = {
  type: "object",
  properties: {
    provider: { type: "string", enum: ["gemini", "groq", "fallback"] },
    winnerStrategyId: {
      type: "string",
      enum: arenaStrategies.map((s) => s.id),
    },
    winnerReason: { type: "string" },
    branches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          strategyId: {
            type: "string",
            enum: arenaStrategies.map((s) => s.id),
          },
          score: {
            type: "object",
            properties: {
              correctness: { type: "number" },
              maintainability: { type: "number" },
              risk: { type: "number" },
              ux: { type: "number" },
              overall: { type: "number" },
            },
            required: [
              "correctness",
              "maintainability",
              "risk",
              "ux",
              "overall",
            ],
            additionalProperties: false,
          },
          reasoning: { type: "string" },
        },
        required: ["strategyId", "score", "reasoning"],
        additionalProperties: false,
      },
    },
    isFallback: { type: "boolean" },
  },
  required: [
    "provider",
    "winnerStrategyId",
    "winnerReason",
    "branches",
    "isFallback",
  ],
  additionalProperties: false,
} as const;

export function getArenaStrategy(strategyId: ArenaStrategyId) {
  return arenaStrategies.find((s) => s.id === strategyId);
}

export function parseJsonish(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    return JSON.parse(fenced ? fenced[1] : trimmed) as unknown;
  }
  return value;
}

const shellNeedles = [
  "npm install",
  "pnpm ",
  "yarn ",
  "curl ",
  "wget ",
  "rm -",
  "child_process",
  "exec(",
  "spawn(",
  "#!/bin/",
];

export function validateArenaPatchProposal(
  value: unknown,
  expectedProvider?: "gemini" | "groq" | "fallback",
): ArenaPatchProposal {
  if (!value || typeof value !== "object") {
    throw new Error("Arena patch proposal must be an object.");
  }
  const c = value as Partial<ArenaPatchProposal>;

  if (
    c.provider !== "gemini" &&
    c.provider !== "groq" &&
    c.provider !== "fallback"
  ) {
    throw new Error("Arena patch provider is invalid.");
  }
  if (expectedProvider && c.provider !== expectedProvider) {
    throw new Error(`Arena patch provider must be ${expectedProvider}.`);
  }
  if (!c.strategyId || !arenaStrategies.some((s) => s.id === c.strategyId)) {
    throw new Error("Arena patch strategyId is invalid.");
  }
  if (typeof c.diagnosis !== "string" || !c.diagnosis.trim()) {
    throw new Error("Arena patch diagnosis is required.");
  }
  if (c.targetFile !== sidebarTargetFile) {
    throw new Error(`Arena patch target must be ${sidebarTargetFile}.`);
  }
  if (typeof c.patchedContent !== "string" || !c.patchedContent.trim()) {
    throw new Error("Arena patch content must be non-empty.");
  }
  if (!c.patchedContent.includes("reduceSidebarState")) {
    throw new Error("Arena patch must define reduceSidebarState.");
  }
  if (!c.patchedContent.includes("module.exports")) {
    throw new Error("Arena patch must keep module.exports = { reduceSidebarState }.");
  }
  if (shellNeedles.some((needle) => c.patchedContent!.includes(needle))) {
    throw new Error("Arena patch must not contain shell-like commands.");
  }
  const nonAsciiMatch = c.patchedContent.match(/[^\x09\x0A\x0D\x20-\x7E]/);
  if (nonAsciiMatch) {
    const codepoint = nonAsciiMatch[0].codePointAt(0)?.toString(16) ?? "?";
    throw new Error(
      `Arena patch contains non-ASCII character (U+${codepoint.toUpperCase().padStart(4, "0")}). Use plain ASCII only.`,
    );
  }
  if (typeof c.summary !== "string" || !c.summary.trim()) {
    throw new Error("Arena patch summary is required.");
  }
  if (typeof c.isFallback !== "boolean") {
    throw new Error("Arena patch isFallback flag is required.");
  }

  return c as ArenaPatchProposal;
}

export function validateArenaPatchPlanInput(
  value: unknown,
): ArenaPatchPlanInput {
  if (!value || typeof value !== "object") {
    throw new Error("Request body must be an object.");
  }
  const input = value as Partial<ArenaPatchPlanInput>;
  if (!input.strategyId || !arenaStrategies.some((s) => s.id === input.strategyId)) {
    throw new Error("strategyId must be a known arena strategy.");
  }
  if (typeof input.task !== "string" || !input.task.trim()) {
    throw new Error("task is required.");
  }
  if (typeof input.buggyContent !== "string" || !input.buggyContent.trim()) {
    throw new Error("buggyContent is required.");
  }
  if (typeof input.testOutput !== "string") {
    throw new Error("testOutput is required.");
  }
  if (
    input.provider !== "gemini" &&
    input.provider !== "groq" &&
    input.provider !== "auto" &&
    input.provider !== "fallback"
  ) {
    throw new Error("provider must be gemini, groq, auto, or fallback.");
  }
  if (input.previousAttempt !== undefined) {
    const prev = input.previousAttempt;
    if (
      !prev ||
      typeof prev.patchedContent !== "string" ||
      typeof prev.failureReason !== "string" ||
      typeof prev.errorOutput !== "string" ||
      typeof prev.attemptNumber !== "number"
    ) {
      throw new Error("previousAttempt fields are malformed.");
    }
  }
  return input as ArenaPatchPlanInput;
}

export function validateArenaJudgeInput(value: unknown): ArenaJudgeInput {
  if (!value || typeof value !== "object") {
    throw new Error("Request body must be an object.");
  }
  const input = value as Partial<ArenaJudgeInput>;
  if (typeof input.task !== "string" || !input.task.trim()) {
    throw new Error("task is required.");
  }
  if (typeof input.buggyContent !== "string" || !input.buggyContent.trim()) {
    throw new Error("buggyContent is required.");
  }
  if (!Array.isArray(input.proposals) || input.proposals.length === 0) {
    throw new Error("proposals must be a non-empty array.");
  }
  for (const proposal of input.proposals) {
    if (
      !proposal ||
      !arenaStrategies.some((s) => s.id === proposal.strategyId) ||
      typeof proposal.patchedContent !== "string"
    ) {
      throw new Error("Each proposal must include strategyId and patchedContent.");
    }
  }
  if (
    input.provider !== "gemini" &&
    input.provider !== "groq" &&
    input.provider !== "auto" &&
    input.provider !== "fallback"
  ) {
    throw new Error("provider must be gemini, groq, auto, or fallback.");
  }
  return input as ArenaJudgeInput;
}

export function validateArenaJudgeVerdict(
  value: unknown,
  expectedProvider?: "gemini" | "groq" | "fallback",
): ArenaJudgeVerdict {
  if (!value || typeof value !== "object") {
    throw new Error("Judge verdict must be an object.");
  }
  const v = value as Partial<ArenaJudgeVerdict>;
  if (
    v.provider !== "gemini" &&
    v.provider !== "groq" &&
    v.provider !== "fallback"
  ) {
    throw new Error("Judge verdict provider is invalid.");
  }
  if (expectedProvider && v.provider !== expectedProvider) {
    throw new Error(`Judge verdict provider must be ${expectedProvider}.`);
  }
  if (
    !v.winnerStrategyId ||
    !arenaStrategies.some((s) => s.id === v.winnerStrategyId)
  ) {
    throw new Error("Judge winnerStrategyId is invalid.");
  }
  if (typeof v.winnerReason !== "string" || !v.winnerReason.trim()) {
    throw new Error("Judge winnerReason is required.");
  }
  if (!Array.isArray(v.branches) || v.branches.length === 0) {
    throw new Error("Judge branches must be a non-empty array.");
  }
  for (const branch of v.branches) {
    if (
      !branch ||
      !arenaStrategies.some((s) => s.id === branch.strategyId) ||
      typeof branch.reasoning !== "string" ||
      !branch.score ||
      typeof branch.score.correctness !== "number" ||
      typeof branch.score.maintainability !== "number" ||
      typeof branch.score.risk !== "number" ||
      typeof branch.score.ux !== "number" ||
      typeof branch.score.overall !== "number"
    ) {
      throw new Error("Judge branch entry is malformed.");
    }
  }
  if (typeof v.isFallback !== "boolean") {
    throw new Error("Judge isFallback flag is required.");
  }
  return v as ArenaJudgeVerdict;
}

// On the first fallback attempt the patch is intentionally broken so the
// retry flow can be demoed. On attempt 2+ the real fix is returned.
const brokenFallbackPatch = `function reduceSidebarState(state, event) {
  if (event.type === "TOGGLE") return { ...state, open: !state.open };
  if (event.type === "ROUTE_CHANGE") return { ...state, open: true };
  return state;
}

module.exports = { reduceSidebarState };
`;

export function createArenaFallbackPatch(
  strategyId: ArenaStrategyId,
  attemptNumber = 1,
): ArenaPatchProposal {
  const strategy = getArenaStrategy(strategyId)!;
  const isFirstAttempt = attemptNumber <= 1;
  const patchedContent = isFirstAttempt
    ? brokenFallbackPatch
    : fallbackPatchedContent(strategyId);

  return {
    provider: "fallback",
    strategyId,
    diagnosis: isFirstAttempt
      ? "Attempted to close sidebar on ROUTE_CHANGE but used the wrong boolean value."
      : "The reducer never handles ROUTE_CHANGE events, so navigating leaves the drawer open.",
    targetFile: sidebarTargetFile,
    patchedContent,
    summary: isFirstAttempt
      ? `${strategy.title} (fallback attempt 1 — broken, will need retry).`
      : `${strategy.title} (deterministic fallback): ${strategy.agentStyle.toLowerCase()} sidebar reducer.`,
    isFallback: true,
  };
}

function fallbackPatchedContent(strategyId: ArenaStrategyId) {
  if (strategyId === "sidebar-minimal-fix") return fixedSidebarState;
  if (strategyId === "sidebar-robust-fix") {
    return `const defaultState = { open: false };

function reduceSidebarState(state = defaultState, event = { type: "NOOP" }) {
  if (event.type === "TOGGLE") return { ...state, open: !state.open };
  if (event.type === "ROUTE_CHANGE") return { ...state, open: false };
  return state;
}

module.exports = { reduceSidebarState };
`;
  }
  return `function reduceSidebarState(state, event) {
  if (event.type === "TOGGLE") {
    return { ...state, open: !state.open, lastInteraction: "toggle" };
  }

  if (event.type === "ROUTE_CHANGE") {
    return {
      ...state,
      open: false,
      lastInteraction: "route-change",
      announceNavigation: true,
    };
  }

  return state;
}

module.exports = { reduceSidebarState };
`;
}

export function createArenaFallbackVerdict(
  proposals: ArenaJudgeInput["proposals"],
): ArenaJudgeVerdict {
  const branches: ArenaJudgeBranchResult[] = proposals.map((p) => {
    const passed = p.testsPassed ? 95 : 60;
    const baselineUx = p.strategyId === "sidebar-ux-polish" ? 95 : 80;
    const maintain = p.strategyId === "sidebar-minimal-fix" ? 90 : 84;
    const risk = p.strategyId === "sidebar-minimal-fix" ? 95 : 85;
    const overall = Math.round((passed + maintain + risk + baselineUx) / 4);
    return {
      strategyId: p.strategyId,
      score: {
        correctness: passed,
        maintainability: maintain,
        risk,
        ux: baselineUx,
        overall,
      },
      reasoning: `Fallback heuristic: tests ${p.testsPassed ? "passed" : "failed"}; ${p.title} chosen for ${p.agentStyle.toLowerCase()} approach.`,
    };
  });

  const winner = branches.slice().sort((a, b) => b.score.overall - a.score.overall)[0];

  return {
    provider: "fallback",
    winnerStrategyId: winner.strategyId,
    winnerReason: `Fallback judge: ${winner.strategyId} has the highest aggregate heuristic score.`,
    branches,
    isFallback: true,
  };
}

export const arenaSidebarTaskDescription = `The exported reduceSidebarState reducer in ${sidebarTargetFile} must close the sidebar (open=false) when it receives an event of type "ROUTE_CHANGE". It currently only handles "TOGGLE" and falls through to return state. Tests run via "${sidebarTestCommand}".`;

export { buggySidebarState, sidebarTargetFile, sidebarTestCommand };
