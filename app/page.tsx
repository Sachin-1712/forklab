import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-badge">
          <span style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>⊘</span>
          Built for BrowserPod variants - LLM-assisted proof
        </div>

        <h1>
          Prompt once.
          <br />
          <span style={{ color: "var(--primary-container)" }}>Run verified variants.</span>
        </h1>

        <p className="lead" style={{ fontSize: 16 }}>
          ForkLab lets AI generate code, then runs it inside BrowserPod before you trust it.
        </p>

        <div className="actions">
          <Link href="/arena-live" className="button primary">
            Run Agent
          </Link>
          <Link href="/arena" className="button">
            View Issues Arena
          </Link>
        </div>

        {/* Pod Bento Cards */}
        <div className="pod-bento">
          {/* Pod A – Running tests */}
          <div className="pod-card">
            <div className="pod-card-bar">
              <span style={{ width: "66%", background: "var(--secondary-container)" }} />
            </div>
            <div className="pod-card-header">
              <span className="pod-card-title">
                <span style={{ fontSize: 14 }}>⌨</span> Enterprise Trust
              </span>
              <span className="badge info">
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--secondary)", display: "inline-block", animation: "pulse-dot 2s infinite" }} />
                Generating
              </span>
            </div>
            <div className="pod-card-terminal">
              <div className="fade-out" />
              <div style={{ opacity: 0.7 }}>&gt; provider=gemini</div>
              <div style={{ opacity: 0.7 }}>&gt; wrote public/index.html</div>
              <div style={{ opacity: 0.7 }}>&gt; wrote public/styles.css</div>
            </div>
          </div>

          {/* Pod B – Patching */}
          <div className="pod-card">
            <div className="pod-card-bar">
              <span style={{ width: "33%", background: "var(--error)" }} />
            </div>
            <div className="pod-card-header">
              <span className="pod-card-title">
                <span style={{ fontSize: 14 }}>◇</span> Startup Conversion
              </span>
              <span className="badge fail">
                <span style={{ fontSize: 10 }}>⚙</span> Installing
              </span>
            </div>
            <div className="pod-card-terminal">
              <div className="fade-out" />
              <div style={{ opacity: 0.7 }}>&gt; boot BrowserPod</div>
              <div style={{ opacity: 0.7 }}>&gt; npm install</div>
              <div style={{ color: "var(--error)", opacity: 0.8 }}>&gt; waiting for Portal callback</div>
            </div>
          </div>

          {/* Pod C – Passed */}
          <div className="pod-card pod-live">
            <div className="pod-card-bar">
              <span style={{ width: "100%", background: "var(--primary-container)" }} />
            </div>
            <div className="pod-card-header">
              <span className="pod-card-title" style={{ color: "var(--primary-container)" }}>
                ✉ Developer Minimal
              </span>
              <span className="badge ok">
                ✓ Portal ready
              </span>
            </div>
            <div className="pod-card-terminal" style={{ overflow: "visible" }}>
              <div style={{ color: "var(--primary-container)", opacity: 0.9 }}>
                &gt; FORKLAB_VARIANT_NONCE matched
              </div>
              <div style={{ color: "var(--primary-container)", opacity: 0.9 }}>
                &gt; Express static server listening
              </div>
              <div style={{ marginTop: 8 }}>&gt; BrowserPod Portal captured</div>
              <button
                className="button"
                style={{
                  marginTop: 8, width: "100%", minHeight: 28,
                  fontSize: 10, padding: "0 8px",
                  borderColor: "var(--primary-container)",
                  color: "var(--primary-container)"
                }}
                type="button"
              >
                Open Portal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Demo Modes ─────────────────────────────────────── */}
      <section className="stack" style={{ marginTop: 48 }}>
        <h2 style={{ fontSize: 20, borderBottom: "1px solid var(--border)", paddingBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--primary-container)" }}>⑂</span>
          Final Demo Modes
        </h2>
        <div className="grid three">
          {/* Arena */}
          <div className="feature-card">
            <p className="eyebrow" style={{ borderBottom: "1px solid var(--border-elevated)", paddingBottom: 8, color: "var(--secondary)" }}>
              Mode 1
            </p>
            <h3 style={{ fontSize: 18 }}>Arena</h3>
            <p style={{ color: "var(--on-surface-variant)", marginBottom: 0, fontSize: 13 }}>
              Select sandbox issues from a simulated GitHub repo and run parallel BrowserPod branches.
            </p>
          </div>
          {/* Arena Live */}
          <div className="feature-card highlight" style={{ borderColor: "var(--border-elevated)", position: "relative" }}>
            <div style={{
              position: "absolute", top: -10, left: 24,
              background: "var(--surface)", padding: "0 8px",
              color: "var(--on-surface-variant)", fontFamily: "var(--font-mono)",
              fontSize: 10, border: "1px solid var(--border-elevated)", borderRadius: "var(--radius)"
            }}>
              Primary Demo
            </div>
            <p className="eyebrow" style={{ borderBottom: "1px solid var(--border-elevated)", paddingBottom: 8, color: "var(--primary-container)" }}>
              Mode 2
            </p>
            <h3 style={{ fontSize: 18 }}>Arena Live</h3>
            <p style={{ color: "var(--on-surface-variant)", marginBottom: 0, fontSize: 13 }}>
              Prompt for frontend variants and run them directly in BrowserPod with immediate terminal and visual feedback.
            </p>
          </div>
          {/* Workbench */}
          <div className="feature-card">
            <p className="eyebrow" style={{ borderBottom: "1px solid var(--border-elevated)", paddingBottom: 8, color: "var(--secondary)" }}>
              Mode 3
            </p>
            <h3 style={{ fontSize: 18 }}>Workbench</h3>
            <p style={{ color: "var(--on-surface-variant)", marginBottom: 0, fontSize: 13 }}>
              Enterprise agent workflow with proof. Shows the steps of prompting, generating, running, and verifying.
            </p>
          </div>
        </div>
      </section>

      {/* ── Security Section ───────────────────────────────────── */}
      <section style={{ marginTop: 48 }}>
        <div className="security-panel">
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="hero-badge" style={{ marginBottom: 24, borderColor: "rgba(255,180,171,0.3)", background: "rgba(255,180,171,0.05)" }}>
              <span style={{ color: "var(--error)", fontSize: 14 }}>⊘</span>
              <span style={{ color: "var(--error)" }}>Zero Trust Execution</span>
            </div>
            <h2 style={{ fontSize: 24 }}>Software Security First</h2>
            <p style={{ color: "var(--on-surface-variant)", lineHeight: 1.6, marginBottom: 24, fontSize: 14 }}>
              Untrusted AI-generated code should never run directly on your host
              machine. ForkLab treats all LLM outputs as potentially malicious or
              broken.
            </p>
            <div className="stack" style={{ gap: 12 }}>
              <div className="security-check">Isolated ephemeral containers per branch</div>
              <div className="security-check">No access to local filesystem or secrets</div>
              <div className="security-check">Automated rollback on failure or timeout</div>
            </div>
          </div>
          <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400 }}>
            <div className="terminal-panel">
              <div className="terminal-title">
                <div className="terminal-title-dots"><span /><span /><span /></div>
                <span>Security.log</span>
              </div>
              <div className="terminal-body" style={{ minHeight: 192, fontSize: 11 }}>
                <div>[SYS] Initiating Pod Isolation Sequence...</div>
                <div>[SYS] Mounting virtual fs: /tmp/pod_env_a4f2</div>
                <div>[NET] Restricting outbound traffic to whitelist</div>
                <div style={{ color: "var(--secondary)", marginTop: 8 }}>&gt; Writing generated variant files...</div>
                <div>[SEC] Host filesystem unavailable to sandbox code</div>
                <div style={{ color: "var(--primary-container)" }}>&gt; Nonce proof returned from BrowserPod.</div>
                <div style={{ marginTop: 8 }}>[SYS] Shredding container instance a4f2...</div>
                <div style={{ color: "var(--primary-container)", marginTop: 8 }}>[SYS] Host machine remains secure.</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
