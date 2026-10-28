import { z } from "zod";
import { AFFINITIES, CHANNELS, STAGES, TIERS } from "./domain";

export const companyInput = z.object({
  name: z.string().trim().min(1, "Company name is required").max(120),
  tier: z.enum(TIERS).default("B"),
  notes: z.string().trim().max(2000).optional(),
});
export type CompanyInput = z.infer<typeof companyInput>;

export const contactInput = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(120),
  title: z.string().trim().max(120).optional(),
  companyId: z.string().optional(),
  linkedinUrl: z
    .string()
    .url()
    .refine((u) => {
      const host = new URL(u).hostname;
      return host === "linkedin.com" || host.endsWith(".linkedin.com");
    }, "Must be a linkedin.com URL")
    .optional(),
  affinity: z.array(z.enum(AFFINITIES)).default([]),
  stage: z.enum(STAGES).default("NOT_CONTACTED"),
});
export type ContactInput = z.infer<typeof contactInput>;

export const outreachInput = z.object({
  contactId: z.string().min(1),
  channel: z.enum(CHANNELS),
  body: z.string().trim().max(5000).optional(),
  followUpOn: z.coerce.date().optional(),
});
export type OutreachInput = z.infer<typeof outreachInput>;
