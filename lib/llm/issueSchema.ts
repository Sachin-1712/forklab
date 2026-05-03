import type { AgentProvider } from "./patchSchema";
import {
  createFallbackPatchedContent,
  getSandboxIssue,
  sandboxIssueIds,
  type SandboxIssueId,
} from "../sandboxIssues";

export type IssuePatchProposal = {
  provider: "gemini" | "groq" | "fallback";
  issueId: SandboxIssueId;
  diagnosis: string;
  targetFile: string;
  patchedContent: string;
  summary: string;
  isFallback: boolean;
};

export type IssuePatchPlanInput = {
  issueId: SandboxIssueId;
  sourceContent: string;
  testOutput: string;
  provider: AgentProvider;
  previousAttempt?: {
    patchedContent: string;
    failureReason: string;
    errorOutput: string;
    attemptNumber: number;
  };
};

export const issuePatchJsonSchema = {
  type: "object",
  properties: {
    provider: { type: "string", enum: ["gemini", "groq", "fallback"] },
    issueId: { type: "string", enum: sandboxIssueIds },
    diagnosis: { type: "string" },
    targetFile: { type: "string" },
    patchedContent: { type: "string" },
    summary: { type: "string" },
    isFallback: { type: "boolean" },
  },
  required: [
    "provider",
    "issueId",
    "diagnosis",
    "targetFile",
    "patchedContent",
    "summary",
    "isFallback",
  ],
  additionalProperties: false,
} as const;

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

export function validateIssuePatchPlanInput(
  value: unknown,
): IssuePatchPlanInput {
  if (!value || typeof value !== "object") {
    throw new Error("Request body must be an object.");
  }
  const input = value as Partial<IssuePatchPlanInput>;
  if (!input.issueId || !getSandboxIssue(input.issueId)) {
    throw new Error("issueId must be a known sandbox issue.");
  }
  if (typeof input.testOutput !== "string") {
    throw new Error("testOutput is required.");
  }
  if (typeof input.sourceContent !== "string" || !input.sourceContent.trim()) {
    throw new Error("sourceContent is required.");
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
  return input as IssuePatchPlanInput;
}

export function validateIssuePatchProposal(
  value: unknown,
  expectedProvider?: "gemini" | "groq" | "fallback",
): IssuePatchProposal {
  if (!value || typeof value !== "object") {
    throw new Error("Issue patch proposal must be an object.");
  }

  const proposal = value as Partial<IssuePatchProposal>;
  const issue = proposal.issueId ? getSandboxIssue(proposal.issueId) : null;

  if (
    proposal.provider !== "gemini" &&
    proposal.provider !== "groq" &&
    proposal.provider !== "fallback"
  ) {
    throw new Error("Issue patch provider is invalid.");
  }
  if (expectedProvider && proposal.provider !== expectedProvider) {
    throw new Error(`Issue patch provider must be ${expectedProvider}.`);
  }
  if (!issue) {
    throw new Error("Issue patch issueId is invalid.");
  }
  if (proposal.targetFile !== issue.targetFile) {
    throw new Error(`Issue patch target must be ${issue.targetFile}.`);
  }
  if (
    typeof proposal.diagnosis !== "string" ||
    !proposal.diagnosis.trim() ||
    typeof proposal.summary !== "string" ||
    !proposal.summary.trim()
  ) {
    throw new Error("Issue patch diagnosis and summary are required.");
  }
  if (
    typeof proposal.patchedContent !== "string" ||
    !proposal.patchedContent.trim()
  ) {
    throw new Error("Issue patch content must be non-empty.");
  }
  if (!proposal.patchedContent.includes("export")) {
    throw new Error("Issue patch must keep the ES module export.");
  }
  if (shellNeedles.some((needle) => proposal.patchedContent!.includes(needle))) {
    throw new Error("Issue patch must not contain shell-like commands.");
  }
  const nonAsciiMatch = proposal.patchedContent.match(/[^\x09\x0A\x0D\x20-\x7E]/);
  if (nonAsciiMatch) {
    const codepoint = nonAsciiMatch[0].codePointAt(0)?.toString(16) ?? "?";
    throw new Error(
      `Issue patch contains non-ASCII character U+${codepoint.toUpperCase()}.`,
    );
  }
  if (typeof proposal.isFallback !== "boolean") {
    throw new Error("Issue patch isFallback flag is required.");
  }

  return proposal as IssuePatchProposal;
}

export function parseJsonish(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    return JSON.parse(fenced ? fenced[1] : trimmed) as unknown;
  }
  return value;
}

export function createIssueFallbackPatch(
  issueId: SandboxIssueId,
  sourceContent: string,
  attemptNumber = 1,
): IssuePatchProposal {
  const issue = getSandboxIssue(issueId);
  if (!issue) throw new Error("Unknown sandbox issue.");
  const isForcedRetryDemo = issueId === "issue-1" && attemptNumber <= 1;

  return {
    provider: "fallback",
    issueId,
    diagnosis: isForcedRetryDemo
      ? "Intentional demo miss: the first AI attempt changes the file but does not fix addition."
      : "The failing test identifies a small pure-function bug in the sandbox issue target file.",
    targetFile: issue.targetFile,
    patchedContent: isForcedRetryDemo
      ? `export const add = (a, b) => {
  return a - b;
};
`
      : createFallbackPatchedContent(issue, sourceContent, attemptNumber),
    summary: isForcedRetryDemo
      ? "Intentional first-attempt failure for the retry demo."
      : `Deterministic fallback patch for #${issue.number}: ${issue.title}.`,
    isFallback: true,
  };
}
