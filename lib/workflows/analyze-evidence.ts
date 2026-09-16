import type { EvidenceExtractionAdapter } from "../ai/extraction-adapter";
import {
  classifyMissingInformation,
  validateExtraction,
  type ExtractedFactsCandidate,
} from "../ai/extraction-schema";
import { evidenceBoundaryText, type NormalizedEvidence } from "../documents/normalize";
import { redactSensitiveText } from "../documents/redact";

export type AnalysisResult = {
  candidate: ExtractedFactsCandidate;
  redactions: Array<{
    documentId: string;
    redactions: ReturnType<typeof redactSensitiveText>["redactions"];
  }>;
};

export async function analyzeEvidence(input: {
  caseId: string;
  evidence: NormalizedEvidence[];
  adapter: EvidenceExtractionAdapter;
}): Promise<AnalysisResult> {
  if (!input.caseId) throw new Error("Analysis requires a case id.");
  if (input.evidence.length === 0) throw new Error("Analysis requires evidence.");

  const redactions: AnalysisResult["redactions"] = [];
  const boundedEvidence = input.evidence.map((evidence) => {
    if (evidence.trust !== "untrusted_evidence") throw new Error("Evidence trust boundary is invalid.");
    if (evidence.requiresBinaryExtraction || evidence.text === null) {
      throw new Error(`Document ${evidence.documentId} requires a binary extraction adapter before analysis.`);
    }

    const redacted = redactSensitiveText(evidence.text);
    redactions.push({ documentId: evidence.documentId, redactions: redacted.redactions });
    return {
      documentId: evidence.documentId,
      boundedText: evidenceBoundaryText({ ...evidence, text: redacted.text }),
    };
  });

  const extracted = await input.adapter.extract({ caseId: input.caseId, evidence: boundedEvidence });
  const validated = validateExtraction(extracted);
  const missingInformation = classifyMissingInformation(validated);

  return {
    candidate: { ...validated, missingInformation },
    redactions,
  };
}
