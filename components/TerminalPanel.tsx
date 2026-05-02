"use client";

import type { RefObject } from "react";

export function TerminalPanel({
  title,
  nativeRef,
  lines,
}: {
  title: string;
  nativeRef?: RefObject<HTMLDivElement | null>;
  lines?: string[];
}) {
  return (
    <div className="terminal-panel">
      <div className="terminal-title">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="terminal-title-dots">
            <span /><span /><span />
          </div>
          <span>{title}</span>
        </div>
        <span>BrowserPod terminal</span>
      </div>
      <div className="terminal-body">
        {nativeRef ? <div ref={nativeRef} className="terminal-native" /> : null}
        {lines?.length ? (
          <pre className="terminal-lines">
            {lines.map((line, index) => (
              <span className={`terminal-line ${lineTone(line)}`} key={`${line}-${index}`}>
                {line}
                {index < lines.length - 1 ? "\n" : ""}
              </span>
            ))}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

function lineTone(line: string) {
  const normalized = line.toLowerCase();

  if (line.trim().startsWith("$")) return "command";
  if (normalized.startsWith("passed") || normalized.includes(" pass")) return "success";
  if (normalized.startsWith("failed") || normalized.includes(" fail")) return "error";
  if (line.includes("=") || normalized.includes("queued") || normalized.includes("ready")) {
    return "meta";
  }

  return "";
}
