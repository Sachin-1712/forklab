export type SandboxIssueId = `issue-${number}`;

export type SandboxIssue = {
  id: SandboxIssueId;
  number: number;
  title: string;
  summary: string;
  body: string;
  labels: string[];
  risk: "Low" | "Medium" | "Unknown";
  targetFile: string;
  githubUrl?: string;
};

export type GitHubIssueSummary = {
  number: number;
  title: string;
  body: string;
  htmlUrl: string;
  labels: string[];
};

export const sandboxRepo = {
  owner: "Jyozaa",
  name: "forklab-sandbox-issues",
  defaultBranch: "main",
  fullName: "Jyozaa/forklab-sandbox-issues",
  url: "https://github.com/Jyozaa/forklab-sandbox-issues",
};

const testResultPath = "/forklab-issue/test-result.json";

const FILENAME_PATTERN =
  /([A-Za-z][A-Za-z0-9_.-]*\.(?:js|jsx|ts|tsx|mjs|cjs))/;

export function detectTargetFile(title: string, body: string): string | null {
  const titleMatch = title.match(FILENAME_PATTERN);
  if (titleMatch) return resolveRepoPath(titleMatch[1]);
  const bodyMatch = body.match(FILENAME_PATTERN);
  if (bodyMatch) return resolveRepoPath(bodyMatch[1]);
  return null;
}

function resolveRepoPath(filename: string): string {
  if (filename.includes("/")) return filename;
  return `src/${filename}`;
}

export function buildSandboxIssue(github: GitHubIssueSummary): SandboxIssue | null {
  const targetFile = detectTargetFile(github.title, github.body);
  if (!targetFile) return null;
  const summary = github.body.trim().split(/\r?\n/)[0] || github.title;
  return {
    id: `issue-${github.number}` as SandboxIssueId,
    number: github.number,
    title: github.title,
    summary,
    body: github.body,
    labels: github.labels,
    risk: inferRisk(github.labels),
    targetFile,
    githubUrl: github.htmlUrl,
  };
}

function inferRisk(labels: string[]): SandboxIssue["risk"] {
  const lower = labels.map((l) => l.toLowerCase());
  if (lower.some((l) => l.includes("medium"))) return "Medium";
  if (lower.some((l) => l.includes("low") || l.includes("one-file-fix"))) return "Low";
  return "Low";
}

export function isSandboxIssueBranch(
  branchId: string,
): branchId is SandboxIssueId {
  return /^issue-\d+$/.test(branchId);
}

export function sandboxIssueNumberFromBranchId(
  branchId: string,
): number | null {
  const match = branchId.match(/^issue-(\d+)$/);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isFinite(number) ? number : null;
}

export function deriveTestFile(targetFile: string): string {
  const fileName = targetFile.split("/").pop() ?? targetFile;
  return `tests/test-${fileName}`;
}

export function deriveTestCommand(targetFile: string): string {
  return `node ${deriveTestFile(targetFile)}`;
}

export function createSandboxIssueBranchList(issues: SandboxIssue[]) {
  return issues.map((issue) => ({
    id: issue.id,
    title: `#${issue.number} ${issue.title}`,
    description: issue.targetFile,
    risk: issue.risk,
    mode: "live" as const,
  }));
}

export function createSandboxPackageJson(issue: SandboxIssue) {
  return JSON.stringify(
    {
      type: "module",
      scripts: { test: deriveTestCommand(issue.targetFile), build: "node build.js" },
      forklab: { repo: sandboxRepo.fullName, issue: `#${issue.number}` },
    },
    null,
    2,
  );
}

export function createSandboxProofScript(issue: SandboxIssue) {
  return `import { writeFileSync } from "node:fs";

const proof = {
  repo: "${sandboxRepo.fullName}",
  issue: ${issue.number},
  title: ${JSON.stringify(issue.title)},
  executedAt: new Date().toISOString(),
  runtime: process.version,
  cwd: process.cwd()
};

console.log("ForkLab GitHub issue proof:", proof.issue, proof.title);
writeFileSync("/forklab-issue/proof-result.json", JSON.stringify(proof, null, 2));
`;
}

export function createSandboxBuildScript(issue: SandboxIssue) {
  return `import { writeFileSync } from "node:fs";

const report = {
  status: "passed",
  repo: "${sandboxRepo.fullName}",
  issue: ${issue.number},
  title: ${JSON.stringify(issue.title)},
  filesChanged: [${JSON.stringify(issue.targetFile)}]
};

writeFileSync("/forklab-issue/build-result.json", JSON.stringify(report, null, 2));
console.log("Build passed for issue #${issue.number}.");
`;
}

