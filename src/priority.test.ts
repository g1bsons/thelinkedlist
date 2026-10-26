import { describe, expect, it } from "vitest";
import type { Company, Contact, Tier } from "./domain";
import { priorityScore } from "./priority";

const NOW = new Date("2026-10-24T12:00:00Z");

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "c1",
    fullName: "Test Person",
    title: null,
    companyId: null,
    linkedinUrl: null,
    affinity: [],
    stage: "NOT_CONTACTED",
    lastContactedOn: null,
    ...overrides,
  };
}

function makeCompany(tier: Tier): Company {
  return { id: "co1", name: "Acme", tier, notes: null };
}

describe("priorityScore", () => {
  it("ranks a higher-tier company above a lower-tier one", () => {
    const contact = makeContact();
    const top = priorityScore(contact, makeCompany("S"), NOW);
    const bottom = priorityScore(contact, makeCompany("C"), NOW);
    expect(top).toBeGreaterThan(bottom);
  });
});