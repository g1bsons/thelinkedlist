// Domain constants shared by validators, scoring and UI.
// They mirror the enums in prisma/schema.prisma; keep the two in sync.

export const TIERS = ["A", "B", "C"] as const;
export type Tier = (typeof TIERS)[number];

export const STAGES = [
  "NOT_CONTACTED",
  "EMAILED",
  "REPLIED",
  "CALL_SCHEDULED",
  "CALL_DONE",
  "THANKED",
  "REFERRED",
] as const;
export type Stage = (typeof STAGES)[number];

export const AFFINITIES = ["ALUMNI", "MAJOR", "HOMETOWN", "HOBBY", "OTHER"] as const;
export type Affinity = (typeof AFFINITIES)[number];

export const CHANNELS = ["EMAIL", "LINKEDIN", "CALL"] as const;
export type Channel = (typeof CHANNELS)[number];
