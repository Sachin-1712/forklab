import type { AgentProvider } from "./patchSchema";
import {
  createFallbackPatchedContent,
  createFallbackTestContent,
  hasFallbackForIssue,
  sandboxIssueNumberFromBranchId,
  type SandboxIssue,
  type SandboxIssueId,
} from "../sandboxIssues";

export type IssuePatchProposal = {
  provider: "gemini" | "groq" | "fallback";
  issueId: SandboxIssueId;
  diagnosis: string;
  targetFile: string;
  patchedContent: string;
  testContent: string;
  summary: string;
  isFallback: boolean;
};

export type IssueContext = {
  id: SandboxIssueId;
  number: number;
  title: string;
  body: string;
  targetFile: string;
};

export type IssuePatchPlanInput = {
  issue: IssueContext;
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
    issueId: { type: "string" },
    diagnosis: { type: "string" },
    targetFile: { type: "string" },
    patchedContent: { type: "string" },
    testContent: { type: "string" },
    summary: { type: "string" },
    isFallback: { type: "boolean" },
  },
  required: [
    "provider",
    "issueId",
    "diagnosis",
    "targetFile",
    "patchedContent",
    "testContent",
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
  if (!input.issue || typeof input.issue !== "object") {
    throw new Error("issue context is required.");
  }
  const issue = input.issue;
  if (
    !issue.id ||
    sandboxIssueNumberFromBranchId(issue.id) === null ||
    typeof issue.number !== "number" ||
    typeof issue.title !== "string" ||
    typeof issue.body !== "string" ||
    typeof issue.targetFile !== "string" ||
    !issue.targetFile.trim()
  ) {
    throw new Error("issue context is malformed.");
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
  expected?: { provider?: "gemini" | "groq" | "fallback"; issue: IssueContext },
): IssuePatchProposal {
  if (!value || typeof value !== "object") {
    throw new Error("Issue patch proposal must be an object.");
  }

  const proposal = value as Partial<IssuePatchProposal>;

  if (
    proposal.provider !== "gemini" &&
    proposal.provider !== "groq" &&
    proposal.provider !== "fallback"
  ) {
    throw new Error("Issue patch provider is invalid.");
  }
  if (expected?.provider && proposal.provider !== expected.provider) {
    throw new Error(`Issue patch provider must be ${expected.provider}.`);
  }
  if (
    !proposal.issueId ||
    sandboxIssueNumberFromBranchId(proposal.issueId) === null
  ) {
    throw new Error("Issue patch issueId is invalid.");
  }
  if (expected?.issue && proposal.issueId !== expected.issue.id) {
    throw new Error(`Issue patch issueId must be ${expected.issue.id}.`);
  }
  if (typeof proposal.targetFile !== "string" || !proposal.targetFile.trim()) {
    throw new Error("Issue patch targetFile is required.");
  }
  if (expected?.issue && proposal.targetFile !== expected.issue.targetFile) {
    throw new Error(`Issue patch target must be ${expected.issue.targetFile}.`);
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
  const nonAsciiPatch = proposal.patchedContent.match(/[^\x09\x0A\x0D\x20-\x7E]/);
  if (nonAsciiPatch) {
    const codepoint = nonAsciiPatch[0].codePointAt(0)?.toString(16) ?? "?";
    throw new Error(
      `Issue patch contains non-ASCII character U+${codepoint.toUpperCase()}.`,
    );
  }
  if (typeof proposal.testContent !== "string" || !proposal.testContent.trim()) {
    throw new Error("Issue patch testContent is required.");
  }
  if (!proposal.testContent.includes("import")) {
    throw new Error("Issue patch testContent must import the target module.");
  }
  if (shellNeedles.some((needle) => proposal.testContent!.includes(needle))) {
    throw new Error("Issue patch testContent must not contain shell-like commands.");
  }
  const nonAsciiTest = proposal.testContent.match(/[^\x09\x0A\x0D\x20-\x7E]/);
  if (nonAsciiTest) {
    const codepoint = nonAsciiTest[0].codePointAt(0)?.toString(16) ?? "?";
    throw new Error(
      `Issue patch testContent contains non-ASCII character U+${codepoint.toUpperCase()}.`,
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

export function canFallbackForIssue(issueNumber: number) {
  return hasFallbackForIssue(issueNumber);
}

export function createIssueFallbackPatch(
  issue: SandboxIssue,
  sourceContent: string,
  attemptNumber = 1,
): IssuePatchProposal {
  const isForcedRetryDemo = issue.number === 1 && attemptNumber <= 1;
  const testContent = createFallbackTestContent(issue);
  if (!testContent) {
    throw new Error(
      `No deterministic fallback test exists for issue #${issue.number}.`,
    );
  }

  return {
    provider: "fallback",
    issueId: issue.id,
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
    testContent,
    summary: isForcedRetryDemo
      ? "Intentional first-attempt failure for the retry demo."
      : `Deterministic fallback patch for #${issue.number}: ${issue.title}.`,
    isFallback: true,
  };
}
