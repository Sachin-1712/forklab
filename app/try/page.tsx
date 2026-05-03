"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type TemplateId = "sprint" | "variant" | "docsproof" | "packageguard";
type ModalType = "files" | "connectors" | "skills" | null;

const templates = [
  {
    id: "sprint",
    title: "GitHub Issues Arena",
    kicker: "5 issues, pick 3",
    description: "Select sandbox GitHub issues -> run parallel BrowserPod branches.",
    status: "Live",
  },
  {
    id: "variant",
    title: "Variant Arena",
    kicker: "A/B frontend variants",
    description: "One frontend task -> 3 UI variants -> compare preview/build/risk.",
    status: "Preview",
  },
  {
    id: "docsproof",
    title: "DocsProof",
    kicker: "Verify docs snippets",
    description: "Run docs examples in BrowserPod and prove which snippets work.",
    status: "Coming soon",
  },
  {
    id: "packageguard",
    title: "PackageGuard",
    kicker: "Safe npm package trial",
    description: "Install/test unknown packages inside a disposable browser sandbox.",
    status: "Coming soon",
  },
] as const;

const connectors = [
  ["GitHub Issues / PRs", "Coming soon"],
  ["MCP Tools", "Coming soon"],
  ["Docs / URLs", "Coming soon"],
  ["Local files", "Coming soon"],
] as const;

const variantBranches = [
  {
    name: "Conversion-focused hero",
    strategy: "Lead with a crisp value prop and one high-confidence CTA.",
    risk: "Medium",
    files: "app/page.tsx, app/globals.css",
  },
  {
    name: "Enterprise trust dashboard",
    strategy: "Prioritize proof, compliance language, and comparison panels.",
    risk: "Medium",
    files: "app/page.tsx, components/ProofReport.tsx",
  },
  {
    name: "Developer-minimal interface",
    strategy: "Reduce decoration and surface terminal/proof artifacts first.",
    risk: "Low",
    files: "app/page.tsx, components/TerminalPanel.tsx",
  },
] as const;

const defaultPrompt =
  "Select up to three sandbox GitHub issues and run them in parallel.";

