"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaseIssueType, Json } from "@/lib/database.types";
import { evaluateDraftSafety, type DraftSentence } from "@/lib/ai/draft-schema";
import { caseIssueTypes } from "@/lib/cases/review";
import { createClient } from "@/lib/supabase/server";

const issueTypes = new Set<CaseIssueType>(caseIssueTypes);

type EvidenceClaim = {
  id: string;
  claim_text: string;
  document_id: string | null;
  verified: boolean;
};

type DraftSnapshot = {
  id: string;
  version: number;
  facts_version: number;
  subject: string;
  structured_content: Json;
  evidence_claim_ids: string[];
  merchant_source_ids: string[];
  prompt_version: string;
  status: string;
};

function nullableDate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function nullableAmount(formData: FormData) {
  const value = String(formData.get("amountPaid") ?? "").trim();
  if (!value) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Amount paid must be zero or greater.");
  return amount;
}

function fail(caseId: string, message: string, tab = "overview"): never {
  redirect(`/cases/${caseId}?tab=${tab}&error=${encodeURIComponent(message)}`);
}

function parseSentences(value: Json): DraftSentence[] {
  if (!value || Array.isArray(value) || typeof value !== "object") return [];
  const raw = value.sentences;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== "object") return [];
    if (typeof item.text !== "string" || typeof item.factual !== "boolean" || !Array.isArray(item.claimIds)) return [];
    const claimIds = item.claimIds.filter((claim): claim is string => typeof claim === "string");
    return [{ text: item.text, factual: item.factual, claimIds }];
  });
}

async function authClient(caseId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/cases/${caseId}`)}`);
  return { supabase, db: supabase as unknown as SupabaseClient };
}

async function safetyFor(db: SupabaseClient, caseId: string, subject: string, sentences: DraftSentence[], claimIds: string[]) {
  const { data } = await db
    .from("evidence_claims")
    .select("id,document_id,verified")
    .eq("case_id", caseId)
    .in("id", claimIds);
  const claims = (data ?? []) as Pick<EvidenceClaim, "id" | "document_id" | "verified">[];
  if (claims.length !== claimIds.length || claims.some((claim) => !claim.verified || !claim.document_id)) {
    throw new Error("Draft evidence is no longer complete and verified.");
  }
  return evaluateDraftSafety({
    subject,
    greeting: "Hello,",
    sentences,
    closing: "Thank you.",
    evidenceLinks: claims.map((claim) => ({ claimId: claim.id, documentId: claim.document_id!, locator: "verified-evidence-claim" })),
    merchantSourceIds: [],
    promptVersion: "grounded-template-v1",
  });
}

export async function reviseCaseFacts(caseId: string, formData: FormData) {
  const { supabase } = await authClient(caseId);
  const expectedVersion = Number(formData.get("expectedVersion") ?? 0);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) fail(caseId, "The fact version is invalid. Reload and try again.");

  const issueValue = String(formData.get("issueType") ?? "").trim() as CaseIssueType;
  const issueType = issueValue ? issueValue : null;
  if (issueType && !issueTypes.has(issueType)) fail(caseId, "Choose a valid issue type.");

  let amountPaid: number | null;
  try { amountPaid = nullableAmount(formData); }
  catch (error) { fail(caseId, error instanceof Error ? error.message : "Amount paid is invalid."); }

  const { error } = await supabase.rpc("revise_case_facts", {
    p_case_id: caseId,
    p_expected_version: expectedVersion,
    p_merchant: String(formData.get("merchant") ?? ""),
    p_order_id: String(formData.get("orderId") ?? ""),
    p_order_date: nullableDate(formData, "orderDate"),
    p_item_description: String(formData.get("itemDescription") ?? ""),
    p_amount_paid: amountPaid,
    p_delivery_date: nullableDate(formData, "deliveryDate"),
    p_promised_date: nullableDate(formData, "promisedDate"),
    p_issue_type: issueType,
    p_problem_description: String(formData.get("problemDescription") ?? ""),
    p_customer_request: String(formData.get("customerRequest") ?? ""),
  });
  if (error) fail(caseId, error.message.includes("Facts changed") ? "Facts changed in another session. Reload before saving." : "Could not save reviewed facts.");
  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}?saved=1`);
}

export async function markCaseReady(caseId: string, formData: FormData) {
  const { supabase } = await authClient(caseId);
  const expectedVersion = Number(formData.get("expectedVersion") ?? 0);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) fail(caseId, "Review and save the facts before continuing.");
  const { error } = await supabase.rpc("mark_case_ready_for_drafting", { p_case_id: caseId, p_expected_facts_version: expectedVersion });
  if (error) fail(caseId, error.message.includes("incomplete") ? "Complete the required reviewed facts before continuing." : "Could not mark the case ready.");
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  redirect(`/cases/${caseId}?ready=1`);
}

export async function generateGroundedDraft(caseId: string) {
  const { supabase, db } = await authClient(caseId);
  const [{ data: facts }, { data: claimData }, { data: draftData }] = await Promise.all([
    supabase.from("extracted_facts").select("version,merchant,customer_request,is_current").eq("case_id", caseId).eq("is_current", true).single(),
    db.from("evidence_claims").select("id,claim_text,document_id,verified").eq("case_id", caseId).eq("verified", true).not("document_id", "is", null),
    supabase.from("drafts").select("version").eq("case_id", caseId).order("version", { ascending: false }).limit(1),
  ]);
  if (!facts) fail(caseId, "Review the case facts before generating a draft.", "ai");
  const claims = (claimData ?? []) as EvidenceClaim[];
  if (!claims.length) fail(caseId, "At least one verified document-backed evidence claim is required before drafting.", "ai");

  const factual: DraftSentence[] = claims.map((claim) => ({ text: claim.claim_text.trim(), factual: true, claimIds: [claim.id] }));
  const request = facts.customer_request?.trim() || "Please review this case and provide the requested resolution.";
  const sentences: DraftSentence[] = [...factual, { text: request, factual: false, claimIds: [] }];
  const subject = "Request for review";
  const safety = await safetyFor(db, caseId, subject, sentences, claims.map((claim) => claim.id));
  if (!safety.passed) fail(caseId, `Draft blocked by safety review: ${safety.reasons.join(", ")}.`, "ai");

  const { error } = await supabase.rpc("create_case_draft_version", {
    p_case_id: caseId,
    p_facts_version: facts.version,
    p_expected_draft_version: draftData?.[0]?.version ?? 0,
    p_subject: subject,
    p_body: sentences.map((sentence) => sentence.text).join("\n\n"),
    p_structured_content: { sentences },
    p_evidence_claim_ids: claims.map((claim) => claim.id),
    p_merchant_source_ids: [],
    p_safety_result: safety,
    p_prompt_version: "grounded-template-v1",
  });
  if (error) fail(caseId, error.message.includes("Draft changed") ? "Draft changed in another session. Reload before generating." : "Could not create a grounded draft.", "ai");
  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}?tab=ai&generated=1`);
}

