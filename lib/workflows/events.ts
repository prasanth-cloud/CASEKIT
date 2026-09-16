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

export type CaseKitEvent = CaseCreatedEvent | DocumentsUploadedEvent | AnalysisCompletedEvent;

export function assertWorkflowEvent(event: CaseKitEvent) {
  if (!event.data.caseId || !event.data.userId || !event.data.occurredAt) {
    throw new Error("Workflow events require case, user, and occurrence identifiers.");
  }
  if (event.name === "documents.uploaded" && event.data.documentIds.length === 0) {
    throw new Error("documents.uploaded requires at least one document id.");
  }
  return event;
}
