export type SandboxIssueId =
  | "issue-1" | "issue-2" | "issue-3" | "issue-4" | "issue-5"
  | "issue-6" | "issue-7" | "issue-8" | "issue-9" | "issue-10"
  | "issue-11" | "issue-12" | "issue-13" | "issue-14" | "issue-15"
  | "issue-16" | "issue-17" | "issue-18" | "issue-19" | "issue-20";

export type SandboxIssue = {
  id: SandboxIssueId;
  number: number;
  title: string;
  summary: string;
  body: string;
  labels: string[];
  risk: "Low" | "Medium" | "Unknown";
  targetFile: string;
  exportName: string;
  testFile: string;
  testCommand: string;
  testContent: string;
  githubUrl?: string;
};

type GitHubIssueSummary = {
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

export const sandboxIssues: SandboxIssue[] = [
  issue(1, "mathUtils.js", "add", "Fix mathUtils.js add function", "add should return a + b, not a - b.", `check("adds positive numbers", () => expectEqual(add(2, 3), 5));
check("adds negative numbers", () => expectEqual(add(-2, 3), 1));`),
  issue(2, "stringUtils.js", "capitalize", "Fix stringUtils.js capitalize function", "capitalize should uppercase the first character.", `check("capitalizes first letter", () => expectEqual(capitalize("forklab"), "Forklab"));
check("keeps empty string safe", () => expectEqual(capitalize(""), ""));`),
  issue(3, "arrayUtils.js", "findMax", "Fix arrayUtils.js findMax return value", "findMax should return null for empty arrays.", `check("returns null for empty arrays", () => expectEqual(findMax([]), null));
check("returns max value", () => expectEqual(findMax([3, 9, 1]), 9));`),
  issue(4, "dateUtils.js", "formatDate", "Fix dateUtils.js month typo", "January is misspelled in the month list.", `check("formats January correctly", () => expectEqual(formatDate(new Date("2026-01-05T00:00:00Z")), "January 5, 2026"));`),
  issue(5, "validation.js", "isValidEmail", "Fix validation.js email regex", "Email validation should require an @ and domain.", `check("accepts valid email", () => expectEqual(isValidEmail("demo@example.com"), true));
check("rejects missing at symbol", () => expectEqual(isValidEmail("demo.example.com"), false));`),
  issue(6, "converter.js", "celsiusToFahrenheit", "Fix converter.js celsiusToFahrenheit formula", "Celsius conversion should add 32.", `check("converts freezing point", () => expectEqual(celsiusToFahrenheit(0), 32));
check("converts boiling point", () => expectEqual(celsiusToFahrenheit(100), 212));`),
  issue(7, "auth.js", "login", "Fix auth.js hardcoded credentials", "login should compare against declared demo constants.", `check("accepts demo credentials", () => expectEqual(login("admin", "12345"), true));
check("rejects wrong password", () => expectEqual(login("admin", "bad"), false));`),
  issue(8, "config.js", "API_URL", "Fix config.js API_URL protocol", "API_URL should include https://.", `check("api url includes https protocol", () => expectEqual(API_URL, "https://api.example.com"));`),
  issue(9, "logger.js", "logInfo", "Fix logger.js logInfo method", "logInfo should call console.log.", `check("logInfo uses console.log", () => {
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
});`),
  issue(10, "formatter.js", "formatCurrency", "Fix formatter.js formatCurrency spacing", "Currency output should not include a space after $.", `check("formats without space", () => expectEqual(formatCurrency(12), "$12.00"));`),
  issue(11, "filter.js", "filterOdd", "Fix filter.js filterOdd logic", "filterOdd should return odd numbers.", `check("returns odd numbers", () => expectEqual(filterOdd([1, 2, 3, 4]).join(","), "1,3"));`),
  issue(12, "sorter.js", "sortAscending", "Fix sorter.js sortAscending behavior", "sortAscending should sort numerically.", `check("sorts numbers numerically", () => expectEqual(sortAscending([10, 2, 1]).join(","), "1,2,10"));`),
  issue(13, "mapper.js", "mapToUser", "Fix mapper.js missing field", "mapToUser should include id from raw data.", `check("maps id field", () => {
  const user = mapToUser({ id: "u1", userName: "Ada", userEmail: "ada@example.com" });
  expectEqual(user.id, "u1");
  expectEqual(user.name, "Ada");
});`),
  issue(14, "generator.js", "generateId", "Fix generator.js constant ID", "generateId should create unique IDs.", `check("generates id prefix", () => expectEqual(generateId().startsWith("id_"), true));
check("does not return the old constant", () => expectEqual(generateId() === "id_12345", false));`),
  issue(15, "parser.js", "parseJSON", "Fix parser.js missing error handling", "parseJSON should return null for invalid JSON.", `check("parses valid json", () => expectEqual(parseJSON("{\\"ok\\":true}").ok, true));
check("returns null for invalid json", () => expectEqual(parseJSON("{bad"), null));`),
  issue(16, "searcher.js", "binarySearch", "Fix searcher.js binarySearch mid calculation", "binarySearch should calculate midpoint with parentheses.", `check("finds target near right side", () => expectEqual(binarySearch([1, 2, 3, 4, 5, 6, 7], 6), 5));
check("returns -1 when missing", () => expectEqual(binarySearch([1, 2, 3], 9), -1));`),
  issue(17, "transformer.js", "toSnakeCase", "Fix transformer.js toSnakeCase global replace", "toSnakeCase should replace all spaces.", `check("replaces all spaces", () => expectEqual(toSnakeCase("Hello Fork Lab"), "hello_fork_lab"));`),
  issue(18, "helper.js", "isLeapYear", "Fix helper.js leap year logic", "Leap year logic should handle century years.", `check("1900 is not a leap year", () => expectEqual(isLeapYear(1900), false));
check("2000 is a leap year", () => expectEqual(isLeapYear(2000), true));`),
  issue(19, "calculator.js", "multiply", "Fix calculator.js multiply negative handling", "multiply should allow negative operands.", `check("multiplies negative operands", () => expectEqual(multiply(-2, 3), -6));
check("multiplies positive operands", () => expectEqual(multiply(2, 3), 6));`),
  issue(20, "storage.js", "saveToLocal", "Fix storage.js storage type", "saveToLocal should use localStorage.", `check("writes to localStorage", () => {
  const calls = [];
  globalThis.localStorage = { setItem: (key, value) => calls.push(["local", key, value]) };
  globalThis.sessionStorage = { setItem: (key, value) => calls.push(["session", key, value]) };
  saveToLocal("token", "abc");
  expectEqual(calls[0][0], "local");
  expectEqual(calls[0][1], "token");
  expectEqual(calls[0][2], "abc");
});`),
];

export const sandboxIssueIds = sandboxIssues.map((issue) => issue.id);

export function getSandboxIssue(branchId: string | number) {
  const number =
    typeof branchId === "number"
      ? branchId
      : Number(String(branchId).replace("issue-", ""));
  return sandboxIssues.find((issue) => issue.number === number);
}

export function isSandboxIssueBranch(
  branchId: string,
): branchId is SandboxIssueId {
  return sandboxIssueIds.includes(branchId as SandboxIssueId);
}

export function mergeGitHubIssues(githubIssues: GitHubIssueSummary[]) {
  return sandboxIssues.map((issue) => {
    const github = githubIssues.find((candidate) => candidate.number === issue.number);
    return github
      ? {
          ...issue,
          title: github.title || issue.title,
          body: github.body || issue.body,
          summary: github.body || issue.summary,
          labels: github.labels.length ? github.labels : issue.labels,
          githubUrl: github.htmlUrl,
        }
      : issue;
  });
}

export function createSandboxIssueBranchList(issueIds: SandboxIssueId[]) {
  return issueIds
    .map(getSandboxIssue)
    .filter((issue): issue is SandboxIssue => Boolean(issue))
    .map((issue) => ({
      id: issue.id,
      title: `#${issue.number} ${issue.title}`,
      description: issue.summary,
      risk: issue.risk,
      mode: "live" as const,
    }));
}

export function createSandboxPackageJson(issue: SandboxIssue) {
  return JSON.stringify(
    {
      type: "module",
      scripts: { test: issue.testCommand, build: "node build.js" },
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

export function createFallbackPatchedContent(
  issue: SandboxIssue,
  sourceContent: string,
  attemptNumber = 1,
) {
  if (issue.id === "issue-1" && attemptNumber <= 1) return sourceContent;

  const replacements: Record<SandboxIssueId, (source: string) => string> = {
    "issue-1": (s) => s.replace("return a - b", "return a + b"),
    "issue-2": (s) => s.replace("toLowerCase()", "toUpperCase()"),
    "issue-3": (s) => s.replace("return undefined", "return null"),
    "issue-4": (s) => s.replace("Januray", "January"),
    "issue-5": (s) => s.replace("/^[a-zA-Z0-9.]+$/", "/^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$/"),
    "issue-6": (s) => s.replace("- 32", "+ 32").replace("9/5", "9 / 5"),
    "issue-7": () => `const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "12345";

export const login = (username, password) => {
  return username === DEMO_USERNAME && password === DEMO_PASSWORD;
};
`,
    "issue-8": (s) => s.replace('"api.example.com"', '"https://api.example.com"'),
    "issue-9": (s) => s.replace("console.error", "console.log"),
    "issue-10": (s) => s.replace('"$ " + amount.toFixed(2)', '"$" + amount.toFixed(2)'),
    "issue-11": (s) => s.replace("n % 2 === 0", "n % 2 !== 0"),
    "issue-12": (s) => s.replace("arr.sort()", "arr.sort((a, b) => a - b)"),
    "issue-13": () => `export const mapToUser = (data) => {
  return {
    id: data.id,
    name: data.userName,
    email: data.userEmail,
  };
};
`,
    "issue-14": () => `export const generateId = () => {
  return \`id_\${Math.random().toString(36).slice(2, 10)}\`;
};
`,
    "issue-15": () => `export const parseJSON = (json) => {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
};
`,
    "issue-16": (s) => s.replace("Math.floor(left + right / 2)", "Math.floor((left + right) / 2)"),
    "issue-17": (s) => s.replace('.replace(" ", "_")', '.replaceAll(" ", "_")'),
    "issue-18": () => `export const isLeapYear = (year) => {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
};
`,
    "issue-19": () => `export const multiply = (a, b) => {
  return a * b;
};
`,
    "issue-20": (s) => s.replace("sessionStorage", "localStorage"),
  };

  return replacements[issue.id](sourceContent);
}

function issue(
  number: number,
  fileName: string,
  exportName: string,
  title: string,
  summary: string,
  checks: string,
): SandboxIssue {
  const targetFile = `src/${fileName}`;
  const testFile = `tests/test-${fileName}`;
  return {
    id: `issue-${number}` as SandboxIssueId,
    number,
    title,
    summary,
    body: summary,
    labels: ["github", "sandbox", "one-file-fix"],
    risk: "Low",
    targetFile,
    exportName,
    testFile,
    testCommand: `node ${testFile}`,
    testContent: createIssueTest(targetFile, exportName, checks),
  };
}

function createIssueTest(targetFile: string, exportName: string, checks: string) {
  return `import { writeFileSync } from "node:fs";
import { ${exportName} } from "../${targetFile}";

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
