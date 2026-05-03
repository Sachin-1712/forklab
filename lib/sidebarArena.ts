import {
  buggySidebarState,
  fixedSidebarState,
  sidebarTargetFile,
  sidebarTestCommand,
} from "./sidebarBranch";
import type { BranchId } from "./runEvents";

export type SidebarArenaBranchId =
  | "sidebar-minimal-fix"
  | "sidebar-robust-fix"
  | "sidebar-ux-polish";

export type SidebarArenaVariant = {
  id: SidebarArenaBranchId;
  title: string;
  agentStyle: string;
  strategy: string;
  summary: string;
  patchedContent: string;
  testContent: string;
  previewHtml: string;
  score: {
    correctness: number;
    maintainability: number;
    risk: number;
    ux: number;
    overall: number;
  };
  winnerReason: string;
};

const robustSidebarState = `const defaultState = { open: false };

function reduceSidebarState(state = defaultState, event = { type: "NOOP" }) {
  if (event.type === "TOGGLE") return { ...state, open: !state.open };
  if (event.type === "ROUTE_CHANGE") return { ...state, open: false };
  return state;
}

module.exports = { reduceSidebarState };
`;

const polishedSidebarState = `function reduceSidebarState(state, event) {
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

const baseSidebarTest = `const { writeFileSync } = require("node:fs");
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

`;

const robustExtraTests = `check("missing state defaults to closed", () => {
  const nextState = reduceSidebarState(undefined, { type: "NOOP" });
  expectEqual(nextState.open, false);
});

check("missing event preserves open state", () => {
  const nextState = reduceSidebarState({ open: true });
  expectEqual(nextState.open, true);
});

`;

const polishedExtraTests = `check("route change records navigation announcement", () => {
  const nextState = reduceSidebarState(
    { open: true, announceNavigation: false },
    { type: "ROUTE_CHANGE", href: "/dashboard" }
  );
  expectEqual(nextState.announceNavigation, true);
});

check("toggle records interaction source", () => {
  const nextState = reduceSidebarState({ open: false }, { type: "TOGGLE" });
  expectEqual(nextState.lastInteraction, "toggle");
});

`;

const testFooter = `if (failures.length) {
  writeFileSync(
    "/forklab-arena/test-result.json",
    JSON.stringify({ status: "failed", failures }, null, 2)
  );
  console.error("Sidebar route-change checks failed.");
  process.exit(1);
}

writeFileSync(
  "/forklab-arena/test-result.json",
  JSON.stringify({ status: "passed", failures: [] }, null, 2)
);
console.log("Sidebar route-change checks passed.");
`;

export const sidebarArenaVariants: SidebarArenaVariant[] = [
  {
    id: "sidebar-minimal-fix",
    title: "Minimal Fix",
    agentStyle: "Conservative",
    strategy: "Smallest possible patch",
    summary:
      "Adds the missing ROUTE_CHANGE case and leaves the rest of the reducer untouched.",
    patchedContent: fixedSidebarState,
    testContent: `${baseSidebarTest}${testFooter}`,
    previewHtml:
      "<button aria-expanded=\"false\">Menu</button><main>Route change closes the drawer.</main>",
    score: {
      correctness: 92,
      maintainability: 84,
      risk: 96,
      ux: 76,
      overall: 87,
    },
    winnerReason:
      "Safest tiny patch, but it does not add broader regression coverage.",
  },
  {
    id: "sidebar-robust-fix",
    title: "Robust Fix",
    agentStyle: "Test-first",
    strategy: "Adds regression tests and fixes root cause",
    summary:
      "Closes on route changes and hardens the reducer against missing state or event inputs.",
    patchedContent: robustSidebarState,
    testContent: `${baseSidebarTest}${robustExtraTests}${testFooter}`,
    previewHtml:
      "<button aria-expanded=\"false\">Menu</button><main>Reducer is defensive and route-safe.</main>",
    score: {
      correctness: 98,
      maintainability: 94,
      risk: 92,
      ux: 82,
      overall: 94,
    },
    winnerReason:
      "Best balance: passes the core bug, adds regression coverage, and keeps behavior predictable.",
  },
  {
    id: "sidebar-ux-polish",
    title: "UX Polish",
    agentStyle: "Product-minded",
    strategy: "Fixes bug and improves navigation feedback",
    summary:
      "Closes on route changes and records interaction metadata for navigation announcements.",
    patchedContent: polishedSidebarState,
    testContent: `${baseSidebarTest}${polishedExtraTests}${testFooter}`,
    previewHtml:
      "<button aria-expanded=\"false\" aria-live=\"polite\">Menu closed after navigation</button>",
    score: {
      correctness: 95,
      maintainability: 86,
      risk: 82,
      ux: 96,
      overall: 91,
    },
    winnerReason:
      "Best UX signal, but it changes state shape more than the robust branch.",
  },
];

export const sidebarArenaBranchIds = sidebarArenaVariants.map(
  (variant) => variant.id,
);

export const sidebarArenaWinnerId: SidebarArenaBranchId = "sidebar-robust-fix";

export function isSidebarArenaBranch(
  branchId: BranchId,
): branchId is SidebarArenaBranchId {
  return sidebarArenaBranchIds.includes(branchId as SidebarArenaBranchId);
}

export function getSidebarArenaVariant(branchId: BranchId) {
  return sidebarArenaVariants.find((variant) => variant.id === branchId);
}

export function createArenaPackageJson(variant: SidebarArenaVariant) {
  return JSON.stringify(
    {
      scripts: {
        test: sidebarTestCommand,
        build: "node build.js",
      },
      forklab: {
        branch: variant.id,
        strategy: variant.strategy,
      },
    },
    null,
    2,
  );
}

export function createArenaBuildScript(variant: SidebarArenaVariant) {
  return `const { writeFileSync } = require("node:fs");

const report = {
  status: "passed",
  branch: ${JSON.stringify(variant.title)},
  strategy: ${JSON.stringify(variant.strategy)},
  previewHtml: ${JSON.stringify(variant.previewHtml)},
  filesChanged: [${JSON.stringify(sidebarTargetFile)}]
};

writeFileSync("/forklab-arena/build-result.json", JSON.stringify(report, null, 2));
console.log("Build passed for ${variant.title}.");
`;
}

export function createArenaPatchScript(variant: SidebarArenaVariant) {
  return `const { writeFileSync } = require("node:fs");

writeFileSync(
  "/forklab-arena/src/sidebarState.js",
  ${JSON.stringify(variant.patchedContent)}
);

console.log("Applied ${variant.title} patch.");
`;
}

export function createArenaProofScript(variant: SidebarArenaVariant) {
  return `const { writeFileSync } = require("node:fs");

const proof = {
  scenario: "parallel-sidebar-arena",
  branch: ${JSON.stringify(variant.title)},
  strategy: ${JSON.stringify(variant.strategy)},
  executedAt: new Date().toISOString(),
  runtime: process.version,
  cwd: process.cwd()
};

console.log("ForkLab BrowserPod arena proof:", proof.branch);
writeFileSync("/forklab-arena/proof-result.json", JSON.stringify(proof, null, 2));
`;
}

export function createArenaDiff(variant: SidebarArenaVariant) {
  return `--- a/${sidebarTargetFile}
+++ b/${sidebarTargetFile}
@@
${buggySidebarState
  .trimEnd()
  .split("\n")
  .map((line) => `-${line}`)
  .join("\n")}
${variant.patchedContent
  .trimEnd()
  .split("\n")
  .map((line) => `+${line}`)
  .join("\n")}`;
}
