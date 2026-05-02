# ForkLab Backup Plan

## Purpose

ForkLab's full vision is ambitious: run multiple AI coding agents in multiple BrowserPod sandboxes, patch a sample repo in parallel, run tests/builds, compare outputs, and recommend the best verified solution.

This backup plan exists so the project can still be finished, demoed, and judged positively even if:

- BrowserPod integration takes longer than expected.
- Multiple concurrent pods become slow or unstable.
- Free model quality is inconsistent.
- Repo cloning or dependency installation becomes unreliable.
- The team runs out of time before full parallel execution is complete.

The core principle is:

> Always keep the BrowserPod execution proof visible. The MVP can shrink, but it must still show code running safely inside a browser sandbox.

---

## Final Product Goal

**ForkLab Sprint**  
**Tagline:** Parallel AI coding agents, verified in browser sandboxes.

A user opens the app, starts a sample sprint, and sees AI agents attempt to fix sample repo issues inside BrowserPod-powered environments. The UI shows branch cards, terminal logs, code diffs, tests/build results, and a final comparison report.

---

## Success Ladder

### Plan A — Full ForkLab Sprint

**Goal:** Three issues, three BrowserPod instances, three AI agents, parallel or near-parallel execution.

**Demo flow:**

1. User clicks **Start Sample Sprint**.
2. App launches three sandbox branches:
   - Sidebar Fix
   - CSV Export Fix
   - Email Validation Fix
3. Each branch boots its own BrowserPod sandbox.
4. Each branch receives relevant files and task prompt.
5. AI generates a patch.
6. BrowserPod runs tests/build for each branch.
7. Failed branch retries once.
8. App displays final comparison report.
9. User exports patch/report.

**BrowserPod role:**

- One pod per branch.
- Real terminal output.
- Real test/build execution.
- Sandboxed branch isolation.

**Build only if:**

- Single BrowserPod execution works reliably.
- AI patch loop works for at least one issue.
- Time remains for multi-branch orchestration.

---

### Plan B — Sequential Multi-Branch Sprint

**Goal:** Same UI as Plan A, but branches run one after another instead of all at once.

**Why this is a strong fallback:**  
It still looks like a parallel AI branch product, but avoids performance risks from booting three pods at the same time.

**Demo flow:**

1. App shows three branch cards.
2. Pod A runs and completes.
3. Pod B runs and completes.
4. Pod C runs and completes.
5. Final comparison report appears.

**BrowserPod role:**

- One BrowserPod reused or recreated per branch.
- Real execution still happens.
- UI can show **Queued → Running → Verified**.

**Use this if:**

- Multiple concurrent pods are unstable.
- Browser becomes slow.
- npm installs take too long.

---

### Plan C — One Real Pod + Two Simulated Branches

**Goal:** One branch runs for real in BrowserPod; two branch cards use pre-recorded/simulated logs.

**Why this is acceptable for a hackathon fallback:**  
The project still demonstrates real BrowserPod execution, while showing the intended product vision.

**Demo flow:**

1. Branch A runs live in BrowserPod.
2. Branch B and C show realistic static logs, diffs, and scores.
3. UI clearly labels live vs simulated if asked.
4. Final report compares all branches.

**BrowserPod role:**

- One real verified execution.
- Proves the core technical idea.

**Use this if:**

- Full multi-pod implementation is too risky.
- BrowserPod API integration works only for one instance.
- Time is limited.

**Important honesty rule:**  
Do not claim all branches are live if only one is live. Say:  
**“The current build runs one branch live and includes simulated branch cards to show the intended parallel expansion.”**

---

### Plan D — BugBox Mode

**Goal:** Drop multi-branch comparison and ship one excellent AI bug fixer.

**Demo flow:**

1. User picks one sample bug.
2. BrowserPod boots sample repo.
3. App runs failing test.
4. AI proposes patch or app applies prepared patch.
5. BrowserPod re-runs tests.
6. Test passes.
7. App generates proof report.

**BrowserPod role:**

- Central and obvious.
- Terminal logs show **fail → patch → pass**.

**Use this if:**

- Multi-branch UI becomes too complex.
- AI orchestration is unreliable.
- Need a clean, stable demo fast.

**Pitch:**  
**“ForkLab’s first mode is BugBox: a browser-sandboxed AI bug fixer that proves every patch before you trust it.”**

---

### Plan E — DocsProof Mode

**Goal:** Instead of fixing app bugs, run documentation code snippets inside BrowserPod and verify/fix broken examples.

**Demo flow:**

1. App loads a fake SDK docs page.
2. AI extracts code snippets.
3. BrowserPod runs snippet 1: pass.
4. BrowserPod runs snippet 2: fail.
5. AI patches the snippet.
6. BrowserPod re-runs: pass.
7. App outputs a docs patch.

**BrowserPod role:**

- Runs code snippets from docs.
- Proves the docs are correct.

**Use this if:**

- App repo testing is too hard.
- Need a simpler sample environment.
- Want a strong B2B developer-tool story.

**Pitch:**  
**“DocsProof keeps developer docs honest by running examples in a browser sandbox.”**

