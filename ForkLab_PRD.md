# ForkLab Sprint — Product Requirements Document (PRD)

## 0. Working Title

**ForkLab Sprint**

### Tagline
**Parallel AI coding agents, verified in browser sandboxes.**

### One-line pitch
ForkLab Sprint takes a repo or task, launches multiple isolated BrowserPod sandboxes, lets AI agents solve issues in parallel, runs real tests/builds inside each pod, and compares the results so the user can choose verified fixes instead of trusting the first AI answer.

---

## 1. Product Context

ForkLab Sprint is designed for the **AI in the Box** hackathon sponsored by BrowserPod / Leaning Technologies.

The core hackathon theme is not simply “use AI.” The theme is **AI applications that safely execute real work inside sandboxed environments**. ForkLab Sprint uses BrowserPod as the execution layer: each AI branch gets a disposable in-browser computer where generated code can be written, run, tested, fixed, and verified.

### Why this matters

Most AI coding tools produce a single answer. Users then have to decide whether the answer works.

ForkLab changes the interaction:

> Instead of one AI answer, users get multiple parallel solution branches, each executed and verified in its own sandbox.

This makes the AI workflow observable, comparable, and safer.

---

## 2. Problem Statement

AI coding assistants are useful, but they create new problems:

1. **Single-answer bias**  
   Users often accept the first AI-generated solution even when a cleaner, safer, or more maintainable solution exists.

2. **Lack of execution proof**  
   AI may produce plausible code that fails tests, breaks builds, or misses edge cases.

3. **Unsafe local execution**  
   Users should not blindly run AI-generated or unfamiliar code on their own machines.

4. **No easy side-by-side comparison**  
   Developers, students, and teams often want multiple approaches: minimal fix, robust fix, UX-focused fix, performance-focused fix, etc.

5. **Context switching across tools**  
   Users currently need separate tools for AI prompting, editing, running tests, comparing diffs, and choosing a final solution.

ForkLab solves this by giving each AI solution a safe BrowserPod sandbox, then comparing the verified results.

---

## 3. Target Users

### Primary users

1. **Student developers**
   - Want to learn by seeing multiple approaches.
   - Want to run code safely without local setup.
   - Want help debugging assignments, side projects, and interview tasks.
   - Must be protected by academic-integrity guardrails.

2. **Hackathon builders**
   - Want multiple fast solution variations.
   - Need safe execution without local install pain.
   - Want to quickly compare frontend/backend approaches.

3. **Indie developers / solo founders**
   - Need quick fixes for small repos.
   - Want AI to suggest and verify multiple implementation options.

4. **Developer-tool teams / open-source maintainers**
   - Need reproducible fixes, docs verification, dependency upgrade trials, and issue triage.

### Secondary users

1. Educators running coding labs.
2. DevRel teams verifying docs examples.
3. Teams evaluating AI coding agents.

---

## 4. Product Goals

### Hackathon MVP goals

- Show **3 BrowserPod sandboxes running in parallel**.
- Run a controlled sample repo with **3 known issues**.
- Let the AI generate or apply patches for each issue.
- Run tests/builds inside each pod.
- Show visible terminal logs.
- Compare branch results in a final report.
- Export a patch/report/PR summary.
- Provide a polished UI by building on the existing `v0-delt` frontend.

### Long-term product goals

- Support arbitrary public GitHub repos.
- Support issue-based workflows.
- Support user-uploaded tasks/scripts/PDF briefs.
- Support multiple AI model strategies.
- Support GitHub branch/PR export.
- Support classroom/interview modes with safe guardrails.

---

## 5. Core Product Principle

**BrowserPod must be the star.**

The user should see:

- a pod booting,
- files being written,
- tests running,
- errors appearing,
- patches applied,
- tests passing,
- results compared.

If BrowserPod is hidden, the idea loses its hackathon value.

---

## 6. Main MVP Use Case

## Use Case 1: Parallel Bug Fix Arena

### User story
As a developer, I want to run 3 AI agents against 3 repo issues in isolated browser sandboxes, so I can see which fixes pass tests and safely choose the verified patches.

### Sample repo
`forklab-sample-app`

### Sample bugs

1. **Sidebar Toggle Bug**
   - Issue: Sidebar does not close correctly on mobile after route change.
   - Files:
     - `src/components/sidebar.tsx`
     - `src/lib/sidebar-state.ts`
     - `tests/sidebar.test.tsx`

2. **CSV Export Bug**
   - Issue: CSV export breaks when report filenames contain spaces/special characters.
   - Files:
     - `src/lib/exportCsv.ts`
     - `tests/exportCsv.test.ts`

