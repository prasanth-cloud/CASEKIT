import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ownedStoragePath, retentionExpired } from "@/lib/documents/deletion";

const root = process.cwd();
const route = fs.readFileSync(path.join(root, "app/api/cases/[id]/documents/[documentId]/delete/route.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260917100000_stage9_document_deletion_audit.sql"), "utf8");

describe("Stage 9b deletion integration boundary", () => {
  it("derives private Storage deletion only from the authenticated user's owned path", () => {
    expect(ownedStoragePath("user-a", "case-a", "user-a/case-a/evidence.pdf")).toBe("user-a/case-a/evidence.pdf");
    expect(() => ownedStoragePath("user-a", "case-a", "user-b/case-a/evidence.pdf")).toThrow();
    expect(route).toContain('.eq("case_id", caseId)');
    expect(route).toContain("ownedStoragePath(auth.user.id, caseId, document.storage_path)");
    expect(route.indexOf("ownedStoragePath")).toBeLessThan(route.indexOf('.storage.from("case-documents").remove'));
  });

  it("keeps database finalization tenant-scoped and RLS-preserving", () => {
    expect(migration).toContain("security invoker");
    expect(migration).not.toContain("security definer");
    expect(migration).toContain("d.user_id = v_user_id");
    expect(migration).toContain("user_id = (select auth.uid())");
    expect(migration).toContain("action in ('facts.revised', 'case.ready_for_drafting', 'document.deleted')");
    expect(migration).toContain("revoke all on function public.finalize_document_deletion");
  });

  it("requires actual expiry for retention-driven deletion", () => {
    const now = new Date("2026-09-17T14:00:00Z");
    expect(retentionExpired("2026-09-17T13:00:00Z", now)).toBe(true);
    expect(retentionExpired("2026-09-17T15:00:00Z", now)).toBe(false);
    expect(route).toContain('reason === "retention_expired" && !retentionExpired(document.retention_until)');
    expect(migration).toContain("v_document.retention_until > now()");
  });

  it("keeps deletion audit data content-free and finalization idempotent", () => {
    expect(migration).toContain("v_document.status = 'deleted' and v_document.deleted_at is not null");
    expect(migration).toContain("'document_id', p_document_id");
    expect(migration).toContain("'reason', p_reason");
    expect(migration).toContain("'storage_removed', true");
    expect(migration).not.toMatch(/claim_text|problem_description|customer_request|storage_path', v_document\.storage_path/);
  });
});
