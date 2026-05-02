import Link from "next/link";
import { BranchCard } from "@/components/BranchCard";
import { ModeCard } from "@/components/ModeCard";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">AI in the Box · University of Leeds</p>
          <h1>Parallel AI branches. Verified in browser sandboxes.</h1>
          <p className="lead">
            ForkLab gives every AI coding branch its own disposable BrowserPod
            sandbox, runs real tests, and compares verified fixes before you accept
            them.
          </p>
          <div className="actions">
            <Link href="/sandbox-test" className="button primary">
              Run BrowserPod Smoke Test
            </Link>
            <Link href="/sprint" className="button">
              Start Sample Sprint
            </Link>
          </div>
        </div>

        <div className="panel stack">
          <div className="status-row">
            <span className="badge ok">BrowserPod-first demo</span>
            <span className="badge">Demo Safe Mode ON</span>
          </div>
          <h2 style={{ marginBottom: 0 }}>Live execution spine</h2>
          <p style={{ color: "var(--soft)", lineHeight: 1.55 }}>
            The current build starts with one real pod: boot, write files, run Node,
            watch tests fail, patch deterministically, and prove the pass.
          </p>
          <div className="terminal-panel">
            <div className="terminal-title">
              <span>forklab-live-plan</span>
              <span>3-5 minute demo</span>
            </div>
            <div className="terminal-body">
              <pre className="terminal-lines">{`$ boot BrowserPod
$ write /forklab/src/exportCsv.js
$ node tests/test-exportCsv.js
not ok 1 - normalizes CSV export filenames
$ apply deterministic patch
$ node tests/test-exportCsv.js
ok 1 - normalizes CSV export filenames`}</pre>
            </div>
          </div>
        </div>
      </section>

      <section className="stack">
        <div>
          <p className="eyebrow">Branch arena</p>
          <h2>Small reliable proof first, wider arena next.</h2>
        </div>
        <div className="grid three">
          <BranchCard
            title="Sidebar Fix"
            status="Queued"
            description="Planned branch for mobile navigation state."
          />
          <BranchCard
            title="CSV Export Fix"
            status="Verified"
            live
            description="The live BrowserPod branch used by the sample sprint."
          />
          <BranchCard
            title="Email Validation Fix"
            status="Queued"
            description="Planned branch for signup validation coverage."
          />
        </div>
      </section>

      <section className="stack" style={{ marginTop: 42 }}>
        <div>
          <p className="eyebrow">Roadmap modes</p>
          <h2>Built around sandboxed proof.</h2>
        </div>
        <div className="grid three">
          <ModeCard
            label="P0"
            title="Parallel Bug Fix Arena"
            description="Multiple branches attempt fixes, then tests decide what survives."
          />
          <ModeCard
            label="Fallback"
            title="BugBox Mode"
            description="One excellent BrowserPod bug fixer that proves fail to patch to pass."
          />
          <ModeCard
            label="Next"
            title="DocsProof Arena"
            description="Run docs snippets in disposable pods and repair broken examples."
          />
        </div>
      </section>
    </main>
  );
}
