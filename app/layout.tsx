import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForkLab — AI Sandbox Workbench",
  description:
    "Parallel AI branches, verified in disposable BrowserPod sandboxes. Run real tests, compare fixes, merge only what passes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app-shell">
          <nav className="topbar" aria-label="Primary navigation">
            <Link href="/" className="brand">ForkLab</Link>
            <div className="nav-links">
              <Link href="/sprint">Dashboard</Link>
              <Link href="/sandbox-test">Smoke Test</Link>
              <Link href="/how-it-works">How it Works</Link>
              <Link href="/settings">Settings</Link>
            </div>
          </nav>
          <main className="main-content">{children}</main>
          <footer className="footer">
            <div className="footer-brand">
              <span>ForkLab © 2025 · University of Leeds</span>
            </div>
            <div className="footer-links">
              <Link href="/how-it-works">Docs</Link>
              <Link href="/settings">Settings</Link>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
