import { describe, expect, it } from "vitest";
import { buildFollowupDueEvent, assertWorkflowEvent } from "../../lib/workflows/events";
import { parseReminderDate, validateOutboundAuthorization } from "../../lib/workflows/follow-up-boundary";

describe("workflow boundary integration contracts", () => {
  it("keeps a due event correlated and retry-identifiable", () => {
    const event = buildFollowupDueEvent({
      caseId: "case-1",
      userId: "user-1",
      reminderId: "reminder-1",
      idempotencyKey: "retry-1",
      dueAt: "2026-09-17T09:00:00.000Z",
    });

    expect(assertWorkflowEvent(event)).toEqual(event);
    expect(event.data.idempotencyKey).toBe("retry-1");
  });

  it("uses deterministic UTC follow-up dates and requires outbound confirmations", () => {
    expect(parseReminderDate("2026-09-17", new Date("2026-09-16T12:00:00.000Z"))).toBe("2026-09-17T09:00:00.000Z");
    expect(() => validateOutboundAuthorization({
      recipientEmail: "owner@example.com",
      draftVersion: 1,
      destinationConfirmed: true,
      attachmentsConfirmed: false,
      sendAuthorized: true,
      idempotencyKey: "retry-1",
    })).toThrow("attachment");
  });
});
