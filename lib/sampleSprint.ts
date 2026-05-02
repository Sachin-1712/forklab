export const buggyExportCsv = `export function getCsvFilename(reportName) {
  return reportName + ".csv";
}

export function exportCsv(rows, reportName) {
  const headers = Object.keys(rows[0] ?? {});
  const body = rows.map((row) =>
    headers.map((header) => JSON.stringify(row[header] ?? "")).join(",")
  );

  return {
    filename: getCsvFilename(reportName),
    content: [headers.join(","), ...body].join("\\n"),
  };
}
`;

export const fixedExportCsv = `export function getCsvFilename(reportName) {
  const slug = String(reportName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return (slug || "report") + ".csv";
}

export function exportCsv(rows, reportName) {
  const headers = Object.keys(rows[0] ?? {});
  const body = rows.map((row) =>
    headers.map((header) => JSON.stringify(row[header] ?? "")).join(",")
  );

  return {
    filename: getCsvFilename(reportName),
    content: [headers.join(","), ...body].join("\\n"),
  };
}
`;

export const sampleFiles = {
  "/forklab/package.json": `{
  "name": "forklab-sample-csv-bug",
  "version": "1.0.0",
  "type": "module"
}
`,
  "/forklab/src/exportCsv.js": buggyExportCsv,
  "/forklab/tests/test-exportCsv.js": `import { writeFileSync } from "node:fs";
import { getCsvFilename, exportCsv } from "../src/exportCsv.js";

const failures = [];

function expectEqual(actual, expected) {
  if (actual !== expected) {
    throw new Error(\`expected "\${expected}", received "\${actual}"\`);
  }
}

function expectIncludes(actual, expected) {
  if (!actual.includes(expected)) {
    throw new Error(\`expected content to include "\${expected}"\`);
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

console.log("Running CSV export filename checks...");

check("normalizes filenames with spaces and symbols", () => {
  expectEqual(getCsvFilename("Q1 Sales / EU"), "q1-sales-eu.csv");
});

check("exports CSV content with the normalized filename", () => {
  const result = exportCsv([{ name: "Leeds", score: 4 }], "Demo Report!");

  expectEqual(result.filename, "demo-report.csv");
  expectIncludes(result.content, "name,score");
});

if (failures.length) {
  writeFileSync(
    "/forklab/test-result.json",
    JSON.stringify({ status: "failed", failures }, null, 2)
  );
  console.error("CSV export checks failed.");
  process.exit(1);
}

writeFileSync(
  "/forklab/test-result.json",
  JSON.stringify({ status: "passed", failures: [] }, null, 2)
);
console.log("CSV export checks passed.");
`,
  "/forklab/applyPatch.js": `import { writeFileSync } from "node:fs";

writeFileSync(
  "/forklab/src/exportCsv.js",
  ${JSON.stringify(fixedExportCsv)}
);

console.log("Patch applied: src/exportCsv.js now slugifies CSV filenames.");
`,
};

export const exportCsvDiff = `--- a/src/exportCsv.js
+++ b/src/exportCsv.js
@@
-export function getCsvFilename(reportName) {
-  return reportName + ".csv";
-}
+export function getCsvFilename(reportName) {
+  const slug = String(reportName)
+    .trim()
+    .toLowerCase()
+    .replace(/[^a-z0-9]+/g, "-")
+    .replace(/^-+|-+$/g, "");
+
+  return (slug || "report") + ".csv";
+}
`;
