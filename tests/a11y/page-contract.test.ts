import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("accessible page contracts", () => {
  it("keeps the shell landmarks and keyboard state controls explicit", () => {
    const shell = source("components/workspace-shell.tsx");
    expect(shell).toContain("<main>{children}</main>");
    expect(shell).toContain('aria-label="Primary"');
    expect(shell).toContain('aria-pressed={collapsed}');
    expect(shell).toContain('aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}');
  });

  it("keeps authentication fields persistently labelled and errors announced", () => {
    const login = source("app/login/page.tsx");
    expect(login).toContain('aria-labelledby="login-title"');
    expect(login.match(/<label>/g)?.length).toBe(2);
    expect(login).toContain('name="email"');
    expect(login).toContain('name="password"');
    expect(login).toContain('role="alert"');
  });

  it("keeps intake controls labelled and upload safety text visible", () => {
    const intake = source("app/cases/new/page.tsx");
    expect(intake.match(/<label>/g)?.length).toBe(5);
    expect(intake).toContain('name="documents"');
    expect(intake).toContain("Uploaded content is treated as untrusted evidence");
  });

  it("keeps case controls usable without color-only status meaning", () => {
    const cases = source("app/cases/page.tsx");
    expect(cases).toContain('aria-label="Case controls"');
    expect(cases).toContain('aria-label="Filter by status"');
    expect(cases).toContain("label(item.status)");
    expect(cases).toContain('role="alert"');
  });
});
