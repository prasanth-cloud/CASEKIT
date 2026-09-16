import { describe, expect, it } from "vitest";
import type { ExtractedFactsRow } from "@/lib/database.types";
import { factProvenance, isReadyForDrafting } from "./review";

const base: ExtractedFactsRow = {
  id: "facts-1",
  case_id: "case-1",
  version: 2,
  merchant: "Example Store",
  order_id: "ORDER-1",
  order_date: "2026-09-01",
  item_description: "Coffee maker",
  amount_paid: 89.5,
  delivery_date: null,
  promised_date: "2026-09-05",
  issue_type: "missing_delivery",
  problem_description: "Order did not arrive.",
  customer_request: "Refund",
  missing_information: [],
  confidence: null,
  source_document_ids: [],
  schema_version: "user-review-v1",
  extracted_by: "user",
  is_current: true,
  created_at: "2026-09-16T20:00:00Z",
};

describe("Stage 6 fact review", () => {
  it("requires the four reviewed fields before drafting can be marked ready", () => {
    expect(isReadyForDrafting(base)).toBe(true);
    expect(isReadyForDrafting({ ...base, customer_request: "" })).toBe(false);
    expect(isReadyForDrafting({ ...base, merchant: null })).toBe(false);
  });

  it("never presents user revisions as document-backed evidence", () => {
    expect(factProvenance({ extracted_by: "user", source_document_ids: ["doc-1"] })).toEqual({
      kind: "user_review",
      documentIds: [],
    });
  });

  it("preserves document provenance for non-user extraction versions", () => {
    expect(factProvenance({ extracted_by: "ai", source_document_ids: ["doc-1", "doc-2"] })).toEqual({
      kind: "evidence",
      documentIds: ["doc-1", "doc-2"],
    });
  });
});
