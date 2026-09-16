import type { Metadata } from "next";
import "./globals.css";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "CaseKit",
  description: "Organize purchase evidence and prepare complaint or refund requests.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <WorkspaceShell>{children}</WorkspaceShell>
        <Analytics />
      </body>
    </html>
  );
}