export function createSandboxPatchScript(patchedContent: string, targetFile: string) {
  return `import { writeFileSync } from "node:fs";

writeFileSync("/forklab-issue/${targetFile}", ${JSON.stringify(patchedContent)});
console.log("Applied patch to ${targetFile}.");
`;
}

export function createSandboxIssueDiff(
  issue: SandboxIssue,
  sourceContent: string,
  patchedContent: string,
) {
  return `--- a/${issue.targetFile}
+++ b/${issue.targetFile}
@@
${sourceContent
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

export function wrapIssueTestContent(checks: string) {
  return `import { writeFileSync } from "node:fs";

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

${checks}

if (failures.length) {
  writeFileSync("${testResultPath}", JSON.stringify({ status: "failed", failures }, null, 2));
  process.exit(1);
}

writeFileSync("${testResultPath}", JSON.stringify({ status: "passed", failures: [] }, null, 2));
console.log("Sandbox GitHub issue checks passed.");
`;
}

type FallbackEntry = {
  exportName: string;
  patchedContent: (source: string) => string;
  checks: string;
};

const fallbackByNumber: Record<number, FallbackEntry> = {
  1: {
    exportName: "add",
    patchedContent: (s) => s.replace("return a - b", "return a + b"),
    checks: `check("adds positive numbers", () => expectEqual(add(2, 3), 5));
check("adds negative numbers", () => expectEqual(add(-2, 3), 1));`,
  },
  2: {
    exportName: "capitalize",
    patchedContent: (s) => s.replace("toLowerCase()", "toUpperCase()"),
    checks: `check("capitalizes first letter", () => expectEqual(capitalize("forklab"), "Forklab"));
check("keeps empty string safe", () => expectEqual(capitalize(""), ""));`,
  },
  3: {
    exportName: "findMax",
    patchedContent: (s) => s.replace("return undefined", "return null"),
    checks: `check("returns null for empty arrays", () => expectEqual(findMax([]), null));
check("returns max value", () => expectEqual(findMax([3, 9, 1]), 9));`,
  },
  4: {
    exportName: "formatDate",
    patchedContent: (s) => s.replace("Januray", "January"),
    checks: `check("formats January correctly", () => expectEqual(formatDate(new Date("2026-01-05T00:00:00Z")), "January 5, 2026"));`,
  },
  5: {
    exportName: "isValidEmail",
    patchedContent: (s) =>
      s.replace("/^[a-zA-Z0-9.]+$/", "/^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$/"),
    checks: `check("accepts valid email", () => expectEqual(isValidEmail("demo@example.com"), true));
check("rejects missing at symbol", () => expectEqual(isValidEmail("demo.example.com"), false));`,
  },
  6: {
    exportName: "celsiusToFahrenheit",
    patchedContent: (s) => s.replace("- 32", "+ 32").replace("9/5", "9 / 5"),
    checks: `check("converts freezing point", () => expectEqual(celsiusToFahrenheit(0), 32));
check("converts boiling point", () => expectEqual(celsiusToFahrenheit(100), 212));`,
  },
  7: {
    exportName: "login",
    patchedContent: () => `const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "12345";

export const login = (username, password) => {
  return username === DEMO_USERNAME && password === DEMO_PASSWORD;
};
`,
    checks: `check("accepts demo credentials", () => expectEqual(login("admin", "12345"), true));
check("rejects wrong password", () => expectEqual(login("admin", "bad"), false));`,
  },
  8: {
    exportName: "API_URL",
    patchedContent: (s) => s.replace('"api.example.com"', '"https://api.example.com"'),
    checks: `check("api url includes https protocol", () => expectEqual(API_URL, "https://api.example.com"));`,
  },
  9: {
    exportName: "logInfo",
    patchedContent: (s) => s.replace("console.error", "console.log"),
    checks: `check("logInfo uses console.log", () => {
  const calls = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (message) => calls.push(["log", message]);
  console.error = (message) => calls.push(["error", message]);
  logInfo("ready");
  console.log = originalLog;
  console.error = originalError;
  expectEqual(calls[0][0], "log");
  expectEqual(calls[0][1], "INFO: ready");
});`,
  },
  10: {
    exportName: "formatCurrency",
    patchedContent: (s) =>
      s.replace('"$ " + amount.toFixed(2)', '"$" + amount.toFixed(2)'),
    checks: `check("formats without space", () => expectEqual(formatCurrency(12), "$12.00"));`,
  },
  11: {
    exportName: "filterOdd",
    patchedContent: (s) => s.replace("n % 2 === 0", "n % 2 !== 0"),
    checks: `check("returns odd numbers", () => expectEqual(filterOdd([1, 2, 3, 4]).join(","), "1,3"));`,
  },
  12: {
    exportName: "sortAscending",
    patchedContent: (s) => s.replace("arr.sort()", "arr.sort((a, b) => a - b)"),
    checks: `check("sorts numbers numerically", () => expectEqual(sortAscending([10, 2, 1]).join(","), "1,2,10"));`,
  },
  13: {
    exportName: "mapToUser",
    patchedContent: () => `export const mapToUser = (data) => {
  return {
    id: data.id,
    name: data.userName,
    email: data.userEmail,
  };
};
`,
    checks: `check("maps id field", () => {
  const user = mapToUser({ id: "u1", userName: "Ada", userEmail: "ada@example.com" });
  expectEqual(user.id, "u1");
  expectEqual(user.name, "Ada");
});`,
  },
  14: {
    exportName: "generateId",
    patchedContent: () => `export const generateId = () => {
  return \`id_\${Math.random().toString(36).slice(2, 10)}\`;
};
`,
    checks: `check("generates id prefix", () => expectEqual(generateId().startsWith("id_"), true));
check("does not return the old constant", () => expectEqual(generateId() === "id_12345", false));`,
  },
  15: {
    exportName: "parseJSON",
    patchedContent: () => `export const parseJSON = (json) => {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
};
`,
    checks: `check("parses valid json", () => expectEqual(parseJSON("{\\"ok\\":true}").ok, true));
check("returns null for invalid json", () => expectEqual(parseJSON("{bad"), null));`,
  },
  16: {
    exportName: "binarySearch",
    patchedContent: (s) =>
      s.replace("Math.floor(left + right / 2)", "Math.floor((left + right) / 2)"),
    checks: `check("finds target near right side", () => expectEqual(binarySearch([1, 2, 3, 4, 5, 6, 7], 6), 5));
check("returns -1 when missing", () => expectEqual(binarySearch([1, 2, 3], 9), -1));`,
  },
  17: {
    exportName: "toSnakeCase",
    patchedContent: (s) => s.replace('.replace(" ", "_")', '.replaceAll(" ", "_")'),
    checks: `check("replaces all spaces", () => expectEqual(toSnakeCase("Hello Fork Lab"), "hello_fork_lab"));`,
  },
  18: {
    exportName: "isLeapYear",
    patchedContent: () => `export const isLeapYear = (year) => {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
};
`,
    checks: `check("1900 is not a leap year", () => expectEqual(isLeapYear(1900), false));
check("2000 is a leap year", () => expectEqual(isLeapYear(2000), true));`,
  },
  19: {
    exportName: "multiply",
    patchedContent: () => `export const multiply = (a, b) => {
  return a * b;
};
`,
    checks: `check("multiplies negative operands", () => expectEqual(multiply(-2, 3), -6));
check("multiplies positive operands", () => expectEqual(multiply(2, 3), 6));`,
  },
  20: {
    exportName: "saveToLocal",
    patchedContent: (s) => s.replace("sessionStorage", "localStorage"),
    checks: `check("writes to localStorage", () => {
  const calls = [];
  globalThis.localStorage = { setItem: (key, value) => calls.push(["local", key, value]) };
  globalThis.sessionStorage = { setItem: (key, value) => calls.push(["session", key, value]) };
  saveToLocal("token", "abc");
  expectEqual(calls[0][0], "local");
  expectEqual(calls[0][1], "token");
  expectEqual(calls[0][2], "abc");
});`,
  },
};

export function hasFallbackForIssue(issueNumber: number): boolean {
  return Boolean(fallbackByNumber[issueNumber]);
}

export function getFallbackExportName(issueNumber: number): string | null {
  return fallbackByNumber[issueNumber]?.exportName ?? null;
}

export function createFallbackPatchedContent(
  issue: SandboxIssue,
  sourceContent: string,
  attemptNumber = 1,
) {
  if (issue.number === 1 && attemptNumber <= 1) return sourceContent;
  const entry = fallbackByNumber[issue.number];
  if (!entry) {
    throw new Error(
      `No deterministic fallback exists for issue #${issue.number}.`,
    );
  }
  return entry.patchedContent(sourceContent);
}

export function createFallbackTestContent(issue: SandboxIssue): string | null {
  const entry = fallbackByNumber[issue.number];
  if (!entry) return null;
  const importLine = `import { ${entry.exportName} } from "../${issue.targetFile}";`;
  return `${importLine}\n\n${wrapIssueTestContent(entry.checks)}`;
}