export default function TryPage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("sprint");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [modal, setModal] = useState<ModalType>(null);
  const [mounted, setMounted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [launchedTemplate, setLaunchedTemplate] = useState<TemplateId | null>(null);
  const [sprintVerified, setSprintVerified] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSprintVerified(localStorage.getItem("forklab:sprint-proof-passed") === "true");
  }, []);

  const messages = useMemo(() => {
    if (!launchedTemplate) {
      return [
        {
          role: "ForkLab",
          text: "Choose a task template, add optional context, then launch agents. This demo uses built-in sample tasks instead of real AI, GitHub, or MCP execution.",
        },
      ];
    }

    if (launchedTemplate === "sprint") {
      return [
        { role: "User", text: prompt || defaultPrompt },
        {
          role: "ForkLab",
          text: "Launching GitHub Issues Arena. Selected sandbox issues will run as parallel BrowserPod branches.",
        },
      ];
    }

    if (launchedTemplate === "variant") {
      return [
        { role: "User", text: prompt || "Generate and compare frontend variants." },
        {
          role: "ForkLab",
          text: "Preparing Variant Arena preview. These cards show the next BrowserPod mode; they are not verified builds yet.",
        },
      ];
    }

    return [
      { role: "User", text: prompt || "Run a sandboxed proof task." },
      {
        role: "ForkLab",
        text: "This template is queued for the next build. For the live demo, use Sprint Arena or open the BrowserPod smoke test.",
      },
    ];
  }, [launchedTemplate, prompt]);

  function launchAgents() {
    if (selectedTemplate === "sprint") {
      router.push("/arena");
      return;
    }

    setLaunchedTemplate(selectedTemplate);
  }

  function onFilesSelected(files: FileList | null) {
    if (!files) return;
    setUploadedFiles(Array.from(files).map((file) => file.name));
  }

  return (
    <div className="command-center">
      <header className="page-header command-header">
        <p className="eyebrow">ForkLab Command Center</p>
        <h1>ForkLab Command Center</h1>
        <p>
          Describe a task, attach context, choose skills/connectors, and launch
          parallel BrowserPod branches.
        </p>
        <div className="actions command-actions">
          <Link href="/sandbox-test" className="button">
            Open Smoke Test
          </Link>
          <Link href="/arena" className="button">
            Open Issues Arena
          </Link>
          <Link href="/sprint" className="button">
            Open Live Sprint Proof
          </Link>
          <Link href="/workbench" className="button">
            Open Workbench
          </Link>
        </div>
      </header>

      <section className="proof-banner">
        AI-generated code is untrusted until BrowserPod verifies it.
      </section>

      <div className="command-layout">
        <aside className="command-sidebar">
          <div className="card stack">
            <div>
              <p className="eyebrow">Workspace inputs</p>
              <h3>Context tray</h3>
              <p className="muted-copy">
                This demo uses built-in sample context. Uploaded file names are shown
                locally and are not parsed yet.
              </p>
            </div>

            <button className="button" type="button" onClick={() => setModal("files")}>
              Add files / photos
            </button>
            <button className="button" type="button" onClick={() => setModal("connectors")}>
              Add connectors
            </button>
            <button className="button" type="button" onClick={() => setModal("skills")}>
              Add skills.md
            </button>

            <div className="artifact-list">
              {(uploadedFiles.length ? uploadedFiles : ["sample CSV export task"]).map(
                (file) => (
                  <div key={file}>
                    <span>{file}</span>
                    <strong>{uploadedFiles.length ? "attached" : "sample"}</strong>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="card stack">
            <div>
              <p className="eyebrow">Task templates</p>
              <h3>Choose arena</h3>
            </div>
            <div className="template-list">
              {templates.map((template) => (
                <button
                  className={`template-card${
                    selectedTemplate === template.id ? " selected" : ""
                  }`}
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <span className="status-row">
                    <span className="template-title">{template.title}</span>
                    <span
                      className={`badge ${
                        template.status === "Live"
                          ? "ok"
                          : template.status === "Preview"
                            ? "info"
                            : "warn"
                      }`}
                    >
                      {template.status}
                    </span>
                  </span>
                  <span className="template-kicker">{template.kicker}</span>
                  <span className="template-description">{template.description}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="command-chat card">
          <div>
            <p className="eyebrow">Prompt ForkLab</p>
            <h2>Launch sandbox branches</h2>
            <p className="muted-copy">
              Prompt ForkLab → choose arena → launch sandbox branches → verify
              results in BrowserPod.
            </p>
          </div>

          <div className="status-row">
            <span className="badge ok">BrowserPod proof layer</span>
            <span className="badge info">Workbench LLM path</span>
            <span className="badge warn">Safe demo mode</span>
          </div>

          <div className="chat-thread" aria-label="ForkLab chat messages">
            {messages.map((message, index) => (
              <div className={`chat-message ${message.role.toLowerCase()}`} key={index}>
                <strong>{message.role}</strong>
                <p>{message.text}</p>
              </div>
            ))}
          </div>

          <div className="prompt-box">
            <textarea
              aria-label="ForkLab task prompt"
              placeholder="Tell ForkLab what to run. Example: Fix the CSV export bug, generate 3 landing page variants, or compare 3 patch strategies."
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <div className="prompt-actions">
              <button className="button" type="button" onClick={() => setModal("files")}>
                Add files / photos
              </button>
              <button className="button" type="button" onClick={() => setModal("connectors")}>
                Add connectors
              </button>
              <button className="button" type="button" onClick={() => setModal("skills")}>
                Add skills.md
              </button>
              <button className="button primary" type="button" onClick={launchAgents}>
                Launch agents
              </button>
            </div>
            <p className="prompt-helper">
              Open GitHub Issues Arena to select up to three sandbox repo
              issues and launch them as parallel BrowserPod branches.
            </p>
          </div>
        </section>

        <section className="agent-dashboard">
          <div className="dashboard-header">
            <div>
              <p className="eyebrow">Agent run dashboard</p>
              <h2>Branches</h2>
            </div>
            {launchedTemplate === "sprint" ? (
              <Link href="/sprint" className="button primary">
                Open Live Sprint Proof
              </Link>
            ) : null}
          </div>

          {launchedTemplate === "variant" ? (
            <VariantDashboard />
          ) : (
            <SprintDashboard launched={launchedTemplate === "sprint"} verified={sprintVerified} />
          )}
        </section>
      </div>

      <section className="truth-panel">
        <div>
          <p className="eyebrow">What is real in this demo?</p>
          <h2>Clear boundaries</h2>
        </div>
        <div className="truth-grid">
          <TruthItem label="Real" text="/sandbox-test BrowserPod smoke test" />
          <TruthItem label="Real" text="/sprint CSV fail → patch → pass" />
          <TruthItem label="Real" text="sandbox GitHub issue list with max-three selection" />
          <TruthItem label="Next" text="real GitHub OAuth, arbitrary repos, MCP tools" />
        </div>
      </section>

      {mounted && modal
        ? createPortal(
            <CommandModal title={modalTitle(modal)} onClose={() => setModal(null)}>
              {modal === "connectors" ? <ConnectorsModal /> : null}
              {modal === "files" ? (
                <FilesModal files={uploadedFiles} onFilesSelected={onFilesSelected} />
              ) : null}
              {modal === "skills" ? <SkillsModal /> : null}
            </CommandModal>,
            document.body,
          )
        : null}
    </div>
  );
}

function SprintDashboard({
  launched,
  verified,
}: {
  launched: boolean;
  verified: boolean;
}) {
  return (
    <div className="agent-grid">
      <AgentRunCard
        agent="Access-Control Fix"
        strategy="Run SEC-101 through /workbench: failing tenant test, LLM/fallback patch proposal, human approval, BrowserPod verification."
        sandboxStatus={launched ? "Live workbench route ready" : "Ready to launch"}
        verificationStatus="Verified only after /workbench passes"
        terminal={`$ node tests/test-access-control.js
FAIL cross-tenant admin access
$ request constrained patch
$ human approval required`}
        risk="Low"
        files="src/accessControl.js"
        badge="Live Workbench"
        tone="info"
      />
      <AgentRunCard
        agent="CSV Export Fix"
        strategy="Run the known CSV filename bug inside BrowserPod, apply deterministic patch, rerun proof."
        sandboxStatus={launched ? "Live BrowserPod route ready" : "Ready to launch"}
        verificationStatus={
          verified ? "Live verified by /sprint" : "Open /sprint to run live proof"
        }
        terminal={`$ node tests/test-exportCsv.js
FAIL filename normalization
$ node applyPatch.js
$ node tests/test-exportCsv.js
PASS all checks`}
        risk="Low"
        files="src/exportCsv.js"
        badge={verified ? "Live verified" : "Live BrowserPod"}
        tone={verified ? "ok" : "info"}
      />
      <AgentRunCard
        agent="Sidebar Toggle Fix"
        strategy="Run a frontend reducer in BrowserPod, prove route navigation leaves the sidebar open, then apply a deterministic patch."
        sandboxStatus={launched ? "Live branch route ready" : "Ready to launch"}
        verificationStatus="Verified only after branch BrowserPod proof passes"
        terminal={`$ npm run test:sidebar
FAIL route change closes sidebar
$ node applyPatch.js
$ npm run test:sidebar
PASS all checks`}
        risk="Low"
        files="src/sidebarState.js"
        badge="Live BrowserPod"
        tone="info"
      />
      <AgentRunCard
        agent="Email Validation Fix"
        strategy="Tighten signup form validation and test invalid addresses."
        sandboxStatus="Queued / next branch"
        verificationStatus="Not verified yet"
        terminal={`$ npm run test:email
queued for next BrowserPod branch`}
        risk="Unknown"
        files="src/lib/validateEmail.ts"
        badge="Queued"
        tone="warn"
      />
    </div>
  );
}

function VariantDashboard() {
  return (
    <div className="stack">
      <div className="info-callout">
        Variant Arena is the next BrowserPod mode. In production, each variant
        would run/build inside an isolated pod and be compared before selection.
      </div>
      <div className="agent-grid">
        {variantBranches.map((branch) => (
          <AgentRunCard
            agent={branch.name}
            badge="Preview"
            files={branch.files}
            key={branch.name}
            risk={branch.risk}
            sandboxStatus="Preview mode"
            strategy={branch.strategy}
            terminal={`$ npm run build
preview only - no BrowserPod verification yet`}
            tone="info"
            verificationStatus="Not verified yet"
          />
        ))}
      </div>
    </div>
  );
}

function AgentRunCard({
  agent,
  strategy,
  sandboxStatus,
  verificationStatus,
  terminal,
  risk,
  files,
  badge,
  tone,
}: {
  agent: string;
  strategy: string;
  sandboxStatus: string;
  verificationStatus: string;
  terminal: string;
  risk: string;
  files: string;
  badge: string;
  tone: "ok" | "info" | "warn";
}) {
  return (
    <article className={`agent-card ${tone === "ok" ? "card-glow" : ""}`}>
      <div className="status-row">
        <span className={`badge ${tone}`}>{badge}</span>
        <span className="badge">Risk: {risk}</span>
      </div>
      <h3>{agent}</h3>
      <p>{strategy}</p>
      <div className="agent-meta">
        <div>
          <span>Sandbox status</span>
          <strong>{sandboxStatus}</strong>
        </div>
        <div>
          <span>Verification</span>
          <strong>{verificationStatus}</strong>
        </div>
        <div>
          <span>Files changed</span>
          <strong>{files}</strong>
        </div>
      </div>
      <pre className="agent-terminal">{terminal}</pre>
    </article>
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

function CommandModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="command-modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConnectorsModal() {
  return (
    <div className="stack">
      <p className="muted-copy">
        MCP connectors will let ForkLab agents access external tools/resources
        later. For this demo, we use built-in sample tasks.
      </p>
      <div className="grid two">
        {connectors.map(([name, status]) => (
          <div className="card" key={name}>
            <div className="status-row">
              <span className="badge warn">{status}</span>
            </div>
            <h3>{name}</h3>
            <p className="muted-copy">Connector wiring is planned after the BrowserPod proof path.</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilesModal({
  files,
  onFilesSelected,
}: {
  files: string[];
  onFilesSelected: (files: FileList | null) => void;
}) {
  return (
    <div className="stack">
      <p className="muted-copy">
        PDF/PNG ingestion is planned; sample context is used for this demo.
      </p>
      <label className="file-drop">
        <span>Select local file names</span>
        <input
          multiple
          type="file"
          onChange={(event) => onFilesSelected(event.target.files)}
        />
      </label>
      <div className="artifact-list">
        {(files.length ? files : ["No files selected yet"]).map((file) => (
          <div key={file}>
            <span>{file}</span>
            <strong>{files.length ? "selected" : "placeholder"}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillsModal() {
  return (
    <div className="stack">
      <p className="muted-copy">
        Skills are task-specific instructions that curate agent behaviour. For the
        demo, skills are represented as preset strategies.
      </p>
      <pre className="skill-preview">{`# SKILL.md
name: frontend-variant-agent
description: Generate and compare frontend implementation variants.`}</pre>
    </div>
  );
}

function modalTitle(modal: ModalType) {
  if (modal === "connectors") return "Add connectors";
  if (modal === "files") return "Add files / photos";
  return "Add skills.md";
}
