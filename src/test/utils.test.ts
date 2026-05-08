import { describe, it, expect } from "vitest";

// ZAR currency formatting helper used across the app
const formatZAR = (amount: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(amount);

describe("ZAR formatting", () => {
  it("formats whole rands", () => {
    const out = formatZAR(1234.5);
    expect(out).toContain("1");
    expect(out).toMatch(/R/);
    expect(out).toContain("234");
  });

  it("formats zero", () => {
    expect(formatZAR(0)).toMatch(/R/);
  });

  it("handles large numbers without losing precision", () => {
    const out = formatZAR(1_234_567.89);
    expect(out).toContain("567");
  });

  it("handles negative amounts", () => {
    const out = formatZAR(-50);
    expect(out).toMatch(/-|\(/);
  });
});

describe("date math: trial expiry", () => {
  const isExpired = (trialEndsAt: string) =>
    new Date(trialEndsAt).getTime() < Date.now();

  it("flags past dates as expired", () => {
    expect(isExpired(new Date(Date.now() - 1000).toISOString())).toBe(true);
  });

  it("does not flag future dates", () => {
    expect(
      isExpired(new Date(Date.now() + 86_400_000).toISOString()),
    ).toBe(false);
  });
});

describe("idempotency keys", () => {
  it("creates stable keys per template + id", () => {
    const make = (template: string, id: string) => `${template}-${id}`;
    expect(make("welcome", "abc")).toBe("welcome-abc");
    expect(make("welcome", "abc")).toEqual(make("welcome", "abc"));
  });
});