3. **Email Validation Bug**
   - Issue: Signup form accepts invalid email addresses.
   - Files:
     - `src/lib/validateEmail.ts`
     - `src/components/signup-form.tsx`
     - `tests/validateEmail.test.ts`

### Branches / pods

| Pod | Issue | Agent strategy |
|---|---|---|
| Pod A | Sidebar Toggle | UI state fix |
| Pod B | CSV Export | Data utility fix |
| Pod C | Email Validation | Form validation fix |

### Required visible flow

1. User clicks **Start Sprint**.
2. App creates 3 pod cards.
3. Each pod boots.
4. Each pod loads the sample repo.
5. Each pod runs the failing test.
6. AI reads the failure and proposes a patch.
7. App writes patch into that pod.
8. Pod reruns tests/build.
9. Result cards update to pass/fail.
10. Final comparison report is generated.

---

## 7. Ten Use Case Modes To Include in Product Roadmap

ForkLab is a general platform for parallel sandboxed AI work. The MVP should implement **one flagship mode**, but the product should present the following 10 modes as planned / selectable templates.

---

### 7.1 Parallel Bug Fix Arena

**Purpose:** Fix multiple repo bugs or compare multiple fix strategies.

**Input:**
- Sample repo or public GitHub repo.
- One or more issues/bugs.

**BrowserPod role:**
- Clone/load repo.
- Run failing tests.
- Apply AI patch.
- Rerun tests/build.
- Produce verified proof.

**Wow moment:**
Three terminals show test failures turning into passing tests.

**MVP priority:** P0 / flagship.

---

### 7.2 DocsProof Arena

**Purpose:** Verify and repair broken documentation code snippets.

**Input:**
- Docs page or markdown file.
- Code snippets extracted by AI.

**BrowserPod role:**
- Create runnable mini-projects.
- Execute docs snippets.
- Detect broken snippets.
- Verify patched snippets.

**Example:**
Old docs import `createClient` incorrectly. BrowserPod runs the snippet, fails, AI fixes it, BrowserPod reruns successfully.

**Business value:**
DevRel/API companies can prevent documentation rot.

**MVP priority:** P1 / strong secondary demo.

---

### 7.3 PackageGuard Arena

**Purpose:** Safely test unknown npm packages before installing them locally.

**Input:**
- npm package name.
- Intended use case.

**BrowserPod role:**
- Create temporary project.
- Run `npm install`.
- Inspect package scripts.
- Run import/usage test.
- Generate safety and usability report.

**Business value:**
Reduces dependency and supply-chain risk.

**MVP priority:** P1/P2.

---

### 7.4 UpgradePilot Arena

**Purpose:** Try multiple dependency upgrade strategies in parallel.

**Input:**
- Old sample project.
- Target dependency upgrade.

**BrowserPod role:**
- Run current tests.
- Apply upgrade branch.
- Install dependencies.
- Run build/test.
- Compare upgrade strategies.

**Example branches:**
- Conservative upgrade.
- Latest stable upgrade.
- Clean config migration.

**MVP priority:** P2.

---

### 7.5 APIForge Arena

**Purpose:** Generate multiple API implementations from the same product spec.

**Input:**
- API description or product spec.

**BrowserPod role:**
- Generate Express/Fastify server.
- Run API locally inside pod.
- Execute endpoint tests.
- Compare API styles.

**Example branches:**
- Simple REST API.
- Validated API with schema checks.
- Docs-first API.

**MVP priority:** P2.

---

### 7.6 DataPlot Arena

**Purpose:** Generate and compare multiple analysis/plotting approaches for CSV/script tasks.

**Input:**
- CSV file.
- Analysis request.
- Optional existing script.

**BrowserPod role:**
- Run generated analysis scripts.
- Produce chart outputs.
- Compare clarity, correctness, and insight quality.

**Example branches:**
- Clean summary.
- Executive report.
- Anomaly detection.

**MVP priority:** P2.

---

### 7.7 InterviewArena

**Purpose:** AI-assisted coding interview practice in a safe sandbox.

**Input:**
- Interview task.
- Student solution.
- AI mode selection.

**BrowserPod role:**
- Run candidate code.
- Run tests.
- Compare AI-generated reference solution.
- Generate feedback report.

**Important guardrail:**
This mode is for **mock interviews and learning**, not for cheating on real interviews.

**MVP priority:** P2.

---

### 7.8 Frontend Variant Arena

**Purpose:** Generate and compare multiple UI/component implementations.

**Input:**
- UI prompt or component spec.

**BrowserPod role:**
- Build small React/Vite previews.
- Run build/lint/tests.
- Expose previews.
- Compare visual/UX variants.

