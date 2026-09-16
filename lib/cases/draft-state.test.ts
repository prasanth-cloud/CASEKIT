import { describe, expect, it } from "vitest";
import type { DraftRow } from "@/lib/database.types";
import { canApprovePersistedDraft } from "./draft-state";

const draft: DraftRow = {
  id: "draft-1",
  case_id: "case-1",
  facts_version: 3,
  version: 2,
  subject: "Refund request",
  body: "Please review my refund request.",
  structured_content: { sentences: [] },
  attachments: [],
  evidence_claim_ids: ["claim-1"],
  merchant_source_ids: ["source-1"],
  safety_result: { passed: true, reasons: [] },
  prompt_version: "draft-v1",
  status: "edited",
  approved_at: null,
  sent_at: null,
  created_at: "2026-09-16T20:55:00Z",
};

describe("draft approval readiness", () => {
  it("allows only the latest safe draft tied to current facts", () => {
    expect(canApprovePersistedDraft(draft, 3, 2)).toBe(true);
    expect(canApprovePersistedDraft(draft, 4, 2)).toBe(false);
    expect(canApprovePersistedDraft(draft, 3, 3)).toBe(false);
  });

  it("blocks drafts that failed safety review", () => {
    expect(canApprovePersistedDraft({ ...draft, safety_result: { passed: false, reasons: ["unsupported_claim"] } }, 3, 2)).toBe(false);
  });

  it("blocks previously approved or sent drafts", () => {
    expect(canApprovePersistedDraft({ ...draft, status: "approved", approved_at: "2026-09-16T21:00:00Z" }, 3, 2)).toBe(false);
    expect(canApprovePersistedDraft({ ...draft, sent_at: "2026-09-16T21:05:00Z" }, 3, 2)).toBe(false);
  });
});
