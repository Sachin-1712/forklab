"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import {
  bootForkLabPod,
  installBrowserPodRuntimeErrorGuard,
  makeStorageKey,
  readTextFile,
  toUserFacingError,
  writeTextFile,
  type BrowserPodInstance,
  type UserFacingError,
} from "@/lib/browserpod";
import {
  arenaLiveDefaultTask,
  arenaLiveIssues,
  requestedArenaLiveIds,
  type ArenaLiveGenerateResponse,
  type ArenaLiveProvider,
  type ArenaLiveVariant,
  type ArenaLiveVariantId,
} from "@/lib/llm/arenaLiveSchema";
import {
  arenaLiveFolder,
  arenaLivePortById,
  arenaLiveRepo,
  createArenaLiveFiles,
  fileContent,
} from "@/lib/arenaLiveProject";

type LiveStatus =
  | "queued"
  | "generating"
  | "files-generated"
  | "booting BrowserPod"
  | "writing files"
  | "installing packages"
  | "running tests"
  | "starting server"
  | "portal ready"
  | "failed"
  | "fallback";

type Runtime = "Not run" | "BrowserPod / Express" | "BrowserPod / Node fallback";

type PortalEvent = {
  url: string;
  port: number;
};

type PodWithPortal = BrowserPodInstance & {
  onPortal?: (callback: (event: PortalEvent) => void) => void;
};

type VariantCardState = ArenaLiveVariant & {
  provider: "gemini" | "groq" | "fallback";
  isFallback: boolean;
  status: LiveStatus;
  runtime: Runtime;
  logs: string[];
  filesWritten: string[];
  previewUrl?: string;
  nonce: string;
  nonceReturned?: string;
  proofCommand?: string;
  portalCaptured: boolean;
  bootedAt?: string;
  note: string;
};

type TimelineEvent = {
  id: string;
  label: string;
  detail: string;
  time: string;
  tone: "ok" | "info" | "warn" | "fail";
};

type ModalType = "files" | "mcp" | "connectors" | "skills" | null;

function nowLabel() {
  return new Date().toLocaleTimeString();
}

