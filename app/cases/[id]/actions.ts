"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CaseIssueType } from "@/lib/database.types";
import { caseIssueTypes } from "@/lib/cases/review";
import { createClient } from "@/lib/supabase/server";

const issueTypes = new Set<CaseIssueType>(caseIssueTypes);

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

function fail(caseId: string, message: string): never {
  redirect(`/cases/${caseId}?error=${encodeURIComponent(message)}`);
}

export async function reviseCaseFacts(caseId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/cases/${caseId}`)}`);

  const expectedVersion = Number(formData.get("expectedVersion") ?? 0);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) fail(caseId, "The fact version is invalid. Reload and try again.");

  const issueValue = String(formData.get("issueType") ?? "").trim() as CaseIssueType;
  const issueType = issueValue ? issueValue : null;
  if (issueType && !issueTypes.has(issueType)) fail(caseId, "Choose a valid issue type.");

  let amountPaid: number | null;
  try {
    amountPaid = nullableAmount(formData);
  } catch (error) {
    fail(caseId, error instanceof Error ? error.message : "Amount paid is invalid.");
  }

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
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/cases/${caseId}`)}`);

  const expectedVersion = Number(formData.get("expectedVersion") ?? 0);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) fail(caseId, "Review and save the facts before continuing.");

  const { error } = await supabase.rpc("mark_case_ready_for_drafting", {
    p_case_id: caseId,
    p_expected_facts_version: expectedVersion,
  });

  if (error) fail(caseId, error.message.includes("incomplete") ? "Complete the required reviewed facts before continuing." : "Could not mark the case ready.");

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  redirect(`/cases/${caseId}?ready=1`);
}
