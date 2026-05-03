import Link from "next/link";
import "./workflow.css";

const workflowSteps = [
  {
    number: "1",
    title: "Select a sandbox repo",
    copy: "Arena Live uses a built-in Node.js and Express frontend repo with issue context. GitHub MCP and ZIP import remain planned connectors.",
  },
  {
    number: "2",
    title: "Generate bounded code",
    copy: "Gemini, Groq, Auto, or fallback mode returns only validated HTML and CSS for variants, or one file patch in Agent Lab.",
  },
  {
    number: "3",
    title: "Run inside BrowserPod",
    copy: "ForkLab writes files into an isolated browser sandbox, runs the allowed command, and streams terminal output back into the UI.",
  },
  {
    number: "4",
    title: "Capture proof",
    copy: "The page records files written, nonce proof, commands, terminal output, and BrowserPod Portal URLs when the runtime exposes them.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="stack" style={{ gap: 48 }}>
      <header className="page-header" style={{ paddingBottom: 0 }}>
        <p className="eyebrow">How It Works</p>
        <h1>Product Workflow & Demo Guide</h1>
        <p className="lead">
          ForkLab keeps generated code away from the host machine. The Next.js app
          handles orchestration and provider calls, while BrowserPod runs the files
          in an isolated browser runtime to capture execution proof.
        </p>
        <div className="actions" style={{ justifyContent: "flex-start", marginTop: 24 }}>
          <Link href="/arena-live" className="button primary">
            Open Live
          </Link>
          <Link href="/arena" className="button">
            Open Arena
          </Link>
          <Link href="/sandbox-test" className="button">
            Check Smoke
          </Link>
        </div>
      </header>

      {/* --- Visual Workflow Diagram --- */}
      <section className="workflow-diagram-container">
        <div className="workflow-diagram">
          <div className="workflow-node">
            <div className="workflow-icon">⎇</div>
            <h4>Connect Repo</h4>
            <span>Built-in demo repo today</span>
          </div>
          <div className="workflow-line"></div>
          <div className="workflow-node">
            <div className="workflow-icon">✎</div>
            <h4>Prompt Task</h4>
            <span>Issue-driven or freeform</span>
          </div>
          <div className="workflow-line"></div>
          <div className="workflow-node">
            <div className="workflow-icon">⚙</div>
            <h4>LLM Variants</h4>
            <span>Gemini / Groq / Fallback</span>
          </div>
          <div className="workflow-line"></div>
          <div className="workflow-node pod-glow">
            <div className="workflow-icon" style={{ color: "var(--primary-container)" }}>⊘</div>
            <h4 style={{ color: "var(--primary-container)" }}>BrowserPod</h4>
            <span>Isolated execution</span>
          </div>
          <div className="workflow-line"></div>
          <div className="workflow-node">
            <div className="workflow-icon">✉</div>
            <h4>Proof & Preview</h4>
            <span>Nonce, logs, portal URL</span>
          </div>
          <div className="workflow-line"></div>
          <div className="workflow-node">
            <div className="workflow-icon">⑂</div>
            <h4>Compare</h4>
            <span>Review strategy outputs</span>
          </div>
        </div>
      </section>

      {/* --- Step by Step Cards --- */}
      <section>
        <div className="status-row" style={{ marginBottom: 16 }}>
          <span className="badge ok">Architecture Steps</span>
        </div>
        <div className="grid two">
          {workflowSteps.map((step) => (
            <div className="feature-card" key={step.title}>
              <span className="feature-number">{step.number}</span>
              <h3 style={{ marginBottom: 4 }}>{step.title}</h3>
              <p style={{ color: "var(--on-surface-variant)", marginBottom: 0, fontSize: 13, lineHeight: 1.6 }}>
                {step.copy}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Layer Architecture --- */}
      <section className="panel card-glow">
        <div className="status-row" style={{ marginBottom: 12 }}>
          <span className="badge info">System Boundaries</span>
        </div>
        <div className="grid two" style={{ gap: 32 }}>
          <div>
            <h3 style={{ color: "var(--primary-container)" }}>Outer Shell: Next.js</h3>
            <p style={{ color: "var(--on-surface-variant)", fontSize: 13, lineHeight: 1.6, marginBottom: 0 }}>
              The app owns navigation, UI state, server-only LLM provider calls,
              validation, and the list of allowed files and commands.
            </p>
          </div>
          <div>
            <h3 style={{ color: "var(--secondary)" }}>Inner Runtime: BrowserPod</h3>
            <p style={{ color: "var(--on-surface-variant)", fontSize: 13, lineHeight: 1.6, marginBottom: 0 }}>
              BrowserPod provides the disposable filesystem, Node runtime,
              terminal, and Portal callbacks. COOP, COEP, and Permissions-Policy
              headers keep SharedArrayBuffer available.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
