import { describe, expect, it } from "vitest";
import { FixtureExtractionAdapter } from "@/lib/ai/extraction-adapter";
import type { ExtractedFactsCandidate } from "@/lib/ai/extraction-schema";
import { normalizeEvidence } from "@/lib/documents/normalize";
import { analyzeEvidence } from "./analyze-evidence";

const source = [{ documentId: "doc-1", locator: "line 1" }];
const fixture: ExtractedFactsCandidate = {
  merchant: "Example Store",
  orderId: "A-100",
  orderDate: null,
  itemDescription: null,
  amountPaid: null,
  deliveryDate: null,
  promisedDate: null,
  issueType: "refund_not_received",
  problemDescription: "Refund has not arrived.",
  customerRequest: "Refund status",
  claims: [
    { field: "merchant", value: "Example Store", confidence: 0.97, sources: source },
    { field: "order_id", value: "A-100", confidence: 0.98, sources: source },
    { field: "issue_type", value: "refund_not_received", confidence: 0.95, sources: source },
    { field: "problem_description", value: "Refund has not arrived.", confidence: 0.96, sources: source },
    { field: "customer_request", value: "Refund status", confidence: 0.96, sources: source },
  ],
  missingInformation: ["should-be-recomputed"],
};

describe("analyzeEvidence", () => {
  it("redacts sensitive content before the adapter sees it and recomputes missing info", async () => {
    let observed = "";
    const adapter = {
      async extract(input: { evidence: Array<{ boundedText: string }> }) {
        observed = input.evidence[0].boundedText;
        return structuredClone(fixture);
      },
    };

    const result = await analyzeEvidence({
      caseId: "case-1",
      evidence: [normalizeEvidence({ documentId: "doc-1", mimeType: "text/plain", content: "A-100 SSN 123-45-6789" })],
      adapter,
    });

    expect(observed).toContain("[REDACTED_SSN]");
    expect(observed).not.toContain("123-45-6789");
    expect(result.candidate.missingInformation).toEqual([]);
    expect(result.redactions[0].redactions).toContainEqual({ kind: "ssn", count: 1 });
  });

  it("rejects binary evidence until a binary extraction adapter has normalized it", async () => {
    await expect(
      analyzeEvidence({
        caseId: "case-1",
        evidence: [normalizeEvidence({ documentId: "doc-pdf", mimeType: "application/pdf", content: new Uint8Array([1]) })],
        adapter: new FixtureExtractionAdapter(fixture),
      }),
    ).rejects.toThrow(/requires a binary extraction adapter/);
  });

  it("rejects adapter output with unsupported factual claims", async () => {
    const invalid: ExtractedFactsCandidate = {
      ...fixture,
      claims: fixture.claims.map((claim) =>
        claim.field === "merchant" ? { ...claim, sources: [] } : claim,
      ),
    };
    await expect(
      analyzeEvidence({
        caseId: "case-1",
        evidence: [normalizeEvidence({ documentId: "doc-1", mimeType: "text/plain", content: "Example Store" })],
        adapter: new FixtureExtractionAdapter(invalid),
      }),
    ).rejects.toThrow(/missing evidence provenance/);
  });
});
