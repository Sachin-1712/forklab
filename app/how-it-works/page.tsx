import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <main className="stack">
      <header className="page-header">
        <p className="eyebrow">How it works</p>
        <h1>BrowserPod is the execution layer.</h1>
        <p>
          ForkLab keeps generated code out of the local machine. The outer Next.js
          app controls the demo, while BrowserPod boots a disposable runtime inside
          the browser and runs the code that proves each branch.
        </p>
      </header>

      <section className="grid two">
        <div className="card">
          <span className="badge ok">1</span>
          <h3 style={{ marginTop: 14 }}>Boot a pod</h3>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            The client component loads @leaningtech/browserpod and boots Node 22
            with the public BrowserPod key.
          </p>
        </div>
        <div className="card">
          <span className="badge ok">2</span>
          <h3 style={{ marginTop: 14 }}>Write project files</h3>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            ForkLab writes a tiny sample project into the pod filesystem with
            BrowserPod file primitives.
          </p>
        </div>
        <div className="card">
          <span className="badge ok">3</span>
          <h3 style={{ marginTop: 14 }}>Run real tests</h3>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            Node runs inside the sandbox, streams terminal output, and exposes the
            failure before any patch is applied.
          </p>
        </div>
        <div className="card">
          <span className="badge ok">4</span>
          <h3 style={{ marginTop: 14 }}>Patch and prove</h3>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            The first version uses deterministic fallback patching so the hackathon
            demo completes even before AI patching is added.
          </p>
        </div>
      </section>

      <section className="panel">
        <h2>Demo Safe Mode</h2>
        <p style={{ color: "var(--soft)", lineHeight: 1.55 }}>
          Safe Mode is on by default in the current proof. BrowserPod execution is
          real when a valid key and COOP/COEP headers are present. AI patching is
          replaced with a known patch for the CSV export bug, and fallback copy makes
          BrowserPod failures actionable instead of mysterious.
        </p>
        <div className="actions">
          <Link href="/sandbox-test" className="button primary">
            Run smoke test
          </Link>
          <Link href="/sprint" className="button">
            Run sample sprint
          </Link>
        </div>
      </section>
    </main>
  );
}
