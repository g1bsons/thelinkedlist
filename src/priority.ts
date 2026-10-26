import type { Company, Contact, Tier } from "./domain";

const TIER_POINTS: Record<Tier, number> = {
  S: 40,
  A: 30,
  B: 20,
  C: 10,
};

export function priorityScore(contact: Contact, company: Company | null, now: Date): number {
  const tier = company?.tier ?? "C";
  return TIER_POINTS[tier];
}