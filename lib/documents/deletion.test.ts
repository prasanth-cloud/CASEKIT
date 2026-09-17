import { describe, expect, it } from "vitest";
import { deletionAlreadyComplete, deletionAuditChanges, ownedStoragePath, retentionExpired } from "./deletion";

describe("document deletion boundary", () => {
  it("accepts only the authenticated user's case-scoped storage path", () => {
    expect(ownedStoragePath("user-1", "case-1", "user-1/case-1/receipt.pdf")).toBe("user-1/case-1/receipt.pdf");
    expect(() => ownedStoragePath("user-1", "case-1", "user-2/case-1/receipt.pdf")).toThrow("does not belong");
    expect(() => ownedStoragePath("user-1", "case-1", "user-1/case-2/receipt.pdf")).toThrow("does not belong");
  });

  it("recognizes retention expiry without treating missing or invalid dates as expired", () => {
    const now = new Date("2026-09-17T14:00:00Z");
    expect(retentionExpired("2026-09-17T13:59:59Z", now)).toBe(true);
    expect(retentionExpired("2026-09-18T14:00:00Z", now)).toBe(false);
    expect(retentionExpired(null, now)).toBe(false);
    expect(retentionExpired("not-a-date", now)).toBe(false);
  });

  it("makes completed deletion retries idempotent", () => {
    expect(deletionAlreadyComplete({ status: "deleted", deleted_at: "2026-09-17T14:00:00Z" })).toBe(true);
    expect(deletionAlreadyComplete({ status: "ready", deleted_at: null })).toBe(false);
  });

  it("keeps audit payloads content-free", () => {
    const changes = deletionAuditChanges("doc-1", "user_request");
    expect(changes).toEqual({ document_id: "doc-1", reason: "user_request", storage_removed: true });
    expect(JSON.stringify(changes)).not.toMatch(/receipt|email|order|storage_path/i);
  });
});
