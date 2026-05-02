export type AgentProvider = "gemini" | "groq" | "auto" | "fallback";

export type PatchRisk = "low" | "medium" | "high";

export type PatchProposal = {
  provider: "gemini" | "groq" | "fallback";
  diagnosis: string;
  targetFile: string;
  patchedContent: string;
  risk: PatchRisk;
  testsToRun: string[];
  summary: string;
  isFallback: boolean;
};

export type PatchPlanInput = {
  scenarioId: string;
  task: string;
  files: Array<{ path: string; content: string }>;
  testOutput: string;
  provider: AgentProvider;
};

export const tenantScenarioId = "tenant-access-control";
export const tenantTargetFile = "src/accessControl.js";
export const tenantAllowedCommand = "node tests/test-access-control.js";

export const patchProposalJsonSchema = {
  type: "object",
  properties: {
    provider: {
      type: "string",
      enum: ["gemini", "groq", "fallback"],
      description: "The provider that produced this patch proposal.",
    },
    diagnosis: {
      type: "string",
      description: "Short explanation of the root cause.",
    },
    targetFile: {
      type: "string",
      description: "The only file to overwrite.",
    },
    patchedContent: {
      type: "string",
      description: "Full replacement content for the target file.",
    },
    risk: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "Risk level of the patch.",
    },
    testsToRun: {
      type: "array",
      items: { type: "string" },
      description: "The test command ForkLab should run after approval.",
    },
    summary: {
      type: "string",
      description: "User-facing summary of the proposed fix.",
    },
    isFallback: {
      type: "boolean",
      description: "True only when this is the deterministic fallback patch.",
    },
  },
  required: [
    "provider",
    "diagnosis",
    "targetFile",
    "patchedContent",
    "risk",
    "testsToRun",
    "summary",
    "isFallback",
  ],
  additionalProperties: false,
} as const;

export const buggyAccessControl = `function canViewInvoice(user, invoice) {
  if (user.role === "admin") return true;
  return user.id === invoice.ownerId;
}

module.exports = { canViewInvoice };
`;

export const fixedAccessControl = `function canViewInvoice(user, invoice) {
  if (!user || !invoice) return false;
  if (user.tenantId !== invoice.tenantId) return false;

  if (user.role === "admin") return true;
  return user.id === invoice.ownerId;
}

module.exports = { canViewInvoice };
`;

export const accessControlTest = `const { writeFileSync } = require("node:fs");
const { canViewInvoice } = require("../src/accessControl.js");

const failures = [];

function expectEqual(actual, expected) {
  if (actual !== expected) {
    throw new Error(\`expected \${expected}, received \${actual}\`);
  }
}

function check(name, fn) {
  try {
    fn();
    console.log("PASS", name);
  } catch (error) {
    console.error("FAIL", name);
    console.error(error.message);
    failures.push({ name, message: error.message });
  }
}

const invoice = { id: "inv_100", ownerId: "user_owner", tenantId: "tenant_a" };

console.log("Running tenant access-control checks...");

check("same-tenant admin can view invoice", () => {
  expectEqual(
    canViewInvoice({ id: "admin_a", role: "admin", tenantId: "tenant_a" }, invoice),
    true
  );
});

check("different-tenant admin cannot view invoice", () => {
  expectEqual(
    canViewInvoice({ id: "admin_b", role: "admin", tenantId: "tenant_b" }, invoice),
    false
  );
});

check("owner in same tenant can view invoice", () => {
  expectEqual(
    canViewInvoice({ id: "user_owner", role: "member", tenantId: "tenant_a" }, invoice),
    true
  );
});

check("random same-tenant user cannot view invoice", () => {
  expectEqual(
    canViewInvoice({ id: "random_a", role: "member", tenantId: "tenant_a" }, invoice),
    false
  );
});

check("cross-tenant owner cannot view invoice", () => {
  expectEqual(
    canViewInvoice({ id: "user_owner", role: "member", tenantId: "tenant_b" }, invoice),
    false
  );
});

if (failures.length) {
  writeFileSync(
    "/forklab-agent/test-result.json",
    JSON.stringify({ status: "failed", failures }, null, 2)
  );
  console.error("Tenant access-control checks failed.");
  process.exit(1);
}

writeFileSync(
  "/forklab-agent/test-result.json",
  JSON.stringify({ status: "passed", failures: [] }, null, 2)
);
console.log("Tenant access-control checks passed.");
`;

