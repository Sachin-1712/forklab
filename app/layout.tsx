import type { Metadata } from "next";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForkLab — Prompt once. Run verified variants.",
  description:
    "ForkLab generates frontend variants, runs them in BrowserPod sandboxes, and shows terminal, proof, and Portal evidence before review.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="app-shell">
          <TopNav />
          <main className="main-content">{children}</main>
          <footer className="footer">
            <div className="footer-brand">
              <span style={{ color: "var(--primary-container)" }}>⎇</span>
              <span>ForkLab © 2024</span>
            </div>
            <div className="footer-links">
              <Link href="/how-it-works">Privacy</Link>
              <Link href="/settings">Terms</Link>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
