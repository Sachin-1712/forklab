"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/arena", label: "Arena" },
  { href: "/arena-live", label: "Live" },
  { href: "/workbench", label: "Workbench" },
  { href: "/sandbox-test", label: "Smoke" },
  { href: "/settings", label: "Settings" },
  { href: "/how-it-works", label: "How It Works" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="topbar" aria-label="Primary navigation">
      <Link href="/" className="brand" aria-label="ForkLab home">
        <span className="brand-mark" aria-hidden="true">
          FL
        </span>
        <span>ForkLab</span>
      </Link>

      <div className="nav-links">
        {navItems.map((item) => (
          <Link
            aria-current={pathname === item.href ? "page" : undefined}
            className={pathname === item.href ? "active" : undefined}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
        <Link href="/arena-live" className="button primary nav-cta">
          Run Agent
        </Link>
      </div>
    </nav>
  );
}
