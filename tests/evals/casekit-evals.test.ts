import { describe, expect, it } from "vitest";
import { evaluateDraftSafety, validateDraft } from "../../lib/ai/draft-schema";
import { classifyMissingInformation, validateExtraction } from "../../lib/ai/extraction-schema";
import { redactSensitiveText } from "../../lib/documents/redact";
import { completeMissingDelivery, contradictoryDates, promptInjectionSource, safeDraft, sensitiveSource, unsafeDraft } from "./fixtures";

describe("CaseKit AI evaluation fixtures", () => {
  it("keeps a complete missing-delivery fixture grounded and surfaces absent dates", () => {
    expect(validateExtraction(completeMissingDelivery)).toBe(completeMissingDelivery);
    expect(classifyMissingInformation(completeMissingDelivery)).toEqual([]);
    expect(completeMissingDelivery.missingInformation).toEqual(["delivery_date"]);
  });

  it("rejects contradictory duplicate field claims instead of reconciling silently", () => {
    expect(() => validateExtraction(contradictoryDates)).toThrow("Duplicate claim coverage");
  });

  it("blocks unsafe allegations and legal-rights language", () => {
    expect(evaluateDraftSafety(unsafeDraft).passed).toBe(false);
    expect(() => validateDraft(unsafeDraft)).toThrow("Draft failed safety checks");
  });

  it("requires factual sentences to retain evidence links", () => {
    expect(validateDraft(safeDraft)).toBe(safeDraft);
    const unsupported = { ...safeDraft, sentences: [{ text: "The merchant promised delivery tomorrow.", factual: true, claimIds: ["missing-claim"] }] };
    expect(evaluateDraftSafety(unsupported).reasons).toContain("unsupported_claim");
  });

  it("treats prompt-injection text as untrusted source data and never carries it into a safe draft", () => {
    expect(promptInjectionSource).toMatch(/ignore previous instructions/i);
    expect(safeDraft.sentences.map((sentence) => sentence.text).join(" ")).not.toContain("attacker@example.com");
    expect(evaluateDraftSafety(safeDraft).passed).toBe(true);
  });

  it("redacts synthetic payment and SSN data before model-bound processing", () => {
    const result = redactSensitiveText(sensitiveSource);
    expect(result.text).toContain("[REDACTED_PAYMENT_CARD]");
    expect(result.text).toContain("[REDACTED_SSN]");
    expect(result.redactions).toEqual([{ kind: "ssn", count: 1 }, { kind: "payment_card", count: 1 }]);
  });
});
