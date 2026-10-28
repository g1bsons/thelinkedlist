import { describe, expect, it } from "vitest";
import { priorityScore, rankContacts, type ScorableContact } from "./priority";

const NOW = new Date("2026-10-24T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

const base: ScorableContact = {
  tier: "B",
  affinity: [],
  stage: "NOT_CONTACTED",
  lastTouchAt: null,
};

describe("priorityScore", () => {
  it("ranks higher tiers above lower tiers", () => {
    const a = priorityScore({ ...base, tier: "A" }, NOW);
    const b = priorityScore({ ...base, tier: "B" }, NOW);
    const c = priorityScore({ ...base, tier: "C" }, NOW);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });

  it("adds points per affinity, capped at three", () => {
    const none = priorityScore(base, NOW);
    const one = priorityScore({ ...base, affinity: ["ALUMNI"] }, NOW);
    const three = priorityScore({ ...base, affinity: ["ALUMNI", "MAJOR", "HOMETOWN"] }, NOW);
    const five = priorityScore(
      { ...base, affinity: ["ALUMNI", "MAJOR", "HOMETOWN", "HOBBY", "OTHER"] },
      NOW,
    );
    expect(one - none).toBe(8);
    expect(three - none).toBe(24);
    expect(five).toBe(three);
  });

  it("gives in-progress contacts one point per day since last touch, capped at 14", () => {
    const emailed = { ...base, stage: "EMAILED" as const };
    const day3 = priorityScore({ ...emailed, lastTouchAt: daysAgo(3) }, NOW);
    const day10 = priorityScore({ ...emailed, lastTouchAt: daysAgo(10) }, NOW);
    const day60 = priorityScore({ ...emailed, lastTouchAt: daysAgo(60) }, NOW);
    expect(day10 - day3).toBe(7);
    expect(day60 - priorityScore({ ...emailed, lastTouchAt: daysAgo(14) }, NOW)).toBe(0);
  });

  it("scores finished contacts at zero", () => {
    expect(priorityScore({ ...base, tier: "A", stage: "THANKED" }, NOW)).toBe(0);
    expect(priorityScore({ ...base, tier: "A", stage: "REFERRED" }, NOW)).toBe(0);
  });

  it("does not go negative if lastTouchAt is in the future", () => {
    const future = new Date(NOW.getTime() + 5 * 24 * 60 * 60 * 1000);
    const score = priorityScore({ ...base, stage: "EMAILED", lastTouchAt: future }, NOW);
    expect(score).toBe(20);
  });
});

describe("rankContacts", () => {
  it("sorts by score, drops finished contacts, and keeps input order on ties", () => {
    const first = { id: "first", ...base, tier: "B" as const };
    const second = { id: "second", ...base, tier: "B" as const };
    const top = { id: "top", ...base, tier: "A" as const };
    const done = { id: "done", ...base, tier: "A" as const, stage: "THANKED" as const };

    const ranked = rankContacts([first, done, second, top], NOW).map((c) => c.id);
    expect(ranked).toEqual(["top", "first", "second"]);
  });
});