**Example branches:**
- Minimal Linear-style.
- Vercel developer-style.
- Accessibility-first.

**MVP priority:** P2/P3.

---

### 7.9 Thread2Test Arena

**Purpose:** Convert messy user feedback into failing tests and verified fixes.

**Input:**
- Pasted feedback thread.
- Support ticket.
- GitHub issue.
- Reddit/Discord/App Store-style comments.

**BrowserPod role:**
- Load sample app.
- Generate candidate failing tests.
- Run tests.
- Identify reproducible bug.
- Patch and verify.

**MVP priority:** P3 because social ingestion can distract from core demo.

---

### 7.10 AgentBench Arena

**Purpose:** Benchmark multiple AI agent strategies on the same task.

**Input:**
- Coding challenge / bug.
- Agent strategies.

**BrowserPod role:**
- Give each agent a separate pod.
- Run the same tests.
- Compare speed, correctness, risk, and patch size.

**MVP priority:** P3 / stretch.

---

## 8. Recommended Hackathon Scope

### Build now

1. **ForkLab landing page**
2. **How it works page**
3. **Sprint workspace**
4. **Three pod cards**
5. **Sample repo data model**
6. **BrowserPod integration prototype**
7. **Agent patch loop**
8. **Test/build terminal logs**
9. **Final comparison report**
10. **Exportable PR summary**

### Use existing `v0-delt` repo

The existing `v0-delt` repo is a good starting point because it already has:

- Next.js App Router.
- React 19.
- TypeScript.
- Tailwind CSS.
- v0-generated UI.
- public landing page.
- dashboard.
- how-it-works page.
- run detail page.
- split-screen editor.
- approval queue.
- settings/integrations.
- API route patterns.
- mock run state machine.
- Vercel deployment flow.

Instead of starting from scratch, ForkLab should **fork and repurpose `v0-delt`**.

### Replace / repurpose

| Existing delt concept | ForkLab concept |
|---|---|
| Documentation drift run | Sandbox sprint run |
| PR changed files | Issue/task files |
| MCP evidence cards | BrowserPod execution proof cards |
| Split-screen docs editor | Code diff + branch comparison |
| Approval queue | Patch acceptance queue |
| GitHub issue publish | Export patch/report |
| Context7 integration status | BrowserPod status/integration status |

---

## 9. Core MVP Architecture

```text
ForkLab Web App
│
├── Next.js App Router frontend
│   ├── Landing page
│   ├── How It Works
│   ├── Sprint Dashboard
│   ├── Pod Workspace
│   ├── Branch Comparison
│   └── Export Report
│
├── Client-side BrowserPod layer
│   ├── boot pod
│   ├── create files
│   ├── run commands
│   ├── stream terminal output
│   ├── read generated results
│   └── destroy/reset pod
│
├── AI Orchestrator
│   ├── choose task strategy
│   ├── request patch from model
│   ├── parse patch
│   ├── retry with terminal output
│   └── judge branch results
│
├── Sample Repo Fixtures
│   ├── package.json
│   ├── src files
│   ├── tests
│   └── known failing bugs
│
└── Export Layer
    ├── final report
    ├── patch summary
    ├── copy PR description
    └── optional GitHub issue/PR later
```

---

## 10. Data Model

### Sprint

```ts
type Sprint = {
  id: string;
  title: string;
  description: string;
  mode: ForkLabMode;
  status: "idle" | "booting" | "running" | "comparing" | "complete" | "failed";
  createdAt: string;
  completedAt?: string;
  tasks: SprintTask[];
  branches: BranchRun[];
  finalReport?: SprintReport;
};
```

### ForkLabMode

```ts
type ForkLabMode =
  | "bug-fix-arena"
  | "docs-proof-arena"
  | "package-guard-arena"
  | "upgrade-pilot-arena"
  | "api-forge-arena"
  | "data-plot-arena"
  | "interview-arena"
  | "frontend-variant-arena"
  | "thread-to-test-arena"
  | "agent-bench-arena";
```

### SprintTask

```ts
type SprintTask = {
  id: string;
  title: string;
  description: string;
  issueType: "bug" | "docs" | "package" | "upgrade" | "api" | "data" | "interview" | "frontend" | "feedback" | "benchmark";
  relevantFiles: string[];
  testCommand: string;
  buildCommand?: string;
  expectedOutcome: string;
};
```

### BranchRun

