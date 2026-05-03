"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  branchPath,
  createRunId,
  createRunSnapshot,
  publishRunEvent,
  runPath,
  saveRunSnapshot,
} from "@/lib/runEvents";
import {
  createSandboxIssueBranchList,
  sandboxRepo,
  type SandboxIssue,
  type SandboxIssueId,
} from "@/lib/sandboxIssues";

const maxIssueSelection = 3;

export default function ArenaPage() {
  const router = useRouter();
  const [githubIssues, setGithubIssues] = useState<SandboxIssue[]>([]);
  const [issueSourceStatus, setIssueSourceStatus] = useState<
    "loading" | "github" | "error"
  >("loading");
  const [issueLoadMessage, setIssueLoadMessage] = useState<string>("");
  const [selectedIssueIds, setSelectedIssueIds] = useState<SandboxIssueId[]>([]);
  const visibleIssues = githubIssues;
  const selectedIssues = useMemo(
    () =>
      selectedIssueIds
        .map((issueId) => visibleIssues.find((issue) => issue.id === issueId))
        .filter((issue): issue is SandboxIssue => Boolean(issue)),
    [selectedIssueIds, visibleIssues],
  );
  const arenaPrompt = selectedIssues.length
    ? `Fix selected GitHub issues in ${sandboxRepo.owner}/${sandboxRepo.name}: ${selectedIssues
        .map((issue) => `#${issue.number}`)
        .join(", ")}.`
    : `Select up to ${maxIssueSelection} GitHub issues to run in parallel.`;

  useEffect(() => {
    let cancelled = false;

    async function loadIssues() {
      try {
        const response = await fetch("/api/issues/list", { cache: "no-store" });
        if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
        const payload = (await response.json()) as {
          source: "github" | "error";
          issues: SandboxIssue[];
          message?: string;
        };
        if (cancelled) return;
        setGithubIssues(payload.issues);
        setIssueSourceStatus(payload.source);
        setIssueLoadMessage(payload.message ?? "");
        if (payload.issues.length) {
          setSelectedIssueIds(
            payload.issues.slice(0, maxIssueSelection).map((issue) => issue.id),
          );
        }
      } catch (error) {
        if (cancelled) return;
        setIssueSourceStatus("error");
        setIssueLoadMessage(
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    void loadIssues();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleIssue(issueId: SandboxIssueId) {
    setSelectedIssueIds((current) => {
      if (current.includes(issueId)) {
        return current.filter((candidate) => candidate !== issueId);
      }
      if (current.length >= maxIssueSelection) return current;
      return [...current, issueId];
    });
  }

  function launchArena() {
    if (!selectedIssueIds.length) return;

    const runId = createRunId();
    const branches = createSandboxIssueBranchList(selectedIssues);
    let tabsBlocked = false;

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `forklab:run:${runId}:issues`,
          JSON.stringify(selectedIssues),
        );
      } catch {
        // ignore quota errors
      }
    }

    saveRunSnapshot(
      runId,
      createRunSnapshot({
        runId,
        prompt: arenaPrompt,
        branches,
        mode: "sandbox-issues",
        repoFullName: `${sandboxRepo.owner}/${sandboxRepo.name}`,
      }),
    );

    publishRunEvent(runId, {
      type: "run.created",
      message: `Sandbox GitHub issue run created for ${branches.length} selected issue${branches.length === 1 ? "" : "s"}.`,
      terminalLine: "$ run.created sandbox-github-issues",
    });

    branches.forEach((branch) => {
      const opened = window.open(
        `${branchPath(runId, branch.id)}?autostart=1`,
        "_blank",
      );
      if (!opened) tabsBlocked = true;
    });

    if (tabsBlocked) {
      publishRunEvent(runId, {
        type: "branch.failed",
        message:
          "One or more branch tabs were blocked. Open branches manually from the dashboard.",
        terminalLine: "$ popup blocked for one or more branches",
      });
    }

    router.push(runPath(runId));
  }

  return (
    <div className="arena-shell">
      <header className="workbench-hero">
        <div>
          <p className="eyebrow">GitHub Issues Arena</p>
          <h1>Select issues. Run up to 3 in parallel.</h1>
          <p className="muted-copy">
            ForkLab reads issues and target source files from the real
            sandbox GitHub repo. Pick simple issues, launch isolated BrowserPod
            branches, and verify each patch before trusting it.
          </p>
        </div>
        <div className="status-row">
          <span className={`badge ${issueSourceStatus === "github" ? "ok" : "warn"}`}>
            {issueSourceStatus === "github"
              ? "GitHub issues live"
              : issueSourceStatus === "loading"
                ? "loading"
                : "GitHub unreachable"}
          </span>
          <span className="badge info">{visibleIssues.length} open issues</span>
          <span className="badge warn">Max 3 selected</span>
        </div>
      </header>

      <section className="proof-banner">
        GitHub-style issues. Parallel BrowserPod branches. Verified before accept.
      </section>

      <div className="issue-arena-layout">
        <aside className="card stack issue-sidebar">
          <div>
            <p className="eyebrow">Repository</p>
            <h2>{sandboxRepo.name}</h2>
            <p className="muted-copy">
              {sandboxRepo.owner}/{sandboxRepo.name} on {sandboxRepo.defaultBranch}
            </p>
          </div>

          <div className="repo-connect-panel">
            <div>
              <span>GitHub connector</span>
              <strong>
                {issueSourceStatus === "github"
                  ? "Sandbox issues loaded from demo repo"
                  : issueSourceStatus === "loading"
                    ? "Loading GitHub"
                    : "GitHub unreachable"}
              </strong>
            </div>
            <a
              className="button"
              href={`https://github.com/${sandboxRepo.owner}/${sandboxRepo.name}/issues`}
              target="_blank"
            >
              Open GitHub
            </a>
          </div>

          {issueSourceStatus === "error" ? (
            <div className="info-callout">
              ForkLab could not reach GitHub issues
              {issueLoadMessage ? `: ${issueLoadMessage}` : "."} Refresh after
              GitHub access is available.
            </div>
          ) : null}
          {issueSourceStatus === "github" && visibleIssues.length === 0 ? (
            <div className="info-callout">
              No open issues with a detectable filename. Issue titles or bodies
              must mention a JavaScript/TypeScript filename for ForkLab to
              locate the patch target.
            </div>
          ) : null}

          <div className="issue-list-header">
            <span>Open issues</span>
            <strong>
              {selectedIssueIds.length}/{maxIssueSelection} selected
            </strong>
          </div>

          <div className="issue-list" aria-label="Sandbox GitHub issues">
            {visibleIssues.map((issue) => {
              const selected = selectedIssueIds.includes(issue.id);
              const disabled =
                !selected && selectedIssueIds.length >= maxIssueSelection;

              return (
                <label
                  className={`issue-row${selected ? " selected" : ""}${
                    disabled ? " disabled" : ""
                  }`}
                  key={issue.id}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={disabled}
                    onChange={() => toggleIssue(issue.id)}
                  />
                  <span>
                    <strong>
                      #{issue.number} {issue.title}
                    </strong>
                    <small>{issue.summary}</small>
                    <em>
                      {[...issue.labels, issue.targetFile]
                        .filter(Boolean)
                        .join(" / ")}
                    </em>
                  </span>
                </label>
              );
            })}
          </div>
        </aside>

        <section className="card stack">
          <div>
            <p className="eyebrow">Task input</p>
            <h2>Parallel issue run</h2>
            <p className="muted-copy">
              Selected issues become isolated branches. Each branch writes a
              tiny repo slice, runs the failing test, asks the server-side LLM
              planner for a patch, applies it, reruns tests, and reports proof
              back to the dashboard.
            </p>
          </div>
          <div className="prompt-box">
            <textarea
              aria-label="Arena task prompt"
              readOnly
              value={arenaPrompt}
            />
            <div className="prompt-actions">
              <button
                className="button primary"
                type="button"
                onClick={launchArena}
                disabled={!selectedIssueIds.length}
              >
                Launch selected issues
              </button>
              <Link className="button" href="/workbench">
                Open enterprise workbench
              </Link>
            </div>
            <p className="prompt-helper">
              For the live demo, allow popups. ForkLab opens one tab per
              selected issue branch.
            </p>
          </div>
        </section>

        <section className="card stack">
          <div>
            <p className="eyebrow">Demo repo contents</p>
            <h2>Simple patch targets</h2>
          </div>
          <div className="artifact-list">
            {selectedIssues.map((issue) => (
              <div key={issue.id}>
                <span>#{issue.number}</span>
                <strong>{issue.targetFile}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="truth-panel">
        <div>
          <p className="eyebrow">Issue branch examples</p>
          <h2>Built for a reliable live demo</h2>
        </div>
        <div className="agent-grid">
          {selectedIssues.map((issue) => (
            <article className="agent-card" key={issue.id}>
              <div className="status-row">
                <span className="badge info">
                  #{issue.number}
                </span>
                <span className="badge">Risk: {issue.risk}</span>
              </div>
              <h3>{issue.title}</h3>
              <p>{issue.body}</p>
              <div className="agent-meta">
                <div>
                  <span>Target</span>
                  <strong>{issue.targetFile}</strong>
                </div>
              </div>
              <pre className="agent-terminal">{`$ npm test
FAIL issue regression
$ POST /api/issues/plan-patch
$ npm test
PASS all checks
$ npm run build
PASS preview artifact`}</pre>
            </article>
          ))}
        </div>
      </section>

      <section className="truth-panel">
        <div>
          <p className="eyebrow">What is real?</p>
          <h2>Execution boundary</h2>
        </div>
        <div className="truth-grid">
          <TruthItem
            label="Real"
            text="Each selected issue opens a tab and boots its own BrowserPod instance."
          />
          <TruthItem
            label="Real"
            text="Each issue branch writes sandbox repo files, runs failing tests, calls a server-only LLM planner, applies a patch, reruns tests, and runs a build script."
          />
          <TruthItem
            label="Real"
            text="The issue list and target source files are loaded from Jyozaa/forklab-sandbox-issues on GitHub; ForkLab supplies the demo test harness."
          />
          <TruthItem
            label="Preview"
            text="Connecting arbitrary real GitHub repos is still a future extension."
          />
        </div>
      </section>
    </div>
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