export function createFallbackPatch(): PatchProposal {
  return {
    provider: "fallback",
    diagnosis:
      "The buggy function grants every admin access before checking tenant boundaries.",
    targetFile: tenantTargetFile,
    patchedContent: fixedAccessControl,
    risk: "low",
    testsToRun: [tenantAllowedCommand],
    summary:
      "Require tenant equality first, then allow same-tenant admins and same-tenant owners.",
    isFallback: true,
  };
}

export function parsePatchProposal(value: unknown) {
  if (typeof value === "string") {
    return JSON.parse(value) as unknown;
  }

  return value;
}

export function validatePatchProposal(
  value: unknown,
  expectedProvider?: "gemini" | "groq" | "fallback",
): PatchProposal {
  if (!value || typeof value !== "object") {
    throw new Error("Patch proposal must be an object.");
  }

  const candidate = value as Partial<PatchProposal>;

  if (
    candidate.provider !== "gemini" &&
    candidate.provider !== "groq" &&
    candidate.provider !== "fallback"
  ) {
    throw new Error("Patch proposal provider is invalid.");
  }

  if (expectedProvider && candidate.provider !== expectedProvider) {
    throw new Error(`Patch proposal provider must be ${expectedProvider}.`);
  }

  if (typeof candidate.diagnosis !== "string" || !candidate.diagnosis.trim()) {
    throw new Error("Patch proposal diagnosis is required.");
  }

  if (candidate.targetFile !== tenantTargetFile) {
    throw new Error(`Patch target must be ${tenantTargetFile}.`);
  }

  if (
    typeof candidate.patchedContent !== "string" ||
    !candidate.patchedContent.trim()
  ) {
    throw new Error("Patch content must be non-empty.");
  }

  if (!candidate.patchedContent.includes("canViewInvoice")) {
    throw new Error("Patch content must include canViewInvoice.");
  }

  if (containsShellLikeContent(candidate.patchedContent)) {
    throw new Error("Patch content must not contain shell-like commands.");
  }

  if (
    candidate.risk !== "low" &&
    candidate.risk !== "medium" &&
    candidate.risk !== "high"
  ) {
    throw new Error("Patch risk is invalid.");
  }

  if (
    !Array.isArray(candidate.testsToRun) ||
    candidate.testsToRun.length !== 1 ||
    candidate.testsToRun[0] !== tenantAllowedCommand
  ) {
    throw new Error(`Only ${tenantAllowedCommand} may be requested.`);
  }

  if (typeof candidate.summary !== "string" || !candidate.summary.trim()) {
    throw new Error("Patch summary is required.");
  }

  if (typeof candidate.isFallback !== "boolean") {
    throw new Error("Patch fallback flag is required.");
  }

  return candidate as PatchProposal;
}

export function validatePatchPlanInput(value: unknown): PatchPlanInput {
  if (!value || typeof value !== "object") {
    throw new Error("Request body must be an object.");
  }

  const input = value as Partial<PatchPlanInput>;

  if (input.scenarioId !== tenantScenarioId) {
    throw new Error(`Only ${tenantScenarioId} is supported.`);
  }

  if (typeof input.task !== "string" || !input.task.trim()) {
    throw new Error("Task is required.");
  }

  if (
    input.provider !== "gemini" &&
    input.provider !== "groq" &&
    input.provider !== "auto" &&
    input.provider !== "fallback"
  ) {
    throw new Error("Provider must be gemini, groq, auto, or fallback.");
  }

  if (!Array.isArray(input.files)) {
    throw new Error("Files must be an array.");
  }

  for (const file of input.files) {
    if (!file || typeof file.path !== "string" || typeof file.content !== "string") {
      throw new Error("Every file must include path and content.");
    }
  }

  if (typeof input.testOutput !== "string") {
    throw new Error("Test output is required.");
  }

  return input as PatchPlanInput;
}

function containsShellLikeContent(content: string) {
  return [
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
  ].some((needle) => content.includes(needle));
}
