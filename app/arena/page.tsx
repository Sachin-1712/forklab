"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  branchPath,
  createRunId,
  createRunSnapshot,
  createSidebarArenaBranchList,
  publishRunEvent,
  runPath,
  saveRunSnapshot,
} from "@/lib/runEvents";
import { sidebarArenaVariants } from "@/lib/sidebarArena";

const arenaPrompt = "Fix the sidebar toggle bug in this sample React app.";

export default function ArenaPage() {
  const router = useRouter();

  function launchArena() {
    const runId = createRunId();
    const branches = createSidebarArenaBranchList();
    let tabsBlocked = false;

    saveRunSnapshot(
      runId,
      createRunSnapshot({
        runId,
        prompt: arenaPrompt,
        branches,
        mode: "sidebar-arena",
      }),
    );

    publishRunEvent(runId, {
      type: "run.created",
      message:
        "Parallel Sidebar Bug Arena created: Minimal, Robust, and UX Polish branches.",
      terminalLine: "$ run.created parallel-sidebar-arena",
    });

    branches.forEach((branch) => {
      const opened = window.open(
        `${branchPath(runId, branch.id)}?autostart=1`,
        "_blank",
      );
      if (!opened) tabsBlocked = true;
    });

    if (tabsBlocked) {
      publishRunEvent(runId, {
        type: "branch.failed",
        message:
          "One or more branch tabs were blocked. Open branches manually from the dashboard.",
        terminalLine: "$ popup blocked for one or more branches",
      });
    }

    router.push(runPath(runId));
  }

  return (
    <div className="arena-shell">
      <header className="workbench-hero">
        <div>
          <p className="eyebrow">Parallel AI Solution Arena</p>
          <h1>Run 3 AI approaches side-by-side.</h1>
          <p className="muted-copy">
            ForkLab launches three isolated BrowserPod branches for one sidebar
            bug, runs each solution, compares proof, and recommends the best
            verified result.
          </p>
        </div>
        <div className="status-row">
          <span className="badge ok">3 BrowserPod branches</span>
          <span className="badge info">Same task</span>
          <span className="badge warn">Winner by proof</span>
        </div>
      </header>

      <section className="proof-banner">
        Parallel AI branches. Verified in browser sandboxes.
      </section>

      <div className="arena-layout">
        <section className="card stack">
          <div>
            <p className="eyebrow">Task input</p>
            <h2>Sample sidebar bug</h2>
            <p className="muted-copy">
              The sidebar reducer keeps the mobile menu open after route
              navigation. Each branch receives the same buggy starter file,
              asks the configured LLM for a patch using its own strategy
              directive, and proves the fix in BrowserPod.
            </p>
          </div>
          <div className="prompt-box">
            <textarea
              aria-label="Arena task prompt"
              readOnly
              value={arenaPrompt}
            />
            <div className="prompt-actions">
              <button className="button primary" type="button" onClick={launchArena}>
                Launch 3 BrowserPod branches
              </button>
              <Link className="button" href="/workbench">
                Open enterprise workbench
              </Link>
            </div>
            <p className="prompt-helper">
              The browser may ask to allow popups because ForkLab opens one tab
              per BrowserPod branch.
            </p>
          </div>
        </section>

        <section className="card stack">
          <div>
            <p className="eyebrow">Comparison plan</p>
            <h2>Winner criteria</h2>
          </div>
          <div className="artifact-list">
            <div>
              <span>Correctness</span>
              <strong>tests pass</strong>
            </div>
            <div>
              <span>Maintainability</span>
              <strong>small clear patch</strong>
            </div>
            <div>
              <span>Risk</span>
              <strong>limited behavior change</strong>
            </div>
            <div>
              <span>UX impact</span>
              <strong>navigation quality</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="truth-panel">
        <div>
          <p className="eyebrow">Branch strategies</p>
          <h2>Same bug, three approaches</h2>
        </div>
        <div className="agent-grid">
          {sidebarArenaVariants.map((variant) => (
            <article className="agent-card" key={variant.id}>
              <div className="status-row">
                <span className="badge info">{variant.agentStyle}</span>
              </div>
              <h3>{variant.title}</h3>
              <p>{variant.strategy}</p>
              <div className="agent-meta">
                <div>
                  <span>What it tries</span>
                  <strong>{variant.summary}</strong>
                </div>
              </div>
              <pre className="agent-terminal">{`$ npm test
FAIL route change closes sidebar
$ node applyPatch.js
$ npm test
PASS all checks
$ npm run build
PASS preview artifact`}</pre>
            </article>
          ))}
        </div>
      </section>

      <section className="truth-panel">
        <div>
          <p className="eyebrow">What is real?</p>
          <h2>Execution boundary</h2>
        </div>
        <div className="truth-grid">
          <TruthItem
            label="Real"
            text="Each branch opens a tab and boots its own BrowserPod instance."
          />
          <TruthItem
            label="Real"
            text="Each branch writes files, runs failing tests, applies its patch, reruns tests, and runs a build script."
          />
          <TruthItem
            label="Real"
            text="The dashboard compares real branch events and only marks verified after tests pass."
          />
          <TruthItem
            label="Preview"
            text="Frontend visual previews are HTML artifacts, not full React dev-server portals yet."
          />
        </div>
      </section>
    </div>
  );
}

function TruthItem({ label, text }: { label: string; text: string }) {
  const tone = label === "Real" ? "ok" : label === "Preview" ? "info" : "warn";

  return (
    <div className="card">
      <span className={`badge ${tone}`}>{label}</span>
      <p className="truth-copy">{text}</p>
    </div>
  );
}
