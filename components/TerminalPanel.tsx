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
        <span>{title}</span>
        <span>BrowserPod terminal</span>
      </div>
      <div className="terminal-body">
        {nativeRef ? <div ref={nativeRef} className="terminal-native" /> : null}
        {lines?.length ? <pre className="terminal-lines">{lines.join("\n")}</pre> : null}
      </div>
    </div>
  );
}
