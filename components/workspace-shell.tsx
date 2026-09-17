"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { secondaryNavigation, workspaceNavigation } from "@/lib/navigation";

export function WorkspaceShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  if (pathname === "/" || pathname === "/demo" || pathname.startsWith("/demo/") || pathname.startsWith("/login") || pathname.startsWith("/auth")) {
    return <main>{children}</main>;
  }

  return (
    <div className={collapsed ? "workspace-shell workspace-shell-collapsed" : "workspace-shell"}>
      <aside className="sidebar" aria-label="Primary">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">CK</div>
          <div className="brand-copy">
            <div className="brand-name">CaseKit</div>
            <div className="brand-caption">Evidence workspace</div>
          </div>
          <button
            className="collapse-button"
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? ">" : "<"}
          </button>
        </div>

        <nav className="nav-list">
          {workspaceNavigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? "nav-link nav-link-active" : "nav-link"} title={collapsed ? item.label : undefined}>
                <span className="nav-dot" aria-hidden="true" />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {secondaryNavigation.map((item) => (
            <Link key={item.href} href={item.href} className={pathname.startsWith(item.href) ? "nav-link nav-link-active" : "nav-link"} title={collapsed ? item.label : undefined}>
              <span className="nav-dot" aria-hidden="true" />
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
          <div className="account-row">
            <div className="avatar" aria-hidden="true">CK</div>
            <div className="account-copy">
              <div className="account-name">Authenticated workspace</div>
              <div className="account-caption">Supabase session</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">CaseKit workspace</div>
            <div className="topbar-title">Home</div>
          </div>
          <button className="primary-button" type="button">New case</button>
        </header>
        {children}
      </main>
    </div>
  );
}
