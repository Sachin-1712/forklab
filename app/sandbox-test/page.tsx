"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserPodStatusCard } from "@/components/BrowserPodStatusCard";
import { TerminalPanel } from "@/components/TerminalPanel";
import {
  bootForkLabPod,
  installBrowserPodRuntimeErrorGuard,
  makeStorageKey,
  toUserFacingError,
  writeTextFile,
  type PodStatus,
  type UserFacingError,
} from "@/lib/browserpod";

type BrowserDebugInfo = {
  isTopLevel: boolean;
  isSecureContext: boolean;
  crossOriginIsolated: boolean;
  href: string;
  userAgent: string;
};

export default function SandboxTestPage() {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<PodStatus>("idle");
  const [logs, setLogs] = useState<string[]>([
    "Ready. Click the button to boot a disposable BrowserPod sandbox.",
  ]);
  const [error, setError] = useState<UserFacingError | null>(null);
  const [debugInfo, setDebugInfo] = useState<BrowserDebugInfo | null>(null);

  useEffect(() => {
    const uninstallBrowserPodRuntimeErrorGuard =
      installBrowserPodRuntimeErrorGuard();

    setDebugInfo({
      isTopLevel: window.top === window,
      isSecureContext: window.isSecureContext,
      crossOriginIsolated: window.crossOriginIsolated,
      href: document.location.href,
      userAgent: navigator.userAgent,
    });

    return uninstallBrowserPodRuntimeErrorGuard;
  }, []);

  async function runSmokeTest() {
    setStatus("booting");
    setError(null);
    setLogs([
      "$ preparing BrowserPod smoke test",
      `crossOriginIsolated=${String(globalThis.crossOriginIsolated)}`,
    ]);

    if (terminalRef.current) {
      terminalRef.current.innerHTML = "";
    }

    try {
      const pod = await bootForkLabPod(makeStorageKey("forklab-smoke"));
      const terminal = await pod.createDefaultTerminal(terminalRef.current!);

      setStatus("writing-files");
      setLogs((current) => [
        ...current,
        "$ mkdir -p /forklab-smoke",
        "$ write /forklab-smoke/test.js",
      ]);
      await pod.createDirectory("/forklab-smoke", { recursive: true });
      await writeTextFile(
        pod,
        "/forklab-smoke/test.js",
        `console.log("ForkLab BrowserPod smoke test");\nconsole.log(2 + 2);\n`,
      );

      setStatus("running-command");
      setLogs((current) => [...current, "$ node test.js"]);
      await pod.run("node", ["test.js"], {
        terminal,
        cwd: "/forklab-smoke",
        echo: true,
      });

      setStatus("passed");
      localStorage.setItem("forklab:smoke-test-passed", "true");
      setLogs((current) => [
        ...current,
        "Passed: BrowserPod booted, wrote test.js, ran Node, and streamed output.",
      ]);
    } catch (caught) {
      setStatus("failed");
      const userError = toUserFacingError(caught);
      setError(userError);
      setLogs((current) => [...current, `Failed: ${userError.message}`]);
    }
  }

  return (
    <div className="stack">
      <header className="page-header">
        <p className="eyebrow">Phase 1 · Smoke Test</p>
        <h1>BrowserPod Smoke Test</h1>
        <p>
          This proves ForkLab can boot a disposable browser sandbox, write files,
          run code, and stream output.
        </p>
      </header>

      <div className="grid two">
        <BrowserPodStatusCard
          status={status}
          title="Smoke test pod"
          detail="Boots Node in BrowserPod, writes test.js, and runs it from the pod filesystem."
        />
        <div className="card">
          <h3>Run control</h3>
          <p style={{ color: "var(--outline)", fontSize: 13, marginBottom: 12 }}>
            The BrowserPod code runs in this client component using
            NEXT_PUBLIC_BROWSERPOD_API_KEY.
          </p>
          <button
            className="button primary"
            type="button"
            onClick={runSmokeTest}
            disabled={!["idle", "passed", "failed"].includes(status)}
          >
            ▶ Run BrowserPod Smoke Test
          </button>
        </div>
      </div>

      {/* ── Browser isolation debug ────────────────────────────── */}
      <section className="panel">
        <div className="status-row" style={{ marginBottom: 12 }}>
          <span className={`badge ${debugInfo?.crossOriginIsolated ? "ok" : "fail"}`}>
            {debugInfo?.crossOriginIsolated ? "✓" : "✗"} Cross-origin isolation
          </span>
          <span className={`badge ${debugInfo?.isTopLevel ? "ok" : "fail"}`}>
            {debugInfo?.isTopLevel ? "✓" : "✗"} Top-level tab
          </span>
        </div>

        {debugInfo && !debugInfo.isTopLevel ? (
          <div className="error-panel" style={{ marginBottom: 12 }}>
            Open this page in a real top-level browser tab, not an embedded IDE
            preview.
          </div>
        ) : null}

        <div className="diff" aria-label="Browser isolation debug values">
          <pre>{`window.top === window: ${String(debugInfo?.isTopLevel ?? "loading")}
window.isSecureContext: ${String(debugInfo?.isSecureContext ?? "loading")}
window.crossOriginIsolated: ${String(
            debugInfo?.crossOriginIsolated ?? "loading",
          )}
document.location.href: ${debugInfo?.href ?? "loading"}
navigator.userAgent: ${debugInfo?.userAgent ?? "loading"}`}</pre>
        </div>
      </section>

      <TerminalPanel title="/sandbox-test" nativeRef={terminalRef} lines={logs} />

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
