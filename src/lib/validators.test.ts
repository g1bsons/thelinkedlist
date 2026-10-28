import { describe, expect, it } from "vitest";
import { companyInput, contactInput, outreachInput } from "./validators";

describe("companyInput", () => {
  it("trims the name and defaults the tier to B", () => {
    const parsed = companyInput.parse({ name: "  Acme  " });
    expect(parsed).toEqual({ name: "Acme", tier: "B" });
  });

  it("rejects an empty name", () => {
    expect(companyInput.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects an unknown tier", () => {
    expect(companyInput.safeParse({ name: "Acme", tier: "Z" }).success).toBe(false);
  });
});

describe("contactInput", () => {
  it("applies defaults for stage and affinity", () => {
    const parsed = contactInput.parse({ fullName: "Ada Lovelace" });
    expect(parsed.stage).toBe("NOT_CONTACTED");
    expect(parsed.affinity).toEqual([]);
  });

  it("accepts linkedin.com URLs and rejects other hosts", () => {
    expect(
      contactInput.safeParse({ fullName: "Ada", linkedinUrl: "https://www.linkedin.com/in/ada" }).success,
    ).toBe(true);
    expect(
      contactInput.safeParse({ fullName: "Ada", linkedinUrl: "https://example.com/in/ada" }).success,
    ).toBe(false);
  });

  it("rejects look-alike hosts such as notlinkedin.com", () => {
    expect(
      contactInput.safeParse({ fullName: "Ada", linkedinUrl: "https://notlinkedin.com/in/ada" }).success,
    ).toBe(false);
  });
});

describe("outreachInput", () => {
  it("coerces followUpOn strings to dates", () => {
    const parsed = outreachInput.parse({
      contactId: "c1",
      channel: "EMAIL",
      followUpOn: "2026-11-01",
    });
    expect(parsed.followUpOn).toBeInstanceOf(Date);
  });
});
