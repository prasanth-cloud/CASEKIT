import { describe, expect, it } from "vitest";
import { normalizeRecipientEmail, parseReminderDate, requireIdempotencyKey, validateOutboundAuthorization } from "./follow-up-boundary";

describe("Stage 8 follow-up and outbound boundaries", () => {
  const now = new Date("2026-09-16T12:00:00.000Z");

  it("normalizes and validates recipient addresses", () => {
    expect(normalizeRecipientEmail("  Owner@Example.com ")).toBe("owner@example.com");
    expect(() => normalizeRecipientEmail("not-an-email")).toThrow("valid destination");
  });

  it("bounds reminder dates and produces a deterministic UTC time", () => {
    expect(parseReminderDate("2026-09-17", now)).toBe("2026-09-17T09:00:00.000Z");
    expect(() => parseReminderDate("2026-09-16", now)).toThrow("future");
    expect(() => parseReminderDate("2026-02-31", now)).toThrow("future");
    expect(() => parseReminderDate("2027-09-17", now)).toThrow("within the next year");
  });

  it("requires explicit confirmations at the outbound boundary", () => {
    expect(() => validateOutboundAuthorization({
      recipientEmail: "owner@example.com",
      draftVersion: 2,
      destinationConfirmed: false,
      attachmentsConfirmed: true,
      sendAuthorized: true,
      idempotencyKey: "retry-1",
    })).toThrow("destination");

    expect(validateOutboundAuthorization({
      recipientEmail: " Owner@Example.com ",
      draftVersion: 2,
      destinationConfirmed: true,
      attachmentsConfirmed: true,
      sendAuthorized: true,
      idempotencyKey: " retry-1 ",
    })).toEqual({ recipientEmail: "owner@example.com", idempotencyKey: "retry-1" });
  });

  it("rejects blank retry keys", () => {
    expect(() => requireIdempotencyKey(" ")).toThrow("retry key");
  });
});
