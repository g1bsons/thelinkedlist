import type { Affinity, Stage, Tier } from "./domain";

export interface ScorableContact {
  tier: Tier;
  affinity: readonly Affinity[];
  stage: Stage;
  /** Most recent outreach, or null if never contacted. */
  lastTouchAt: Date | null;
}

const TIER_WEIGHT: Record<Tier, number> = { A: 30, B: 20, C: 10 };
const AFFINITY_POINTS = 8;
const AFFINITY_CAP = 3;
const FRESH_BONUS = 10; // a never-contacted contact is a clean opportunity
const STALE_CAP_DAYS = 14;
const DONE_STAGES: ReadonlySet<Stage> = new Set(["THANKED", "REFERRED"]);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Higher score = work on this contact sooner in a session.
 *
 * - Tier A/B/C sets the base weight.
 * - Each shared affinity adds points (capped at three).
 * - Never-contacted contacts get a fresh bonus; contacts in progress gain
 *   one point per day since the last touch (capped at two weeks) so
 *   follow-ups don't slip.
 * - Finished contacts (thanked, referred) score 0 and drop out of the queue.
 */
export function priorityScore(contact: ScorableContact, now: Date = new Date()): number {
  if (DONE_STAGES.has(contact.stage)) return 0;

  const base =
    TIER_WEIGHT[contact.tier] +
    Math.min(contact.affinity.length, AFFINITY_CAP) * AFFINITY_POINTS;

  if (contact.stage === "NOT_CONTACTED" || contact.lastTouchAt === null) {
    return base + FRESH_BONUS;
  }

  const days = Math.max(0, Math.floor((now.getTime() - contact.lastTouchAt.getTime()) / MS_PER_DAY));
  return base + Math.min(days, STALE_CAP_DAYS);
}

/** Return contacts sorted by descending priority, ties broken by input order. */
export function rankContacts<T extends ScorableContact>(contacts: readonly T[], now: Date = new Date()): T[] {
  return contacts
    .map((c, i) => ({ c, i, s: priorityScore(c, now) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.c);
}
