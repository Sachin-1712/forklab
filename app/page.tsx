import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-badge">
          <span style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>⊘</span>
          Built for AI in the Box · Powered by BrowserPod
        </div>

        <h1>
          Parallel AI branches.
          <br />
          <span style={{ color: "var(--primary-container)" }}>Verified in browser sandboxes.</span>
        </h1>

        <p className="lead" style={{ fontSize: 16 }}>
          ForkLab gives every AI coding branch its own disposable BrowserPod
          sandbox, runs real tests, and compares verified fixes before you
          accept them.
        </p>

        <div className="actions">
          <Link href="/sprint" className="button primary">
            ▶ Start Sample Sprint
          </Link>
          <Link href="/how-it-works" className="button">
            ⓘ See How It Works
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
                <span style={{ fontSize: 14 }}>⌨</span> Pod A: Sidebar Fix
              </span>
              <span className="badge info">
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--secondary)", display: "inline-block", animation: "pulse-dot 2s infinite" }} />
                Running tests
              </span>
            </div>
            <div className="pod-card-terminal">
              <div className="fade-out" />
              <div style={{ opacity: 0.7 }}>&gt; npm run test:sidebar</div>
              <div style={{ opacity: 0.7 }}>&gt; PASS src/components/Sidebar.test.tsx</div>
              <div style={{ opacity: 0.7 }}>&gt; RUNS src/layout/MainLayout.test.tsx</div>
            </div>
          </div>

          {/* Pod B – Patching */}
          <div className="pod-card">
            <div className="pod-card-bar">
              <span style={{ width: "33%", background: "var(--error)" }} />
            </div>
            <div className="pod-card-header">
              <span className="pod-card-title">
                <span style={{ fontSize: 14 }}>◇</span> Pod B: CSV Export Fix
              </span>
              <span className="badge fail">
                <span style={{ fontSize: 10 }}>⚙</span> Patching
              </span>
            </div>
            <div className="pod-card-terminal">
              <div className="fade-out" />
              <div style={{ color: "var(--error)", opacity: 0.8 }}>
                &gt; TypeError: Cannot read properties of undefined (reading &apos;map&apos;)
              </div>
              <div style={{ opacity: 0.7 }}>&gt; AI Agent proposing fix...</div>
              <div style={{ opacity: 0.7 }}>&gt; Applying patch v2</div>
            </div>
          </div>

          {/* Pod C – Passed */}
          <div className="pod-card pod-live">
            <div className="pod-card-bar">
              <span style={{ width: "100%", background: "var(--primary-container)" }} />
            </div>
            <div className="pod-card-header">
              <span className="pod-card-title" style={{ color: "var(--primary-container)" }}>
                ✉ Pod C: Email Val Fix
              </span>
              <span className="badge ok">
                ✓ Passed
              </span>
            </div>
            <div className="pod-card-terminal" style={{ overflow: "visible" }}>
              <div style={{ color: "var(--primary-container)", opacity: 0.9 }}>
                &gt; 14 tests passed
              </div>
              <div style={{ color: "var(--primary-container)", opacity: 0.9 }}>
                &gt; 0 vulnerabilities found
              </div>
              <div style={{ marginTop: 8 }}>&gt; Ready for merge</div>
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
                Accept Fix
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why It Matters ─────────────────────────────────────── */}
      <section className="stack" style={{ marginTop: 48 }}>
        <h2 style={{ fontSize: 20, borderBottom: "1px solid var(--border)", paddingBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--primary-container)" }}>↔</span>
          Why it matters
        </h2>
        <div className="grid three">
          {/* Legacy */}
          <div className="feature-card legacy">
            <p className="eyebrow" style={{ borderBottom: "1px solid var(--border-elevated)", paddingBottom: 8 }}>Legacy AI</p>
            <h3 style={{ fontSize: 18 }}>One Answer</h3>
            <p style={{ color: "var(--on-surface-variant)", marginBottom: 0, fontSize: 13 }}>
              Standard copilots generate a single block of code. You have to guess
              if it works, copy it over, and manually run tests in your local
              environment.
            </p>
          </div>
          {/* ForkLab */}
          <div className="feature-card" style={{ borderColor: "var(--border-elevated)", position: "relative" }}>
            <div style={{
              position: "absolute", top: -10, left: 24,
              background: "var(--surface)", padding: "0 8px",
              color: "var(--on-surface-variant)", fontFamily: "var(--font-mono)",
              fontSize: 10, border: "1px solid var(--border-elevated)", borderRadius: "var(--radius)"
            }}>
              ForkLab Approach
            </div>
            <p className="eyebrow" style={{ borderBottom: "1px solid var(--border-elevated)", paddingBottom: 8, color: "var(--secondary)" }}>
              ⑂ Parallel Answers
            </p>
            <h3 style={{ fontSize: 18 }}>Multi-Agent Exploration</h3>
            <p style={{ color: "var(--on-surface-variant)", marginBottom: 0, fontSize: 13 }}>
              We spin up multiple agents in parallel. They explore different
              architectural approaches to your prompt simultaneously, without
              touching your local machine.
            </p>
          </div>
          {/* Proven */}
          <div className="feature-card highlight">
            <p className="eyebrow" style={{ borderBottom: "1px solid var(--border-elevated)", paddingBottom: 8, color: "var(--primary-container)" }}>
              🛡 Proven Results
            </p>
            <h3 style={{ fontSize: 18 }}>Verified Sandbox Fixes</h3>
            <p style={{ color: "var(--on-surface-variant)", marginBottom: 0, fontSize: 13 }}>
              Every branch executes in an isolated BrowserPod. We run your test
              suite against every proposed fix. You only review code that we
              mathematically prove passes.
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
                <div style={{ color: "var(--secondary)", marginTop: 8 }}>&gt; Executing Agent Payload...</div>
                <div>[SEC] ALERT: Attempted access to /etc/passwd denied</div>
                <div style={{ color: "var(--error)" }}>&gt; Process terminated due to security violation.</div>
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
