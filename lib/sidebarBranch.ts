export const sidebarTargetFile = "src/sidebarState.js";
export const sidebarTestCommand = "node tests/test-sidebarState.js";

export const buggySidebarState = `function reduceSidebarState(state, event) {
  if (event.type === "TOGGLE") return { ...state, open: !state.open };
  return state;
}

module.exports = { reduceSidebarState };
`;

export const fixedSidebarState = `function reduceSidebarState(state, event) {
  if (event.type === "TOGGLE") return { ...state, open: !state.open };
  if (event.type === "ROUTE_CHANGE") return { ...state, open: false };
  return state;
}

module.exports = { reduceSidebarState };
`;

export const sidebarStateTest = `const { writeFileSync } = require("node:fs");
const { reduceSidebarState } = require("../src/sidebarState.js");

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

console.log("Running sidebar route-change checks...");

check("toggle opens sidebar", () => {
  const nextState = reduceSidebarState({ open: false }, { type: "TOGGLE" });
  expectEqual(nextState.open, true);
});

check("toggle closes sidebar", () => {
  const nextState = reduceSidebarState({ open: true }, { type: "TOGGLE" });
  expectEqual(nextState.open, false);
});

check("route change closes sidebar", () => {
  const nextState = reduceSidebarState(
    { open: true },
    { type: "ROUTE_CHANGE", href: "/settings" }
  );
  expectEqual(nextState.open, false);
});

check("unknown event preserves state", () => {
  const state = { open: true };
  const nextState = reduceSidebarState(state, { type: "NOOP" });
  expectEqual(nextState.open, true);
});

if (failures.length) {
  writeFileSync(
    "/forklab-sidebar/test-result.json",
    JSON.stringify({ status: "failed", failures }, null, 2)
  );
  console.error("Sidebar route-change checks failed.");
  process.exit(1);
}

writeFileSync(
  "/forklab-sidebar/test-result.json",
  JSON.stringify({ status: "passed", failures: [] }, null, 2)
);
console.log("Sidebar route-change checks passed.");
`;

export const sidebarApplyPatch = `const { writeFileSync } = require("node:fs");

writeFileSync(
  "/forklab-sidebar/src/sidebarState.js",
  ${JSON.stringify(fixedSidebarState)}
);

console.log("Applied sidebar route-change patch.");
`;

export const sidebarProofScript = `const { writeFileSync } = require("node:fs");

const proof = {
  scenario: "sidebar-route-change",
  executedAt: new Date().toISOString(),
  runtime: process.version,
  cwd: process.cwd()
};

console.log("ForkLab BrowserPod sidebar proof:", proof.scenario);
writeFileSync("/forklab-sidebar/proof-result.json", JSON.stringify(proof, null, 2));
`;

export const sidebarDiff = `--- a/${sidebarTargetFile}
+++ b/${sidebarTargetFile}
@@
 function reduceSidebarState(state, event) {
   if (event.type === "TOGGLE") return { ...state, open: !state.open };
+  if (event.type === "ROUTE_CHANGE") return { ...state, open: false };
   return state;
 }
`;
