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

const threatPattern = /\b(threaten|hurt|harm|destroy|retaliate|ruin)\b/i;
const fraudPattern = /\b(fraud|scam|criminal|stole|theft)\b/i;
const legalRightsPattern = /\b(illegal|unlawful|violation of law|my legal right|statutory right|sue|lawsuit)\b/i;
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
