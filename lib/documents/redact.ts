export type RedactionResult = {
  text: string;
  redactions: Array<{ kind: "ssn" | "payment_card"; count: number }>;
};

export function redactSensitiveText(input: string): RedactionResult {
  let text = input;
  const redactions: RedactionResult["redactions"] = [];

  let ssnCount = 0;
  text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, () => {
    ssnCount += 1;
    return "[REDACTED_SSN]";
  });
  if (ssnCount) redactions.push({ kind: "ssn", count: ssnCount });

  let cardCount = 0;
  text = text.replace(/\b(?:\d[ -]*?){13,19}\b/g, (candidate) => {
    const digits = candidate.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19 || !passesLuhn(digits)) return candidate;
    cardCount += 1;
    return "[REDACTED_PAYMENT_CARD]";
  });
  if (cardCount) redactions.push({ kind: "payment_card", count: cardCount });

  return { text, redactions };
}

function passesLuhn(digits: string) {
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let value = Number(digits[index]);
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}
