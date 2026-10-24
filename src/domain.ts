// Company tiers: S = top choices, then A, and B, then C.
export const TIERS = ["S", "A", "B", "C"] as const;
export type Tier = (typeof TIERS)[number];

// Contact stages: where in the funnel a contact is 
export const STAGES = ["NOT_CONTACTED", "MESSAGED", "REPLIED", "MEETING_SCHEDULED", "MEETING_DONE", "THANKED", "REFERRED"] as const;
export type Stage = (typeof STAGES)[number];

// Common ground: things the person and contact have in common
export const AFFINITY = ["ALUMNI", "MAJOR", "HOMETOWN", "HOBBY", "OTHER"] as const;
export type Affinity = (typeof AFFINITY)[number];

// Contact channel: the method of contact for the contact
export const CHANNELS = ["EMAIL", "LINKEDIN", "PHONE"] as const;
export type Channel = (typeof CHANNELS)[number];