export type DraftEvidenceLink = {
  claimId: string;
  documentId: string;
  locator: string;
};

export type DraftSentence = {
  text: string;
  factual: boolean;
  claimIds: string[];
};

export type DraftSafetyResult = {
  passed: boolean;
  reasons: Array<
    | "unsupported_claim"
    | "sensitive_data"
    | "threat"
    | "fraud_allegation"
    | "legal_rights_language"
  >;
};

export type DraftCandidate = {
  subject: string;
  greeting: string;
  sentences: DraftSentence[];
  closing: string;
  evidenceLinks: DraftEvidenceLink[];
  merchantSourceIds: string[];
  promptVersion: string;
  safety: DraftSafetyResult;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parse the persisted sentence representation before it is displayed or used
 * to create another immutable version. A malformed stored draft must fail
 * closed instead of silently dropping an evidence link.
 */
export function parseDraftSentences(value: unknown): DraftSentence[] | null {
  if (!isRecord(value) || !Array.isArray(value.sentences) || value.sentences.length === 0) return null;

  const sentences: DraftSentence[] = [];
  for (const item of value.sentences) {
    if (!isRecord(item) || typeof item.text !== "string" || !item.text.trim() || typeof item.factual !== "boolean" || !Array.isArray(item.claimIds)) {
      return null;
    }

    const claimIds = item.claimIds;
    if (!claimIds.every((claimId): claimId is string => typeof claimId === "string" && claimId.trim().length > 0)) return null;
    if (item.factual && claimIds.length === 0) return null;

    sentences.push({ text: item.text, factual: item.factual, claimIds });
  }

  return sentences;
}

const threatPattern = /\b(threaten|hurt|harm|destroy|retaliate|ruin)\b/i;
const fraudPattern = /\b(fraud|scam|criminal|stole|theft)\b/i;
const legalRightsPattern = /\b(illegal|unlawful|violation of law|my legal rights?|statutory rights?|sue|lawsuit)\b/i;
const sensitivePattern = /\b\d{3}-\d{2}-\d{4}\b|\b(?:\d[ -]*?){13,19}\b/;

export function evaluateDraftSafety(candidate: Omit<DraftCandidate, "safety">): DraftSafetyResult {
  const text = [candidate.subject, candidate.greeting, ...candidate.sentences.map((sentence) => sentence.text), candidate.closing].join(" ");
  const reasons = new Set<DraftSafetyResult["reasons"][number]>();

  if (threatPattern.test(text)) reasons.add("threat");
  if (fraudPattern.test(text)) reasons.add("fraud_allegation");
  if (legalRightsPattern.test(text)) reasons.add("legal_rights_language");
  if (sensitivePattern.test(text)) reasons.add("sensitive_data");

  const linkedClaims = new Set(candidate.evidenceLinks.map((link) => link.claimId));
  for (const sentence of candidate.sentences) {
    if (!sentence.factual) continue;
    if (sentence.claimIds.length === 0 || sentence.claimIds.some((claimId) => !linkedClaims.has(claimId))) {
      reasons.add("unsupported_claim");
    }
  }

  return { passed: reasons.size === 0, reasons: [...reasons] };
}

export function validateDraft(candidate: DraftCandidate) {
  if (!candidate.subject.trim() || !candidate.greeting.trim() || !candidate.closing.trim()) {
    throw new Error("Draft structure is incomplete.");
  }
  if (!candidate.promptVersion.trim()) throw new Error("Draft prompt version is required.");

  for (const link of candidate.evidenceLinks) {
    if (!link.claimId.trim() || !link.documentId.trim() || !link.locator.trim()) {
      throw new Error("Draft evidence link is incomplete.");
    }
  }

  const recomputed = evaluateDraftSafety(candidate);
  if (recomputed.passed !== candidate.safety.passed || recomputed.reasons.join("|") !== candidate.safety.reasons.join("|")) {
    throw new Error("Draft safety result is stale or inconsistent.");
  }
  if (!candidate.safety.passed) throw new Error(`Draft failed safety checks: ${candidate.safety.reasons.join(", ")}`);

  return candidate;
}

export function canApproveDraft(candidate: DraftCandidate) {
  try {
    validateDraft(candidate);
    return true;
  } catch {
    return false;
  }
}
