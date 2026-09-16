"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseReminderDate, requireIdempotencyKey, validateOutboundAuthorization } from "@/lib/workflows/follow-up-boundary";

function fail(caseId: string, message: string): never {
  redirect(`/cases/${caseId}?tab=tasks&error=${encodeURIComponent(message)}`);
}

async function authClient(caseId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/cases/${caseId}`)}`);
  return { supabase, user: auth.user };
}

export async function setNotificationConsent(caseId: string, formData: FormData) {
  const { supabase, user } = await authClient(caseId);
  const consent = String(formData.get("notificationConsent") ?? "") === "true";
  const { data: profile, error } = await supabase.from("profiles").update({ notification_consent: consent }).eq("id", user.id).select("id").maybeSingle();
  if (error || !profile) fail(caseId, "Reminder notification settings could not be updated.");

  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}?tab=tasks&notificationConsent=${consent ? "enabled" : "disabled"}`);
}

export async function scheduleFollowUpReminder(caseId: string, formData: FormData) {
  const { supabase } = await authClient(caseId);

  let dueAt: string;
  let idempotencyKey: string;
  try {
    dueAt = parseReminderDate(String(formData.get("dueDate") ?? ""));
    idempotencyKey = requireIdempotencyKey(String(formData.get("idempotencyKey") ?? ""));
  } catch (error) {
    fail(caseId, error instanceof Error ? error.message : "Reminder details are invalid.");
  }

  const { error } = await supabase.rpc("schedule_case_reminder", {
    p_case_id: caseId,
    p_reminder_type: "follow_up",
    p_due_at: dueAt,
    p_idempotency_key: idempotencyKey,
  });
  if (error) fail(caseId, error.message.includes("consent") ? "Enable reminder notifications before scheduling a follow-up." : "The follow-up could not be scheduled.");

  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}?tab=tasks&reminderScheduled=1`);
}

export async function dismissFollowUpReminder(caseId: string, formData: FormData) {
  const { supabase } = await authClient(caseId);
  const reminderId = String(formData.get("reminderId") ?? "").trim();
  if (!reminderId) fail(caseId, "The reminder could not be identified. Reload and try again.");

  const { error } = await supabase.rpc("dismiss_case_reminder", { p_case_id: caseId, p_reminder_id: reminderId });
  if (error) fail(caseId, "The reminder could not be dismissed. Reload and try again.");

  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}?tab=tasks&reminderDismissed=1`);
}

export async function authorizeOutboundEmail(caseId: string, formData: FormData) {
  const { supabase } = await authClient(caseId);
  const draftId = String(formData.get("draftId") ?? "").trim();
  const draftVersion = Number(formData.get("draftVersion") ?? 0);
  const destinationConfirmed = formData.get("destinationConfirmed") === "on";
  const attachmentsConfirmed = formData.get("attachmentsConfirmed") === "on";
  const sendAuthorized = formData.get("sendAuthorized") === "on";

  let validated: { recipientEmail: string; idempotencyKey: string };
  try {
    validated = validateOutboundAuthorization({
      recipientEmail: String(formData.get("recipientEmail") ?? ""),
      draftVersion,
      destinationConfirmed,
      attachmentsConfirmed,
      sendAuthorized,
      idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
    });
  } catch (error) {
    fail(caseId, error instanceof Error ? error.message : "Outbound authorization details are invalid.");
  }

  if (!draftId) fail(caseId, "The approved draft could not be identified. Reload and try again.");

  const { error } = await supabase.rpc("authorize_outbound_email", {
    p_case_id: caseId,
    p_draft_id: draftId,
    p_draft_version: draftVersion,
    p_recipient_email: validated.recipientEmail,
    p_attachment_document_ids: [],
    p_destination_confirmed: true,
    p_attachments_confirmed: true,
    p_send_authorized: true,
    p_idempotency_key: validated.idempotencyKey,
  });
  if (error) fail(caseId, error.message.includes("current approved draft") ? "The draft changed or is no longer approved. Reload before continuing." : "The outbound authorization could not be recorded.");

  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}?tab=tasks&outboundAuthorized=1`);
}
