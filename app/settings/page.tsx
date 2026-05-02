import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="stack">
      <header className="page-header">
        <p className="eyebrow">Settings & Safety</p>
        <h1>Execution Environment</h1>
        <p>
          ForkLab uses BrowserPod for isolated code execution. All generated code
          runs inside ephemeral browser sandboxes — never on your local machine.
        </p>
      </header>

      <section className="panel card-glow">
        <div className="status-row" style={{ marginBottom: 12 }}>
          <span className="badge ok">✓ Safety Status: Active</span>
          <span className="badge">Demo Build</span>
        </div>
        <p style={{ color: "var(--on-surface-variant)", fontSize: 14, lineHeight: 1.6 }}>
          This build runs in Demo Safe Mode. BrowserPod execution is real (when a
          valid API key is present), but AI patching is replaced with deterministic
          fallback patches. No code leaves the browser sandbox.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>Execution settings</h2>
        <div className="settings-grid">
          <div className="setting-item">
            <div>
              <label>Demo Safe Mode</label>
              <p>Uses deterministic patches instead of AI-generated ones.</p>
            </div>
            <span className="badge ok">ON</span>
          </div>
          <div className="setting-item">
            <div>
              <label>BrowserPod Isolation</label>
              <p>Code runs in SharedArrayBuffer-backed WASM sandbox.</p>
            </div>
            <span className="badge ok">Active</span>
          </div>
          <div className="setting-item">
            <div>
              <label>COOP / COEP Headers</label>
              <p>Required for SharedArrayBuffer. Set in next.config.ts.</p>
            </div>
            <span className="badge ok">Configured</span>
          </div>
          <div className="setting-item">
            <div>
              <label>Node.js Version</label>
              <p>Runtime version inside BrowserPod.</p>
            </div>
            <span className="badge">v22</span>
          </div>
          <div className="setting-item">
            <div>
              <label>API Key Status</label>
              <p>NEXT_PUBLIC_BROWSERPOD_API_KEY in .env.local.</p>
            </div>
            <span className="badge warn">Check .env.local</span>
          </div>
          <div className="setting-item">
            <div>
              <label>Permissions Policy</label>
              <p>cross-origin-isolated=(self)</p>
            </div>
            <span className="badge ok">Set</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>Security guarantees</h2>
        <div className="grid two">
          <div className="stack" style={{ gap: 8 }}>
            <div className="security-check">Ephemeral containers — each pod is destroyed after the sprint</div>
            <div className="security-check">No access to local filesystem, environment variables, or secrets</div>
            <div className="security-check">No outbound network access from the sandbox</div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <div className="security-check">All code execution is client-side only</div>
            <div className="security-check">Test results are read from pod filesystem, not evaluated on host</div>
            <div className="security-check">Automated rollback on failure or timeout</div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="status-row" style={{ marginBottom: 12 }}>
          <span className="badge warn">Current Scope</span>
        </div>
        <h3 style={{ fontSize: 16 }}>What&apos;s live in this build</h3>
        <div className="artifact-list" style={{ marginBottom: 16 }}>
          <div><span>/sandbox-test</span><strong className="text-ok">Live</strong></div>
          <div><span>/sprint — CSV Export Fix</span><strong className="text-ok">Live</strong></div>
          <div><span>Sidebar Fix branch</span><strong>Queued</strong></div>
          <div><span>Email Validation Fix branch</span><strong>Queued</strong></div>
          <div><span>AI patching (LLM-generated fixes)</span><strong>Not yet</strong></div>
          <div><span>GitHub integration (PR creation)</span><strong>Not yet</strong></div>
          <div><span>Multi-pod parallel execution</span><strong>Not yet</strong></div>
        </div>
        <div className="actions" style={{ justifyContent: "flex-start" }}>
          <Link href="/sprint" className="button primary">▶ Run Sample Sprint</Link>
          <Link href="/sandbox-test" className="button">Run Smoke Test</Link>
        </div>
      </section>
    </div>
  );
}
