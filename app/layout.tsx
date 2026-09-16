import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { secondaryNavigation, workspaceNavigation } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "CaseKit",
  description: "Organize purchase evidence and prepare complaint or refund requests.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="workspace-shell">
          <aside className="sidebar" aria-label="Primary">
            <div className="brand-row">
              <div className="brand-mark" aria-hidden="true">CK</div>
              <div>
                <div className="brand-name">CaseKit</div>
                <div className="brand-caption">Evidence workspace</div>
              </div>
            </div>

            <nav className="nav-list">
              {workspaceNavigation.map((item) => (
                <Link key={item.href} href={item.href} className={item.href === "/" ? "nav-link nav-link-active" : "nav-link"}>
                  <span className="nav-dot" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="sidebar-footer">
              {secondaryNavigation.map((item) => (
                <Link key={item.href} href={item.href} className="nav-link">
                  <span className="nav-dot" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
              <div className="account-row">
                <div className="avatar" aria-hidden="true">PB</div>
                <div>
                  <div className="account-name">Workspace user</div>
                  <div className="account-caption">Prototype session</div>
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
      </body>
    </html>
  );
}
