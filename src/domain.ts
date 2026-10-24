// Company tiers: S = top choices, then B, then C.
export const TIERS = ["S", "A", "B", "C"] as const;
export type Tier = (typeof TIERS)[number];