export async function saveDraftEdits(caseId: string, formData: FormData) {
  const { supabase, db } = await authClient(caseId);
  const expectedVersion = Number(formData.get("expectedVersion") ?? 0);
  const draftId = String(formData.get("draftId") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const request = String(formData.get("request") ?? "").trim();
  if (!draftId || !Number.isInteger(expectedVersion) || expectedVersion < 1 || !subject || !request) fail(caseId, "Draft edit data is incomplete.", "ai");

  const { data } = await supabase.from("drafts").select("id,version,facts_version,structured_content,evidence_claim_ids,merchant_source_ids,prompt_version,status").eq("id", draftId).eq("case_id", caseId).single();
  const draft = data as DraftSnapshot | null;
  if (!draft || draft.version !== expectedVersion || !["generated", "edited"].includes(draft.status)) fail(caseId, "Draft changed or is no longer editable. Reload first.", "ai");
  const factual = parseSentences(draft.structured_content).filter((sentence) => sentence.factual);
  if (!factual.length) fail(caseId, "Grounded factual sentences are missing; regenerate the draft.", "ai");
  const sentences: DraftSentence[] = [...factual, { text: request, factual: false, claimIds: [] }];
  const safety = await safetyFor(db, caseId, subject, sentences, draft.evidence_claim_ids);
  if (!safety.passed) fail(caseId, `Draft blocked by safety review: ${safety.reasons.join(", ")}.`, "ai");

  const { error } = await supabase.rpc("create_case_draft_version", {
    p_case_id: caseId,
    p_facts_version: draft.facts_version,
    p_expected_draft_version: draft.version,
    p_subject: subject,
    p_body: sentences.map((sentence) => sentence.text).join("\n\n"),
    p_structured_content: { sentences },
    p_evidence_claim_ids: draft.evidence_claim_ids,
    p_merchant_source_ids: draft.merchant_source_ids,
    p_safety_result: safety,
    p_prompt_version: draft.prompt_version,
  });
  if (error) fail(caseId, error.message.includes("Draft changed") ? "Draft changed in another session. Reload before saving." : "Could not save the draft edit.", "ai");
  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}?tab=ai&draftSaved=1`);
}

export async function approveDraft(caseId: string, formData: FormData) {
  const { supabase } = await authClient(caseId);
  const draftId = String(formData.get("draftId") ?? "");
  const expectedVersion = Number(formData.get("expectedVersion") ?? 0);
  if (!draftId || !Number.isInteger(expectedVersion) || expectedVersion < 1) fail(caseId, "Draft approval data is incomplete.", "ai");
  const { error } = await supabase.rpc("approve_case_draft", { p_case_id: caseId, p_draft_id: draftId, p_expected_draft_version: expectedVersion });
  if (error) fail(caseId, error.message.includes("changed") ? "Draft or reviewed facts changed. Reload before approving." : "Could not approve this draft.", "ai");
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  redirect(`/cases/${caseId}?tab=ai&approved=1`);
}
