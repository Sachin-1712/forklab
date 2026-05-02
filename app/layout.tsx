import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForkLab",
  description: "Parallel AI branches, verified in BrowserPod sandboxes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <nav className="nav" aria-label="Primary navigation">
            <Link href="/" className="brand">
              <span className="brand-mark">FL</span>
              <span>ForkLab</span>
            </Link>
            <div className="nav-links">
              <Link href="/sandbox-test">Smoke Test</Link>
              <Link href="/sprint">Sprint</Link>
              <Link href="/how-it-works">How it works</Link>
            </div>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
