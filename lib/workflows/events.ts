export type CaseCreatedEvent = {
  name: "case.created";
  data: { caseId: string; userId: string; occurredAt: string };
};

export type DocumentsUploadedEvent = {
  name: "documents.uploaded";
  data: { caseId: string; userId: string; documentIds: string[]; occurredAt: string };
};

export type AnalysisCompletedEvent = {
  name: "analysis.completed";
  data: { caseId: string; userId: string; factsVersion: number; occurredAt: string };
};

export type FollowupDueEvent = {
  name: "followup.due";
  data: { caseId: string; userId: string; reminderId: string; idempotencyKey: string; dueAt: string; occurredAt: string };
};

export type CaseKitEvent = CaseCreatedEvent | DocumentsUploadedEvent | AnalysisCompletedEvent | FollowupDueEvent;

export function buildFollowupDueEvent(input: Omit<FollowupDueEvent["data"], "occurredAt">, occurredAt = new Date().toISOString()): FollowupDueEvent {
  return assertWorkflowEvent({ name: "followup.due", data: { ...input, occurredAt } });
}

export function assertWorkflowEvent<T extends CaseKitEvent>(event: T): T {
  if (!event.data.caseId || !event.data.userId || !event.data.occurredAt) {
    throw new Error("Workflow events require case, user, and occurrence identifiers.");
  }
  if (event.name === "documents.uploaded" && event.data.documentIds.length === 0) {
    throw new Error("documents.uploaded requires at least one document id.");
  }
  if (event.name === "followup.due" && (!event.data.reminderId || !event.data.idempotencyKey || !event.data.dueAt)) {
    throw new Error("followup.due requires reminder and retry identifiers.");
  }
  return event;
}