---

### Plan F — BrowserPod Theater / Execution Visualizer

**Goal:** If BrowserPod integration cannot be completed, ship a polished interactive prototype that explains and simulates the execution pipeline.

**Demo flow:**

1. User starts sample sprint.
2. UI animates BrowserPod boot, terminal logs, patches, tests, and comparison.
3. App includes architecture diagram, planned integration, and code scaffolding.
4. If possible, include one small real BrowserPod command such as `node --version` or a trivial script run.

**Use this only if:**

- BrowserPod API access, credits, or setup blocks real implementation.
- Time is almost gone.

**Honesty rule:**  
Present this as a prototype, not a fully working sandbox.

---

## Minimum Shippable Version

If everything goes wrong, the project should still ship:

1. Landing page.
2. **Start Sample Sprint** button.
3. Three branch cards.
4. One live BrowserPod terminal running a small test.
5. One code diff.
6. Final comparison/proof report.
7. Clear explanation of the product vision.

---

## First Thing to Focus On

The first thing to get right is **not** AI generation. It is:

> Can the app boot BrowserPod, write or load a tiny project, run a command, and stream terminal output into the UI?

This is the atomic proof of the whole project.

### First technical milestone

Build a page called `/sandbox-test`.

It should:

1. Boot BrowserPod.
2. Create a small file, for example `sum.js`.
3. Create a tiny test or script.
4. Run `node sum.js` or `npm test`.
5. Stream output into a terminal panel.
6. Show status: **Booting → Running → Passed**.

Only after this works should the team add:

- AI patch generation.
- Multi-branch UI.
- Parallel pods.
- Repo cloning.
- Export reports.

---

## Suggested Implementation Order

### Step 1 — UI repurpose

Use the existing `v0-delt` frontend:

- Rename product to ForkLab.
- Replace DocSync-style copy with ForkLab Sprint.
- Convert existing run/detail screens into sprint/branch screens.
- Add branch cards and terminal panels.

### Step 2 — BrowserPod smoke test

Create `/sandbox-test`:

- Boot BrowserPod.
- Run a tiny command.
- Display logs.

### Step 3 — Sample repo fixture

Add a tiny sample project under `/fixtures/sample-sidebar-app` or generate files in BrowserPod at runtime.

Suggested issues:

- Sidebar toggle bug.
- CSV filename sanitization bug.
- Email validation bug.

### Step 4 — One live branch

Implement one branch end to end:

- Load fixture.
- Run failing test.
- Apply known patch or AI-generated patch.
- Re-run test.
- Show pass.

### Step 5 — Three branch UI

Add three branch cards:

- Run sequentially first.
- Upgrade to concurrent only if stable.

### Step 6 — AI integration

Add a free/available AI model:

- Give it only the relevant issue and files.
- Ask for a patch in a strict JSON format.
- Validate output before writing files.
- Keep fallback patches ready.

### Step 7 — Final comparison report

Compare branches by:

- Test status.
- Build status.
- Files changed.
- Retry count.
- Risk.
- Explanation clarity.
- Recommended winner.

---

## Recommended Demo Script

1. “ForkLab gives each AI agent a disposable computer inside the browser.”
2. Click **Start Sample Sprint**.
3. Show three issues.
4. Show BrowserPod booting.
5. Show live terminal output.
6. Show one failing test.
7. Show AI patch/diff.
8. Show passing test.
9. Show final comparison report.
10. Say: **“We don’t trust AI output until it runs.”**

---

## What Not To Build First

Avoid these until the core works:

- Arbitrary GitHub repo cloning.
- Private repo OAuth.
- Real pull request creation.
- Full cloud backend.
- Multiple languages.
- Full visual app preview testing.
- Complex agent memory.
- Real coursework/PDF generation mode.

---

## Backup Pitch Options

### If full ForkLab works

**“ForkLab runs multiple AI coding agents in parallel browser sandboxes and compares verified results.”**

### If only one pod works

**“ForkLab’s first mode, BugBox, proves AI-generated patches by running them in BrowserPod before users trust them.”**

### If docs mode works better

**“ForkLab’s DocsProof mode keeps documentation honest by running code snippets in a browser sandbox and fixing broken examples.”**

### If prototype only

**“ForkLab is a prototype for parallel AI sandboxes. This build demonstrates the interface and one BrowserPod execution path.”**

---

## Decision Gates

### After 4 hours

If BrowserPod cannot boot and run a tiny command, move to Plan F while continuing integration in parallel.

### After 8 hours

If one live branch does not work, reduce to BrowserPod smoke test + simulated branch flow.

### After 12 hours

If AI patching is unreliable, use deterministic fallback patches and present AI generation as optional.

### Final 3 hours

Stop adding features. Polish:

- landing page
- demo script
- terminal visibility
- final report
- screenshots
- failure fallback states

---

## Final Rule

Do not chase breadth. The winning demo is:

> One real sandboxed execution path, shown clearly, with a polished product story.

If judges see BrowserPod boot, run code, fail, patch, and pass, the project will feel real.