export default function ArenaLivePage() {
  const terminalRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const portalCaches = useRef<Record<string, PortalEvent[]>>({});
  const [issueId, setIssueId] = useState("201");
  const [task, setTask] = useState(arenaLiveDefaultTask);
  const [variantCount, setVariantCount] = useState(3);
  const [provider, setProvider] = useState<ArenaLiveProvider>("gemini");
  const [safeMode, setSafeMode] = useState(false);
  const [parallelMode, setParallelMode] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [mounted, setMounted] = useState(false);
  const [isIsolated, setIsIsolated] = useState<string>("pending");
  const [connectorMessage, setConnectorMessage] = useState(
    "Built-in sandbox repo is active for this run.",
  );
  const [cards, setCards] = useState<Record<string, VariantCardState>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [timeline, setTimeline] = useState<TimelineEvent[]>([
    {
      id: "ready",
      label: "Arena ready",
      detail: "Select an issue or edit the prompt, then launch variants.",
      time: "ready",
      tone: "info",
    },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<UserFacingError | null>(null);

  useEffect(() => {
    setMounted(true);
    setIsIsolated(String(window.crossOriginIsolated));
    return installBrowserPodRuntimeErrorGuard();
  }, []);

  const cardList = useMemo(
    () => requestedArenaLiveIds(variantCount).map((id) => cards[id]).filter(Boolean),
    [cards, variantCount],
  );

  const summary = useMemo(() => {
    const generated = cardList.filter((card) => card.status !== "queued").length;
    const portals = cardList.filter((card) => card.status === "portal ready").length;
    const failures = cardList.filter((card) => card.status === "failed").length;

    return { generated, portals, failures };
  }, [cardList]);
  const portalCards = useMemo(
    () => cardList.filter((card) => Boolean(card.previewUrl)),
    [cardList],
  );

  function selectIssue(nextIssueId: string) {
    setIssueId(nextIssueId);
    const issue = arenaLiveIssues.find((item) => item.id === nextIssueId);
    if (issue) setTask(issue.prompt);
  }

  function toggleParallel(nextValue: boolean) {
    setParallelMode(nextValue);
    if (nextValue) setSafeMode(false);
  }

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const abortControllerRef = useRef<AbortController | null>(null);

  function stopRun() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
    pushEvent("Run stopped by user", "Existing BrowserPod process may finish, but ForkLab stopped orchestration.", "warn");
  }

  async function launchVariants() {
    setIsRunning(true);
    setError(null);
    setTimeline([]);
    pushEvent("Prompt submitted", task, "info");
    abortControllerRef.current = new AbortController();

    const requestedIds = requestedArenaLiveIds(variantCount);
    setCards(
      Object.fromEntries(
        requestedIds.map((id) => [
          id,
          createQueuedCard(id, queuedProvider(provider)),
        ]),
      ),
    );
    setExpanded(new Set(requestedIds.slice(0, safeMode ? 1 : requestedIds.length)));

    try {
      const response = await fetch("/api/arena-live/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          task,
          issueId,
          variantCount,
          provider,
        }),
      });

      if (!response.ok) {
        const detail = (await response.json()) as { message?: string };
        throw new Error(detail.message || "Arena Live generation failed.");
      }

      const payload = (await response.json()) as ArenaLiveGenerateResponse;
      const generatedCards = Object.fromEntries(
        payload.variants.map((variant) => [
          variant.id,
          createGeneratedCard(variant, payload.provider, payload.isFallback),
        ]),
      );
      setCards(generatedCards);
      pushEvent(
        "LLM generated files",
        `${payload.variants.length} variants from ${payload.provider}${
          payload.isFallback ? " fallback" : ""
        }.`,
        payload.isFallback ? "warn" : "ok",
      );

      await nextPaint();

      const liveVariants = safeMode
        ? payload.variants.slice(0, 1)
        : payload.variants;

      if (parallelMode) {
        pushEvent(
          "Parallel run requested",
          "ForkLab will attempt one BrowserPod instance per variant.",
          "info",
        );
        await Promise.allSettled(liveVariants.map((variant) => {
          if (abortControllerRef.current?.signal.aborted) return Promise.resolve();
          return runVariant(variant);
        }));
      } else {
        for (const variant of liveVariants) {
          if (abortControllerRef.current?.signal.aborted) break;
          await runVariant(variant);
        }
      }

      for (const variant of payload.variants) {
        if (!liveVariants.some((liveVariant) => liveVariant.id === variant.id)) {
          appendLog(variant.id, "$ generated variant queued by Safe Mode");
          updateCard(variant.id, {
            note: "Generated but not run. Safe Mode ran one live BrowserPod Portal.",
          });
        }
      }
    } catch (caught: any) {
      if (caught.name === "AbortError") return;
      const userError = toUserFacingError(caught);
      setError(userError);
      pushEvent("Run failed", userError.message, "fail");
    } finally {
      setIsRunning(false);
    }
  }

  async function runVariant(variant: ArenaLiveVariant) {
    if (abortControllerRef.current?.signal.aborted) return;
    const nonce = makeNonce();
    const folder = arenaLiveFolder(variant.id);
    const port = arenaLivePortById[variant.id];
    const terminalNode =
      terminalRefs.current[variant.id] ?? document.createElement("div");

    updateCard(variant.id, {
      status: "booting BrowserPod",
      nonce,
      bootedAt: new Date().toISOString(),
      note: "Booting an isolated BrowserPod sandbox for this variant.",
    });
    appendLog(variant.id, "$ boot BrowserPod");
    pushEvent(`${variant.title} booting`, folder, "info");

    try {
      const pod = await bootForkLabPod(
        makeStorageKey(`forklab-arena-live-${variant.id}`),
      );
      const terminal = await pod.createDefaultTerminal(terminalNode);
      const waitForPortal = watchPortal(variant.id, pod);

      updateCard(variant.id, {
        status: "writing files",
        runtime: "BrowserPod / Express",
        note: "Writing generated repo files into BrowserPod.",
      });
      appendLog(variant.id, "$ mkdir -p public");
      pushEvent(`${variant.title} files written`, "Writing package, server, proof, HTML, and CSS.", "info");

      await writeProject(pod, variant, nonce, "express");

      updateCard(variant.id, {
        status: "installing packages",
        note: "Running npm install for Express.",
      });
      appendLog(variant.id, "$ npm install");
      pushEvent(`${variant.title} npm install`, "Installing Express dependency.", "info");

      try {
        await pod.run("npm", ["install"], {
          terminal,
          cwd: folder,
          echo: true,
        });
      } catch (installError) {
        appendLog(
          variant.id,
          `Express install failed: ${errorMessage(installError)}`,
        );
        appendLog(variant.id, "$ rewrite server.js with Node http fallback");
        pushEvent(
          `${variant.title} fallback`,
          "Express install failed; Node http fallback used.",
          "warn",
        );
        updateCard(variant.id, {
          status: "fallback",
          runtime: "BrowserPod / Node fallback",
          note: "Express install failed; Node http fallback used.",
        });
        await writeProject(pod, variant, nonce, "node-http");
      }

      updateCard(variant.id, {
        status: "running tests",
        proofCommand: "npm test",
        note: "Running nonce proof script inside BrowserPod.",
      });
      appendLog(variant.id, "$ npm test");
      pushEvent(`${variant.title} proof`, "Running npm test nonce proof.", "info");
      await pod.run("npm", ["test"], { terminal, cwd: folder, echo: true });

      const proofRaw = await readTextFile(pod, `${folder}/proof-result.json`);
      const proof = JSON.parse(proofRaw) as { nonce?: string };
      const nonceReturned = proof.nonce ?? "";
      updateCard(variant.id, {
        nonceReturned,
        note:
          nonceReturned === nonce
            ? "Nonce proof returned from BrowserPod."
            : "Nonce proof mismatch. Runtime is not verified.",
      });
      appendLog(variant.id, `FORKLAB_VARIANT_NONCE:${nonceReturned}`);

      updateCard(variant.id, {
        status: "starting server",
        note: "Starting the static server and waiting for onPortal.",
      });
      appendLog(variant.id, `$ PORT=${port} npm run start`);
      pushEvent(`${variant.title} server start`, `PORT=${port} npm run start`, "info");

      const outcome = await startServerAndWait({
        pod,
        terminal,
        cwd: folder,
        port,
        waitForPortal,
      });

      if (outcome.kind === "portal") {
        updateCard(variant.id, {
          status: "portal ready",
          previewUrl: outcome.portal.url,
          portalCaptured: true,
          note: "Portal URL captured and runtime verified.",
        });
        appendLog(variant.id, `Portal ready: ${outcome.portal.url}`);
        pushEvent(`${variant.title} portal ready`, outcome.portal.url, "ok");
        return;
      }

      updateCard(variant.id, {
        status: "failed",
        note:
          outcome.kind === "timeout"
            ? "Server started, but BrowserPod did not report a Portal URL before timeout."
            : "Server command exited before a Portal URL was reported.",
      });
      appendLog(
        variant.id,
        outcome.kind === "timeout"
          ? "No Portal URL reported before timeout."
          : "Server exited before Portal URL was reported.",
      );
      pushEvent(`${variant.title} portal missing`, "No Portal URL captured.", "warn");
    } catch (caught) {
      const message = errorMessage(caught);
      updateCard(variant.id, {
        status: "failed",
        note: message,
      });
      appendLog(variant.id, `Failed: ${message}`);
      pushEvent(`${variant.title} failed`, message, "fail");
    }
  }

  async function writeProject(
    pod: BrowserPodInstance,
    variant: ArenaLiveVariant,
    nonce: string,
    runtime: "express" | "node-http",
  ) {
    const folder = arenaLiveFolder(variant.id);
    const files = createArenaLiveFiles(variant, nonce, runtime);

    await pod.createDirectory(`${folder}/public`, { recursive: true });

    for (const file of files) {
      await writeTextFile(pod, `${folder}/${file.path}`, file.content);
      appendLog(variant.id, `$ write ${file.path}`);
    }

    updateCard(variant.id, {
      filesWritten: files.map((file) => file.path),
    });
  }

  function watchPortal(id: ArenaLiveVariantId, pod: BrowserPodInstance) {
    const podWithPortal = pod as PodWithPortal;
    const listeners = new Set<(event: PortalEvent) => void>();
    portalCaches.current[id] = [];

    if (typeof podWithPortal.onPortal === "function") {
      podWithPortal.onPortal((event) => {
        const portal = { url: event.url, port: event.port };
        portalCaches.current[id] = [...(portalCaches.current[id] ?? []), portal];
        appendLog(id, `onPortal port=${portal.port} url=${portal.url}`);
        listeners.forEach((listener) => listener(portal));
      });
    } else {
      appendLog(id, "BrowserPod onPortal callback is not available.");
    }

    return (port: number, timeoutMs: number) =>
      new Promise<PortalEvent | null>((resolve) => {
        const cached = portalCaches.current[id]?.find((event) => event.port === port);
        if (cached) {
          resolve(cached);
          return;
        }

        const listener = (event: PortalEvent) => {
          if (event.port !== port) return;
          window.clearTimeout(timeout);
          listeners.delete(listener);
          resolve(event);
        };
        const timeout = window.setTimeout(() => {
          listeners.delete(listener);
          resolve(null);
        }, timeoutMs);

        listeners.add(listener);
      });
  }

  async function startServerAndWait({
    pod,
    terminal,
    cwd,
    port,
    waitForPortal,
  }: {
    pod: BrowserPodInstance;
    terminal: unknown;
    cwd: string;
    port: number;
    waitForPortal: (port: number, timeoutMs: number) => Promise<PortalEvent | null>;
  }) {
    const outcomes: Array<
      Promise<
        | { kind: "portal"; portal: PortalEvent }
        | { kind: "timeout" }
        | { kind: "exited" }
        | { kind: "failed"; runError: unknown }
      >
    > = [
      waitForPortal(port, 40000).then((portal) =>
        portal ? { kind: "portal", portal } : { kind: "timeout" },
      ),
    ];

    const maybeRun = pod.run("npm", ["run", "start"], {
      terminal,
      cwd,
      echo: true,
      env: [`PORT=${port}`],
    }) as unknown;

    if (isPromiseLike(maybeRun)) {
      outcomes.push(
        Promise.resolve(maybeRun)
          .then(() => ({ kind: "exited" as const }))
          .catch((runError: unknown) => ({ kind: "failed" as const, runError })),
      );
    }

    const outcome = await Promise.race(outcomes);
    if (outcome.kind === "failed") throw outcome.runError;
    return outcome;
  }

  function updateCard(id: ArenaLiveVariantId, patch: Partial<VariantCardState>) {
    setCards((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  }

  function appendLog(id: ArenaLiveVariantId, line: string) {
    setCards((current) => {
      const card = current[id];
      if (!card) return current;
      return {
        ...current,
        [id]: {
          ...card,
          logs: [...card.logs, line],
        },
      };
    });
  }

  function pushEvent(
    label: string,
    detail: string,
    tone: TimelineEvent["tone"],
  ) {
    setTimeline((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        label,
        detail,
        time: nowLabel(),
        tone,
      },
    ]);
  }

  return (
    <div className="arena-live-shell">
      <header className="arena-live-hero">
        <div>
          <p className="eyebrow">Live Variant Arena</p>
          <h1>Live Variant Arena</h1>
          <p className="muted-copy">
            Prompt once. Generate frontend variants. Run them in isolated
            BrowserPod sandboxes.
          </p>
        </div>
        <div className="status-row">
          <span className="badge ok">Server-side LLM keys</span>
          <span className="badge info">BrowserPod portals</span>
          <span className="badge warn">Honest fallback states</span>
        </div>
      </header>

      <section className="arena-live-layout">
        <aside className="arena-live-side stack">
          <section className="card stack">
            <div>
              <p className="eyebrow">Sandbox repo</p>
              <h2>{arenaLiveRepo.name}</h2>
              <p className="muted-copy">
                Stack: {arenaLiveRepo.stack}. Source: {arenaLiveRepo.source}.
              </p>
            </div>
            <div className="connector-grid">
              <button
                className="provider-option selected"
                type="button"
                onClick={() =>
                  setConnectorMessage("Built-in sandbox repo is active for this run.")
                }
              >
                Built-in sample repo
              </button>
              <button
                className="provider-option"
                type="button"
                onClick={() =>
                  setConnectorMessage(
                    "GitHub MCP is planned. This route uses a built-in sandbox repo with issue/task metadata. In production, GitHub MCP would import repo files, issues, and PR context.",
                  )
                }
              >
                GitHub MCP
              </button>
              <button
                className="provider-option"
                type="button"
                onClick={() =>
                  setConnectorMessage(
                    "Upload ZIP is planned. A production flow would unpack files, detect the frontend entrypoint, and run variants in BrowserPod.",
                  )
                }
              >
                Upload ZIP
              </button>
            </div>
            <p className="info-callout">{connectorMessage}</p>
          </section>

          <section className="card stack">
            <div>
              <p className="eyebrow">Issue selector</p>
              <h2>Task context</h2>
            </div>
            <div className="issue-list">
              {arenaLiveIssues.map((issue) => (
                <button
                  className={`issue-button${issueId === issue.id ? " selected" : ""}`}
                  key={issue.id}
                  type="button"
                  onClick={() => selectIssue(issue.id)}
                >
                  {issue.label}
                </button>
              ))}
            </div>
          </section>

          <section className="truth-panel compact-panel">
            <div>
              <p className="eyebrow">Event timeline</p>
              <h2>Run progress</h2>
            </div>
            <div className="run-event-list compact-events">
              {timeline.map((event) => (
                <div className="run-event" key={event.id}>
                  <span>{event.time}</span>
                  <strong>{event.label}</strong>
                  <p>{event.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="truth-panel compact-panel">
            <div>
              <p className="eyebrow">BrowserPod proof</p>
              <h2>Runtime evidence</h2>
            </div>
            <div className="truth-list">
              <TruthRow
                label="Real"
                text={`crossOriginIsolated: ${isIsolated}`}
              />
              <TruthRow
                label="Real"
                text={`Command executed: ${cardList.find((card) => card.proofCommand)?.proofCommand ?? "pending"}`}
              />
              <TruthRow
                label="Real"
                text={`Files written: ${cardList.flatMap((card) => card.filesWritten).length}`}
              />
              <TruthRow
                label="Real"
                text={`Nonce generated: ${cardList.find((card) => card.nonce)?.nonce ?? "pending"}`}
              />
              <TruthRow
                label="Real"
                text={`Nonce returned: ${cardList.find((card) => card.nonceReturned)?.nonceReturned ?? "pending"}`}
              />
              <TruthRow
                label="Real"
                text={`Portal captured: ${cardList.some((card) => card.portalCaptured) ? "yes" : "pending"}`}
              />
              <TruthRow
                label="Planned"
                text="GitHub MCP import, ZIP upload, repo-wide parsing, and production PR creation are not connected in this route."
              />
            </div>
          </section>

          <section className="truth-panel compact-panel portal-summary">
            <div>
              <p className="eyebrow">BrowserPod Portal links</p>
              <h2>Live URLs</h2>
            </div>
            {portalCards.length ? (
              <div className="portal-summary-grid">
                {portalCards.map((card) => (
                  <a
                    className="portal-summary-link"
                    href={card.previewUrl}
                    key={card.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>{card.title}</span>
                    <strong>{card.previewUrl}</strong>
                    <small>
                      {card.runtime} - port {arenaLivePortById[card.id]}
                    </small>
                  </a>
                ))}
              </div>
            ) : (
              <div className="run-empty-state">
                BrowserPod Portal links appear after onPortal reports a URL.
              </div>
            )}
          </section>
        </aside>

        <main className="arena-live-main stack">
          <section className="arena-chat card">
            <div className="chat-header">
              <div>
                <p className="eyebrow">ForkLab agent prompt</p>
                <h2>Describe the frontend variants</h2>
              </div>
              <div className="status-row">
                <span className="badge info">Issue #{issueId}</span>
                <span className="badge ok">crossOriginIsolated: client</span>
              </div>
            </div>
            <textarea
              aria-label="Ask ForkLab to generate frontend variants"
              placeholder="Ask ForkLab to generate frontend variants..."
              value={task}
              onChange={(event) => setTask(event.target.value)}
            />
            <div className="arena-chat-controls">
              <button className="button" type="button" onClick={() => setModal("files")}>
                Add files
              </button>
              <button className="button" type="button" onClick={() => setModal("mcp")}>
                Add MCP
              </button>
              <button className="button" type="button" onClick={() => setModal("skills")}>
                Add skills.md
              </button>
              <label>
                <span>Provider</span>
                <select
                  value={provider}
                  onChange={(event) =>
                    setProvider(event.target.value as ArenaLiveProvider)
                  }
                  disabled={isRunning}
                >
                  <option value="gemini">Gemini</option>
                  <option value="groq">Groq</option>
                  <option value="auto">Auto</option>
                  <option value="fallback">Fallback</option>
                </select>
              </label>
            </div>
            <div className="arena-launch-row">
              <label className="badge">
                <input
                  checked={safeMode}
                  disabled={isRunning || parallelMode}
                  onChange={(event) => setSafeMode(event.target.checked)}
                  type="checkbox"
                />{" "}
                Safe Mode: {safeMode ? "ON" : "OFF"}
              </label>
              <label className="badge">
                <input
                  checked={parallelMode}
                  disabled={isRunning}
                  onChange={(event) => toggleParallel(event.target.checked)}
                  type="checkbox"
                />{" "}
                Run variants in parallel
              </label>
              {isRunning ? (
                <button
                  className="button destructive outline"
                  onClick={() => stopRun()}
                  type="button"
                >
                  Stop Run
                </button>
              ) : (
                <button
                  className="button primary"
                  disabled={!task.trim()}
                  onClick={launchVariants}
                  type="button"
                >
                  Run Agent
                </button>
              )}
            </div>
            <p className="prompt-helper">
              Describe the feature, audience, and constraints. ForkLab will generate implementation branches and verify them in BrowserPod.
            </p>
          </section>

          <section className="run-summary-grid">
            <MetricCard label="Variants requested" value={String(variantCount)} />
            <MetricCard label="Variants generated" value={String(summary.generated)} />
            <MetricCard
              label="BrowserPod portals ready"
              value={String(summary.portals)}
            />
            <MetricCard label="Failures" value={String(summary.failures)} />
          </section>

          {Object.keys(cards).length === 0 ? (
            <section className="card stack">
              <div>
                <p className="eyebrow">Run plan</p>
                <h2>Waiting for prompt</h2>
              </div>
              <p className="muted-copy">Planned branches:</p>
              <ul>
                <li>Enterprise Trust</li>
                <li>Startup Conversion</li>
                <li>Developer Minimal</li>
              </ul>
            </section>
          ) : (
            <section className="arena-live-cards">
              {requestedArenaLiveIds(variantCount).map((id) => {
                const card = cards[id] ?? createQueuedCard(id, queuedProvider(provider));
                const isExpanded = expanded.has(id);
                return (
                  <article className="arena-live-card" key={id}>
                    <div className="arena-live-card-head">
                      <div>
                        <div className="status-row">
                          <span className={`badge ${statusTone(card.status)}`}>
                            {card.status}
                          </span>
                          <span className="badge info">{card.provider}</span>
                          {card.isFallback ? (
                            <span className="badge warn">fallback</span>
                          ) : null}
                        </div>
                        <h3>{card.title}</h3>
                        <p>{card.strategy}</p>
                      </div>
                      <button
                        className="button"
                        type="button"
                        onClick={() => toggleExpanded(id)}
                      >
                        {isExpanded ? "Collapse" : "Expand"}
                      </button>
                    </div>

                    <div className="arena-card-facts">
                      <Fact label="Audience" value={card.audience} />
                      <Fact label="Runtime" value={card.runtime} />
                      <Fact label="Files" value={card.filesWritten.length ? `${card.filesWritten.length} written` : "waiting"} />
                      <Fact
                        label="Nonce proof"
                        value={
                          card.nonceReturned && card.nonceReturned === card.nonce
                            ? "verified"
                            : card.nonce
                              ? "pending"
                              : "not started"
                        }
                      />
                    </div>

                    {card.previewUrl ? (
                      <a
                        className="preview-link"
                        href={card.previewUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open BrowserPod Portal
                      </a>
                    ) : null}

                    <p className="muted-copy">{card.note}</p>

                    {isExpanded ? (
                      <div className="arena-card-expanded">
                        <div className="arena-card-terminal">
                          <div
                            className="terminal-native compact"
                            ref={(node) => {
                              terminalRefs.current[id] = node;
                            }}
                          />
                          <pre>{card.logs.join("\n")}</pre>
                        </div>
                        <div className="arena-file-preview">
                          <div>
                            <span className="badge info">public/index.html</span>
                            <pre>
                              {fileContent(card.files, "public/index.html") ||
                                "Waiting for generated HTML."}
                            </pre>
                          </div>
                          <div>
                            <span className="badge info">public/styles.css</span>
                            <pre>
                              {fileContent(card.files, "public/styles.css") ||
                                "Waiting for generated CSS."}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          )}

        </main>
      </section>

      {mounted && modal
        ? createPortal(
            <ArenaLiveModal title={modalTitle(modal)} onClose={() => setModal(null)}>
              {modal === "files" ? <FilesModal /> : null}
              {modal === "mcp" ? <McpModal /> : null}
              {modal === "connectors" ? <ConnectorsModal /> : null}
              {modal === "skills" ? <SkillsModal /> : null}
            </ArenaLiveModal>,
            document.body,
          )
        : null}

      {error ? (
        <section className="error-panel" aria-live="polite">
          <h3>{error.title}</h3>
          <p>{error.message}</p>
          <ul>
            {error.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TruthRow({ label, text }: { label: "Real" | "Planned"; text: string }) {
  return (
    <div className="truth-row">
      <span className={`badge ${label === "Real" ? "ok" : "info"}`}>{label}</span>
      <p>{text}</p>
    </div>
  );
}

function ArenaLiveModal({
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
      <div className="command-modal arena-live-modal">
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

function FilesModal() {
  return (
    <div className="stack">
      <p className="muted-copy">
        Add local file names to the context tray. File parsing remains controlled
        by ForkLab, and generated code is still validated before BrowserPod runs.
      </p>
      <label className="file-drop">
        <span>Select local files</span>
        <input multiple type="file" />
      </label>
      <div className="artifact-list">
        <div>
          <span>Accepted now</span>
          <strong>names only</strong>
        </div>
        <div>
          <span>Runtime source</span>
          <strong>built-in repo</strong>
        </div>
      </div>
    </div>
  );
}

function McpModal() {
  return (
    <div className="stack">
      <p className="muted-copy">
        MCP connections are planned for repository and issue context. This run
        uses the built-in Acme landing repo so the BrowserPod proof stays
        repeatable.
      </p>
      <div className="artifact-list">
        <div>
          <span>GitHub MCP</span>
          <strong>planned</strong>
        </div>
        <div>
          <span>Linear MCP</span>
          <strong>planned</strong>
        </div>
        <div>
          <span>Figma MCP</span>
          <strong>planned</strong>
        </div>
      </div>
    </div>
  );
}

function ConnectorsModal() {
  return (
    <div className="stack">
      <p className="muted-copy">
        Connector slots show where production ForkLab would pull repo files,
        issues, and design context. Nothing external is connected in this route.
      </p>
      <div className="artifact-list">
        <div>
          <span>Built-in sandbox repo</span>
          <strong>active</strong>
        </div>
        <div>
          <span>GitHub</span>
          <strong>planned</strong>
        </div>
        <div>
          <span>ZIP upload</span>
          <strong>planned</strong>
        </div>
      </div>
    </div>
  );
}

function SkillsModal() {
  return (
    <div className="stack">
      <p className="muted-copy">
        Skills define generation constraints for enterprise, conversion, and
        developer-focused variants.
      </p>
      <pre className="skill-preview">{`# skills.md
- Generate static HTML and CSS only.
- Use system fonts and local assets.
- Keep every variant runnable in BrowserPod.
- Preserve human-readable proof logs.`}</pre>
    </div>
  );
}

function modalTitle(modal: Exclude<ModalType, null>) {
  if (modal === "files") return "Add files";
  if (modal === "mcp") return "Add MCP";
  if (modal === "connectors") return "Add connectors";
  return "Add skills.md";
}

function createQueuedCard(
  id: ArenaLiveVariantId,
  provider: VariantCardState["provider"],
): VariantCardState {
  return {
    id,
    title: idToTitle(id),
    strategy: "Waiting for generation.",
    summary: "Queued.",
    audience: "Pending",
    files: [],
    provider,
    isFallback: provider === "fallback",
    status: "queued",
    runtime: "Not run",
    logs: ["Queued."],
    filesWritten: [],
    nonce: "",
    portalCaptured: false,
    note: "Ready to generate.",
  };
}

function queuedProvider(provider: ArenaLiveProvider): VariantCardState["provider"] {
  if (provider === "groq") return "groq";
  if (provider === "fallback") return "fallback";
  return "gemini";
}

function createGeneratedCard(
  variant: ArenaLiveVariant,
  provider: VariantCardState["provider"],
  isFallback: boolean,
): VariantCardState {
  return {
    ...variant,
    provider,
    isFallback,
    status: "files-generated",
    runtime: "Not run",
    logs: [
      `$ generated ${variant.id}`,
      `provider=${provider}${isFallback ? " fallback" : ""}`,
    ],
    filesWritten: variant.files.map((file) => file.path),
    nonce: "",
    portalCaptured: false,
    note: isFallback
      ? "Deterministic fallback files generated. Not claimed as LLM output."
      : "LLM-generated files are ready for BrowserPod.",
  };
}

function idToTitle(id: ArenaLiveVariantId) {
  if (id === "enterprise-trust") return "Enterprise Trust";
  if (id === "startup-conversion") return "Startup Conversion";
  return "Developer Minimal";
}

function statusTone(status: LiveStatus) {
  if (status === "portal ready") return "ok";
  if (
    status === "booting BrowserPod" ||
    status === "writing files" ||
    status === "installing packages" ||
    status === "running tests" ||
    status === "starting server"
  ) {
    return "info";
  }
  if (status === "failed") return "fail";
  if (status === "fallback") return "warn";
  return "";
}

function makeNonce() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `nonce-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return Boolean(
    value &&
      (typeof value === "object" || typeof value === "function") &&
      "then" in value &&
      typeof (value as { then?: unknown }).then === "function",
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function nextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
