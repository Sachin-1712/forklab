# ForkLab

ForkLab is a hackathon demo for the University of Leeds “AI in the Box” event.
It shows how AI coding branches can be verified inside disposable browser
sandboxes before a developer trusts the patch.

## Why BrowserPod is central

BrowserPod is the execution layer. ForkLab’s Next.js app is only the outer
control UI; BrowserPod boots inside the browser, receives files, runs Node, and
streams terminal output. The first proof path is intentionally small:

1. Boot BrowserPod.
2. Write a JavaScript file into the pod filesystem.
3. Run Node inside the pod.
4. Display terminal output in the UI.

The sample sprint then expands that into a deterministic bug-fix loop:

1. Write a tiny CSV export project into BrowserPod.
2. Run a failing Node test.
3. Apply a known patch.
4. Rerun the test and show a passing proof report.

## Local setup

Install dependencies:

```bash
npm install
```

Create a BrowserPod key from [console.browserpod.io](https://console.browserpod.io).
For local development, restrict the key origin to:

```text
http://localhost:3000
```

Copy the example env file and paste your key:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```text
NEXT_PUBLIC_BROWSERPOD_API_KEY=your_browserpod_key
```

Never commit real keys. `.env.local` and other local env files are ignored by
`.gitignore`.

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Required BrowserPod headers

BrowserPod uses `SharedArrayBuffer`, so the app must be cross-origin isolated.
`next.config.ts` sets these headers for every route:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Permissions-Policy: cross-origin-isolated=(self)
```

Local BrowserPod testing should use `http://localhost:3000`.

## Demo flow

1. Open `/sandbox-test`.
2. Click **Run BrowserPod Smoke Test**.
3. Confirm BrowserPod boots, writes `test.js`, runs Node, and prints:
   `ForkLab BrowserPod smoke test` and `4`.
4. Open `/sprint`.
5. Click **Start Sample Sprint**.
6. Watch the live CSV Export Fix branch fail a test, apply the deterministic
   patch, rerun tests, and generate a proof report.

The live demo should complete in 3-5 minutes once the BrowserPod key is present.

## Demo script

**0:00 Landing page: problem**  
Open `/` and explain the core problem: AI code is easy to generate, but hard to
trust until it has been executed somewhere safe.

**0:30 `/sandbox-test`: BrowserPod proof**  
Open `/sandbox-test`, point at the isolation debug panel, then run the smoke test.
The proof is BrowserPod booting, writing `test.js`, running Node, and printing
`ForkLab BrowserPod smoke test` plus `4`.

**1:30 `/sprint`: fail -> patch -> pass**  
Open `/sprint` and start the sample sprint. The live CSV Export Fix branch writes
a tiny repo, runs `node tests/test-exportCsv.js`, shows the failing filename
assertion, applies the deterministic patch, reruns the same test, and passes.

**3:00 Branch cards: parallel sprint vision**  
Show the three branch cards. Only CSV Export Fix is live in this build; Sidebar
Fix and Email Validation Fix are queued placeholders for the later parallel mode.

**4:00 Why BrowserPod matters**  
Close by showing the terminal logs, diff, files changed, proof report, and PR
summary placeholder. The point is not that AI guessed a patch. The point is that
ForkLab treats generated code as untrusted until BrowserPod verifies it.

## Backup plan and fallback modes

ForkLab follows the backup ladder in `backup_plan.md`:

- Plan A: three real BrowserPod branches.
- Plan B: sequential multi-branch sprint.
- Plan C: one real BrowserPod branch plus clearly labelled simulated branches.
- Plan D: BugBox mode, one excellent fail → patch → pass proof.
- Plan F: execution visualizer only if BrowserPod is blocked.

The current implementation prioritizes Plan D as the reliable spine, then shows
the visual shell for the later three-branch expansion. Demo Safe Mode is on by
default: BrowserPod execution is real when available, while patching is
deterministic so the demo is not dependent on AI or network calls.

## Useful commands

```bash
npm run typecheck
npm run build
```
