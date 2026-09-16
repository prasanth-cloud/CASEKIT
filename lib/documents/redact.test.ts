import { describe, expect, it } from "vitest";
import { redactSensitiveText } from "./redact";

describe("redactSensitiveText", () => {
  it("redacts SSNs before downstream analysis", () => {
    const result = redactSensitiveText("SSN 123-45-6789 belongs in private evidence.");
    expect(result.text).toContain("[REDACTED_SSN]");
    expect(result.text).not.toContain("123-45-6789");
    expect(result.redactions).toContainEqual({ kind: "ssn", count: 1 });
  });

  it("redacts payment-card-like values only when Luhn-valid", () => {
    const result = redactSensitiveText("Card 4111 1111 1111 1111; order 1234 5678 9012 3456.");
    expect(result.text).toContain("[REDACTED_PAYMENT_CARD]");
    expect(result.text).toContain("1234 5678 9012 3456");
  });

  it("does not modify ordinary order numbers", () => {
    const text = "Order 12345678 was promised on Friday.";
    expect(redactSensitiveText(text).text).toBe(text);
  });
});