```ts
type BranchRun = {
  id: string;
  sprintId: string;
  podId?: string;
  label: string;
  strategy: string;
  taskId: string;
  status:
    | "queued"
    | "booting"
    | "files-written"
    | "test-failing"
    | "patching"
    | "verifying"
    | "passed"
    | "failed";
  terminalLogs: TerminalEvent[];
  changedFiles: ChangedFile[];
  testResult?: TestResult;
  buildResult?: BuildResult;
  score?: BranchScore;
  retryCount: number;
};
```

### TerminalEvent

```ts
type TerminalEvent = {
  id: string;
  branchId: string;
  timestamp: string;
  command?: string;
  output: string;
  stream: "stdout" | "stderr" | "system";
};
```

### ChangedFile

```ts
type ChangedFile = {
  path: string;
  before: string;
  after: string;
  diff: string;
};
```

### TestResult

```ts
type TestResult = {
  command: string;
  passed: boolean;
  totalTests?: number;
  passedTests?: number;
  failedTests?: number;
  durationMs?: number;
  summary: string;
};
```

### BranchScore

```ts
type BranchScore = {
  correctness: number;
  maintainability: number;
  risk: number;
  speed: number;
  uxImpact?: number;
  explanation: string;
};
```

### SprintReport

```ts
type SprintReport = {
  winnerBranchId?: string;
  summary: string;
  totalBranches: number;
  passedBranches: number;
  failedBranches: number;
  recommendation: string;
  prSummary: string;
};
```

---

## 11. Key Screens

### 11.1 Landing Page

Purpose:
Explain ForkLab instantly.

Hero copy:
> Parallel AI branches. Verified in browser sandboxes.

CTA:
- Start sample sprint
- View how it works

Show:
- 3 pods animation
- failing → passing tests
- BrowserPod badge
- “No local install required”

---

### 11.2 How It Works

Six-step flow:

1. Pick a repo/task.
2. ForkLab launches isolated BrowserPod sandboxes.
3. AI agents create solution branches.
4. Each branch runs tests/builds.
5. ForkLab compares verified results.
6. User exports the winning patch/report.

---

### 11.3 Sprint Dashboard

Show:
- sample repo details
- issue list
- modes list
- sprint history
- “Start 3-Issue Sprint” CTA

---

### 11.4 Pod Workspace

Core screen.

Layout:
- Left: issue/task list.
- Center: 3 pod cards.
- Right: AI judge panel.
- Bottom: terminal/log drawer.

Each pod card:
- status indicator
- strategy
- terminal preview
- test result
- changed files
- retry count
- view diff button

---

### 11.5 Branch Comparison

Show:
- pass/fail table
- test/build result
- changed files count
- risk score
- maintainability score
- recommended winner

---

### 11.6 Patch Review / Export

Show:
- combined patch summary
- final report
- copy PR body
- download report
- optional GitHub issue creation later

---

## 12. API / Function Design

BrowserPod runs client-side, so most pod control should happen in browser/client components. The backend can handle AI calls and optional persistence.

### API routes

```text
POST /api/agent/patch
POST /api/agent/judge
GET  /api/sprints
POST /api/sprints/sample
GET  /api/sprints/[sprintId]
POST /api/sprints/[sprintId]/report
```

### Client-side BrowserPod utilities

```ts
bootPod(branchId: string): Promise<PodSession>
writeSampleRepoToPod(pod: PodSession, fixture: SampleRepoFixture): Promise<void>
runCommandInPod(pod: PodSession, command: string, args: string[]): Promise<CommandResult>
applyPatchToPod(pod: PodSession, patch: FilePatch[]): Promise<void>
readFileFromPod(pod: PodSession, path: string): Promise<string>
destroyPod(pod: PodSession): Promise<void>
```

---

## 13. AI Orchestration

### MVP model strategy

Use a free/available model for:

1. generating a patch from:
   - issue text,
   - relevant file contents,
   - failing test output.

2. judging branches from:
   - test results,
   - changed files,
   - diff summary.

### Reliability strategy

For hackathon stability:

- Use tiny sample repo.
- Provide deterministic fallback patches.
- Limit each branch to one retry.
- Keep prompts constrained.
- Use relevant file contents only.
- Do not ask the AI to solve the entire repo.
- If the AI fails, show fallback mode clearly:
  > “Fallback patch applied for demo reliability.”

---

## 14. BrowserPod Integration Plan

### P0 integration

- Boot one pod.
- Write sample repo files.
- Run `npm test`.
- Stream logs to UI.
- Apply known patch.
- Rerun test.

### P1 integration

- Boot 3 pods.
- Run 3 branches in parallel.
- Apply AI-generated patches.
- Compare results.

### P2 integration

- Clone sample repo via `git clone`.
- Run dev server / preview.
- Use portals for live preview if time allows.

