import { describe, expect, it } from "vitest";
import { canApproveDraft, evaluateDraftSafety, parseDraftSentences, validateDraft, type DraftCandidate } from "./draft-schema";

function safeDraft(): DraftCandidate {
  const base = {
    subject: "Request for refund for order ORDER-1",
    greeting: "Hello Example Store support team,",
    sentences: [
      { text: "I paid $89.50 for order ORDER-1.", factual: true, claimIds: ["claim-payment"] },
      { text: "The order did not arrive by the promised date.", factual: true, claimIds: ["claim-delivery"] },
      { text: "Please review this order and issue the requested refund.", factual: false, claimIds: [] },
    ],
    closing: "Thank you for your help.",
    evidenceLinks: [
      { claimId: "claim-payment", documentId: "doc-1", locator: "receipt:total" },
      { claimId: "claim-delivery", documentId: "doc-2", locator: "confirmation:promised-date" },
    ],
    merchantSourceIds: ["source-1"],
    promptVersion: "draft-v1",
  };

  return { ...base, safety: evaluateDraftSafety(base) };
}

describe("Stage 7 grounded draft safety", () => {
  it("fails closed when persisted structured content is malformed", () => {
    expect(parseDraftSentences({ sentences: [{ text: "A grounded fact", factual: true, claimIds: ["claim-1"] }] })).toEqual([
      { text: "A grounded fact", factual: true, claimIds: ["claim-1"] },
    ]);
    expect(parseDraftSentences({ sentences: [{ text: "A grounded fact", factual: true, claimIds: [] }] })).toBeNull();
    expect(parseDraftSentences({ sentences: [{ text: "", factual: false, claimIds: [] }] })).toBeNull();
    expect(parseDraftSentences({ sentences: [{ text: "A fact", factual: true, claimIds: ["claim-1"] }, "not a sentence"] })).toBeNull();
  });

  it("approves a draft only when every factual sentence is evidence-linked", () => {
    const draft = safeDraft();
    expect(validateDraft(draft)).toEqual(draft);
    expect(canApproveDraft(draft)).toBe(true);
  });

  it("blocks factual sentences without evidence coverage", () => {
    const draft = safeDraft();
    const base = { ...draft, evidenceLinks: draft.evidenceLinks.filter((link) => link.claimId !== "claim-delivery") };
    const unsafe = { ...base, safety: evaluateDraftSafety(base) };
    expect(unsafe.safety.reasons).toContain("unsupported_claim");
    expect(canApproveDraft(unsafe)).toBe(false);
  });

  it("blocks fraud allegations and legal-rights language", () => {
    const draft = safeDraft();
    const base = {
      ...draft,
      sentences: [...draft.sentences, { text: "This is fraud and violates my legal rights.", factual: false, claimIds: [] }],
    };
    const unsafe = { ...base, safety: evaluateDraftSafety(base) };
    expect(unsafe.safety.reasons).toEqual(expect.arrayContaining(["fraud_allegation", "legal_rights_language"]));
    expect(() => validateDraft(unsafe)).toThrow("safety checks");
  });

  it("blocks common sensitive identifiers", () => {
    const draft = safeDraft();
    const base = { ...draft, closing: "My SSN is 123-45-6789." };
    const unsafe = { ...base, safety: evaluateDraftSafety(base) };
    expect(unsafe.safety.reasons).toContain("sensitive_data");
  });
});
