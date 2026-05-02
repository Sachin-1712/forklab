import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <div className="stack">
      <header className="page-header">
        <p className="eyebrow">How It Works</p>
        <h1>BrowserPod is the execution layer.</h1>
        <p>
          ForkLab keeps generated code out of the local machine. The outer Next.js
          app controls the demo, while BrowserPod boots a disposable runtime inside
          the browser and runs the code that proves each branch.
        </p>
      </header>

      {/* ── Steps ──────────────────────────────────────────────── */}
      <section className="grid two">
        <div className="feature-card">
          <span className="feature-number">1</span>
          <h3>Boot a pod</h3>
          <p style={{ color: "var(--outline)", marginBottom: 0, fontSize: 13 }}>
            The client component loads @leaningtech/browserpod and boots Node 22
            with the public BrowserPod key. SharedArrayBuffer and cross-origin
            isolation headers are required.
          </p>
        </div>
        <div className="feature-card">
          <span className="feature-number">2</span>
          <h3>Write project files</h3>
          <p style={{ color: "var(--outline)", marginBottom: 0, fontSize: 13 }}>
            ForkLab writes a tiny sample project into the pod filesystem with
            BrowserPod file primitives — createDirectory, createFile, write.
          </p>
        </div>
        <div className="feature-card">
          <span className="feature-number">3</span>
          <h3>Run real tests</h3>
          <p style={{ color: "var(--outline)", marginBottom: 0, fontSize: 13 }}>
            Node runs inside the sandbox, streams terminal output, and exposes the
            failure before any patch is applied. This is real execution, not
            simulated.
          </p>
        </div>
        <div className="feature-card">
          <span className="feature-number">4</span>
          <h3>Patch and prove</h3>
          <p style={{ color: "var(--outline)", marginBottom: 0, fontSize: 13 }}>
            The first version uses deterministic fallback patching so the hackathon
            demo completes even before AI patching is added. The test must pass
            after the patch.
          </p>
        </div>
      </section>

      {/* ── Architecture ───────────────────────────────────────── */}
      <section className="panel" style={{ marginTop: 8 }}>
        <div className="status-row" style={{ marginBottom: 12 }}>
          <span className="badge ok">Architecture</span>
        </div>
        <div className="grid two" style={{ gap: 16 }}>
          <div>
            <h3>Outer Shell (Next.js)</h3>
            <p style={{ color: "var(--outline)", fontSize: 13, lineHeight: 1.6, marginBottom: 0 }}>
              The Next.js app provides the UI, navigation, and state management.
              It orchestrates BrowserPod lifecycle — boot, write, execute, read
              results — but never runs untrusted code on the host.
            </p>
          </div>
          <div>
            <h3>Inner Sandbox (BrowserPod)</h3>
            <p style={{ color: "var(--outline)", fontSize: 13, lineHeight: 1.6, marginBottom: 0 }}>
              BrowserPod provides a real POSIX filesystem and Node.js runtime
              inside the browser tab. Each pod is ephemeral — destroyed after the
              sprint ends. Code runs in total isolation via SharedArrayBuffer.
            </p>
          </div>
        </div>
      </section>

      {/* ── Demo Safe Mode ─────────────────────────────────────── */}
      <section className="panel">
        <h2>Demo Safe Mode</h2>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
          Safe Mode is on by default in the current proof. BrowserPod execution is
          real when a valid key and COOP/COEP headers are present. AI patching is
          replaced with a known patch for the CSV export bug, and fallback copy makes
          BrowserPod failures actionable instead of mysterious.
        </p>
        <div className="actions" style={{ justifyContent: "flex-start" }}>
          <Link href="/sandbox-test" className="button primary">
            ▶ Run smoke test
          </Link>
          <Link href="/sprint" className="button">
            Run sample sprint
          </Link>
        </div>
      </section>
    </div>
  );
}
