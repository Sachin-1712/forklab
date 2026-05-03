import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="stack">
      <header className="page-header">
        <p className="eyebrow">Settings & Safety</p>
        <h1>Execution Environment</h1>
        <p>
          ForkLab routes all generated code through validated file writes and
          BrowserPod sandboxes. Provider keys stay server-side; BrowserPod proof
          stays visible in the product UI.
        </p>
      </header>

      <section className="panel card-glow">
        <div className="status-row" style={{ marginBottom: 12 }}>
          <span className="badge ok">BrowserPod headers active</span>
          <span className="badge ok">Server-only LLM keys</span>
          <span className="badge info">Fallback preserved</span>
        </div>
        <p style={{ color: "var(--on-surface-variant)", fontSize: 13, lineHeight: 1.6, marginBottom: 0 }}>
          The current build supports Gemini, Groq, Auto, and deterministic fallback
          modes. LLM output is treated as untrusted until BrowserPod writes files,
          runs the allowed command, and returns proof.
        </p>
      </section>

      <section>
        <h2 style={{ marginBottom: 12 }}>Execution settings</h2>
        <div className="settings-grid">
          <div className="setting-item">
            <div>
              <label>BrowserPod API key</label>
              <p>NEXT_PUBLIC_BROWSERPOD_API_KEY in .env.local for client-side BrowserPod boot.</p>
            </div>
            <span className="badge warn">Local env</span>
          </div>
          <div className="setting-item">
            <div>
              <label>Gemini provider</label>
              <p>GEMINI_API_KEY and GEMINI_MODEL are read only by server routes.</p>
            </div>
            <span className="badge ok">Server-side</span>
          </div>
          <div className="setting-item">
            <div>
              <label>Groq provider</label>
              <p>GROQ_API_KEY and GROQ_MODEL are read only by server routes.</p>
            </div>
            <span className="badge ok">Server-side</span>
          </div>
          <div className="setting-item">
            <div>
              <label>Safe Mode</label>
              <p>Runs the first generated variant in BrowserPod and keeps the others generated but queued.</p>
            </div>
            <span className="badge ok">Default</span>
          </div>
          <div className="setting-item">
            <div>
              <label>Parallel Mode</label>
              <p>Attempts one BrowserPod run per selected variant and reports each result independently.</p>
            </div>
            <span className="badge info">Optional</span>
          </div>
          <div className="setting-item">
            <div>
              <label>COOP / COEP headers</label>
              <p>Required for SharedArrayBuffer and BrowserPod cross-origin isolation.</p>
            </div>
            <span className="badge ok">Configured</span>
          </div>
          <div className="setting-item">
            <div>
              <label>Permissions Policy</label>
              <p>cross-origin-isolated=(self) must remain applied to app routes.</p>
            </div>
            <span className="badge ok">Set</span>
          </div>
          <div className="setting-item">
            <div>
              <label>Allowed commands</label>
              <p>ForkLab chooses commands. LLM output cannot request shell execution.</p>
            </div>
            <span className="badge ok">Locked</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 style={{ marginBottom: 12 }}>Security guarantees</h2>
        <div className="grid two">
          <div className="stack" style={{ gap: 8 }}>
            <div className="security-check">Generated code is written only to approved BrowserPod paths</div>
            <div className="security-check">LLM keys are never exposed through NEXT_PUBLIC variables</div>
            <div className="security-check">BrowserPod runtime output is shown directly in terminal panels</div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <div className="security-check">No host filesystem execution for generated projects</div>
            <div className="security-check">Fallback patches and variants are marked honestly</div>
            <div className="security-check">Portal links are captured only when BrowserPod reports them</div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="status-row" style={{ marginBottom: 12 }}>
          <span className="badge ok">Current Scope</span>
        </div>
        <h3>Routes used for the final workflow</h3>
        <div className="artifact-list" style={{ marginBottom: 16 }}>
          <div><span>Arena - GitHub-style sandbox issues</span><strong className="text-ok">Live</strong></div>
          <div><span>Live - prompt-driven variant generation and BrowserPod preview</span><strong className="text-ok">Live</strong></div>
          <div><span>Workbench - enterprise agent workflow with proof</span><strong className="text-ok">Live</strong></div>
          <div><span>Smoke - BrowserPod runtime and portal verification</span><strong className="text-ok">Live</strong></div>
          <div><span>Settings - deployment readiness and environment checks</span><strong className="text-ok">Live</strong></div>
          <div><span>How It Works - product workflow overview and demo guide</span><strong className="text-ok">Live</strong></div>
        </div>
        <div className="actions" style={{ justifyContent: "flex-start" }}>
          <Link href="/arena-live" className="button primary">Run Agent</Link>
          <Link href="/arena" className="button">Open Arena</Link>
          <Link href="/workbench" className="button">Open Workbench</Link>
          <Link href="/sandbox-test" className="button">Smoke Test</Link>
        </div>
      </section>

      <section className="panel">
        <h2 style={{ marginBottom: 12 }}>Deployment checklist</h2>
        <div className="grid two">
          <div className="stack" style={{ gap: 8 }}>
            <div className="security-check">Vercel env vars configured</div>
            <div className="security-check">BrowserPod key allows deployed origin</div>
            <div className="security-check">Gemini key server-side only</div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <div className="security-check">.env.local not committed</div>
            <div className="security-check">npm run build passes</div>
            <div className="security-check">crossOriginIsolated headers set correctly</div>
          </div>
        </div>
      </section>
    </div>
  );
}
