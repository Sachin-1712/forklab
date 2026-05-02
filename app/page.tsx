import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-badge">
          <span className="dot-live" />
          Built for AI in the Box · Powered by BrowserPod
        </div>

        <h1>
          Parallel AI branches.
          <br />
          <span style={{ color: "var(--primary)" }}>Verified in browser sandboxes.</span>
        </h1>

        <p className="lead">
          ForkLab gives every AI coding branch its own disposable BrowserPod
          sandbox, runs real tests, and compares verified fixes before you
          accept them.
        </p>

        <div className="actions">
          <Link href="/sprint" className="button primary">
            ▶ Start Sample Sprint
          </Link>
          <Link href="/how-it-works" className="button">
            ℹ See How It Works
          </Link>
        </div>

        {/* Pod Bento Cards */}
        <div className="pod-bento">
          {/* Pod A – Queued */}
          <div className="pod-card">
            <div className="pod-card-bar">
              <span style={{ width: "65%", background: "var(--secondary-container)" }} />
            </div>
            <div className="pod-card-header">
              <span className="pod-card-title">⌘ Pod A: Sidebar Fix</span>
              <span className="badge info">Queued</span>
            </div>
            <div className="pod-card-terminal">
              <div className="fade-out" />
              <div>&gt; npm run test:sidebar</div>
              <div style={{ opacity: 0.6 }}>&gt; Waiting for pod allocation...</div>
              <div style={{ opacity: 0.4 }}>&gt; Planned for next sprint</div>
            </div>
          </div>

          {/* Pod B – Live */}
          <div className="pod-card pod-live">
            <div className="pod-card-bar">
              <span style={{ width: "100%", background: "var(--primary-container)" }} />
            </div>
            <div className="pod-card-header">
              <span className="pod-card-title" style={{ color: "var(--primary)" }}>
                ◆ Pod B: CSV Export Fix
              </span>
              <span className="badge ok">Live</span>
            </div>
            <div className="pod-card-terminal">
              <div style={{ color: "var(--error)" }}>
                &gt; FAIL: normalizes CSV export filenames
              </div>
              <div style={{ color: "var(--on-surface-variant)" }}>&gt; Applying deterministic patch...</div>
              <div style={{ color: "var(--primary-container)" }}>
                &gt; PASS: all assertions green ✓
              </div>
            </div>
          </div>

          {/* Pod C – Queued */}
          <div className="pod-card">
            <div className="pod-card-bar">
              <span style={{ width: "30%", background: "var(--tertiary-fixed-dim)" }} />
            </div>
            <div className="pod-card-header">
              <span className="pod-card-title">✉ Pod C: Email Val Fix</span>
              <span className="badge warn">Queued</span>
            </div>
            <div className="pod-card-terminal">
              <div className="fade-out" />
              <div>&gt; Signup validation checks</div>
              <div style={{ opacity: 0.6 }}>&gt; Pending pod allocation</div>
              <div style={{ opacity: 0.4 }}>&gt; Will run after CSV export</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why It Matters ─────────────────────────────────────── */}
      <section className="stack" style={{ marginTop: 48 }}>
        <div>
          <p className="eyebrow">Why it matters</p>
          <h2>From guessing to proving.</h2>
        </div>
        <div className="grid three">
          <div className="card" style={{ opacity: 0.6 }}>
            <p className="eyebrow">Legacy AI</p>
            <h3 style={{ fontSize: 16 }}>One Answer</h3>
            <p style={{ color: "var(--outline)", marginBottom: 0, fontSize: 13 }}>
              Standard copilots generate a single block of code. You have to guess
              if it works and manually run tests locally.
            </p>
          </div>
          <div className="card">
            <p className="eyebrow" style={{ color: "var(--secondary-fixed-dim)" }}>ForkLab Approach</p>
            <h3 style={{ fontSize: 16 }}>Multi-Agent Exploration</h3>
            <p style={{ color: "var(--on-surface-variant)", marginBottom: 0, fontSize: 13 }}>
              We spin up multiple agents in parallel. They explore different
              architectural approaches simultaneously, without touching your
              machine.
            </p>
          </div>
          <div className="card card-glow">
            <p className="eyebrow" style={{ color: "var(--on-primary-container)" }}>Proven Results</p>
            <h3 style={{ fontSize: 16 }}>Verified Sandbox Fixes</h3>
            <p style={{ color: "var(--on-surface-variant)", marginBottom: 0, fontSize: 13 }}>
              Every branch executes in an isolated BrowserPod. We run your test
              suite against every fix. You only review code that passes.
            </p>
          </div>
        </div>
      </section>

      {/* ── Security Section ───────────────────────────────────── */}
      <section style={{ marginTop: 48 }}>
        <div className="security-panel">
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="hero-badge" style={{ marginBottom: 16 }}>
              <span style={{ color: "var(--error)" }}>⊘</span> Zero Trust Execution
            </div>
            <h2 style={{ fontSize: 24 }}>Software Security First</h2>
            <p style={{ color: "var(--on-surface-variant)", lineHeight: 1.6, marginBottom: 16, fontSize: 14 }}>
              Untrusted AI-generated code should never run directly on your host
              machine. ForkLab treats all LLM outputs as potentially malicious or
              broken.
            </p>
            <div className="stack" style={{ gap: 8 }}>
              <div className="security-check">Isolated ephemeral containers per branch</div>
              <div className="security-check">No access to local filesystem or secrets</div>
              <div className="security-check">Automated rollback on failure or timeout</div>
            </div>
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="terminal-panel">
              <div className="terminal-title">
                <div className="terminal-title-dots"><span /><span /><span /></div>
                <span>Security.log</span>
              </div>
              <div className="terminal-body" style={{ minHeight: 180, fontSize: 13 }}>
                <pre className="terminal-lines">{`[SYS] Initiating Pod Isolation Sequence...
[SYS] Mounting virtual fs: /tmp/pod_env_a4f2
[NET] Restricting outbound traffic to whitelist
> Executing Agent Payload...
[SEC] ALERT: Attempted access to /etc/passwd denied
> Process terminated due to security violation.
[SYS] Shredding container instance a4f2...
[SYS] Host machine remains secure.`}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="stack" style={{ marginTop: 48, textAlign: "center", padding: "32px 0" }}>
        <h2>Ready to run your first proof?</h2>
        <p className="lead" style={{ margin: "0 auto 20px", textAlign: "center" }}>
          The sample sprint writes a buggy CSV export function, proves the test
          failure, applies a deterministic fix, and proves the pass — all inside
          BrowserPod.
        </p>
        <div className="actions">
          <Link href="/sprint" className="button primary">Start Sample Sprint</Link>
          <Link href="/sandbox-test" className="button">Run Smoke Test</Link>
        </div>
      </section>
    </>
  );
}
