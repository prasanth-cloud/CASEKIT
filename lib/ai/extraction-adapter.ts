import type { ExtractedFactsCandidate } from "./extraction-schema";

export type ExtractionInput = {
  caseId: string;
  evidence: Array<{
    documentId: string;
    boundedText: string;
  }>;
};

export interface EvidenceExtractionAdapter {
  extract(input: ExtractionInput): Promise<ExtractedFactsCandidate>;
}

export class FixtureExtractionAdapter implements EvidenceExtractionAdapter {
  constructor(private readonly fixture: ExtractedFactsCandidate) {}

  async extract(): Promise<ExtractedFactsCandidate> {
    return structuredClone(this.fixture);
  }
}