### Required BrowserPod actions

- `boot`
- `run`
- `createDirectory`
- `createFile`
- `openFile`
- `createDefaultTerminal`

---

## 15. Sample Repo Specification

### Recommended starter sample repo type

Use a tiny **Vite + React + Vitest** repo or a plain **Node + Vitest** repo.

### Minimal package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "build": "tsc --noEmit"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "typescript": "latest",
    "vitest": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {}
}
```

### Alternative for speed

Use plain TypeScript utility functions with Vitest only. Add React UI bug later.

This is much more reliable for BrowserPod.

---

## 16. Success Metrics

### Demo success

- 3 pods boot.
- 3 tasks run.
- At least 2 branches pass.
- Terminal logs are visible.
- Final report is generated.
- BrowserPod role is obvious in first 30 seconds.

### Product success

- User understands value without explanation.
- The app clearly proves outputs, not just generates them.
- It feels safer than running AI code locally.
- It makes parallel AI experimentation feel natural.

---

## 17. Risks and Mitigations

### Risk: BrowserPod setup takes too long
Mitigation:
- Start with BrowserPod quickstart.
- Implement one-pod proof before multi-pod.
- Use small fixtures.

### Risk: npm install slow
Mitigation:
- Use tiny dependency set.
- Prefer plain Node/Vitest sample first.
- Cache/preload fixture files where possible.
- Keep demo commands short.

### Risk: AI patch fails live
Mitigation:
- Use deterministic fallback patches.
- Make AI-generated patch a progressive enhancement.
- Keep issue scope tiny.

### Risk: existing `v0-delt` frontend has too much old product language
Mitigation:
- Rename and repurpose components.
- Keep layout shell but replace content.

### Risk: scope creep across all 10 modes
Mitigation:
- Implement only Parallel Bug Fix Arena.
- Show other modes as templates/roadmap cards.

---

## 18. Safety / Academic Integrity

ForkLab should not position itself as a tool to generate complete coursework submissions.

For PDF/coursework inputs, use educational scaffolding only:

- project breakdown,
- starter structure,
- tests,
- rubric,
- hints,
- variations of approach,
- explanation.

Avoid:
- “generate complete assignment solution,”
- “bypass assessment,”
- “submit-ready coursework.”

---

## 19. Hackathon Demo Script

1. Open ForkLab landing page.
2. Say:
   > “AI coding tools give one answer. ForkLab runs multiple AI branches in isolated browser sandboxes and proves which one works.”
3. Click **Start Sample Sprint**.
4. Show 3 issues in the sample repo.
5. Click **Launch 3 Pods**.
6. Point out:
   - Pod A, Pod B, Pod C booting.
   - Terminal logs.
   - Tests failing.
7. Show AI patching phase.
8. Show tests rerunning.
9. Show pass/fail comparison.
10. Show final recommendation.
11. Export PR summary.
12. End with:
   > “BrowserPod is the execution layer. The AI does not just answer — it experiments safely inside the browser.”

---

## 20. Implementation Milestones

### Milestone 1 — Repo conversion

- Clone `v0-delt`.
- Rename product to ForkLab.
- Replace delt-specific copy.
- Preserve layout/components.

### Milestone 2 — Static Sprint UI

- Add 10 mode cards.
- Add sample sprint page.
- Add 3 pod cards.
- Add static logs and comparison.

### Milestone 3 — One BrowserPod proof

- Boot one pod.
- Write sample files.
- Run a test.
- Stream output.

### Milestone 4 — Patch loop

- Apply deterministic patch.
- Rerun test.
- Show pass.

### Milestone 5 — Three-pod parallel sprint

- Boot 3 pods.
- Run branch-specific tests.
- Show comparison.

### Milestone 6 — AI integration

- Call model to generate patch.
- Fallback if invalid.

### Milestone 7 — Polish and demo

- Add animations.
- Add final report.
- Ensure deployment works.
- Prepare script.

---

## 21. Open Questions

1. Can BrowserPod run the chosen test stack quickly enough in three pods?
2. Which model is available/free during the hackathon?
3. Will the sponsor provide BrowserPod API credits/API key?
4. Can we use BrowserPod Portals for live preview within time?
5. Should final export be a downloadable patch, copied PR body, or GitHub issue?
6. Should we keep the `delt` visual identity or fully rebrand?

---

## 22. Recommended Final MVP Statement

**ForkLab Sprint is a BrowserPod-powered AI workbench that launches multiple isolated coding agents in parallel, runs each generated fix inside a browser sandbox, and compares verified test results so users can trust the best solution.**

