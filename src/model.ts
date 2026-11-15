/**
 * DOMAIN LAYER — the rules and data shapes used by every screen.
 *
 * Read this file before App.tsx. Zod schemas check actual values at runtime;
 * inferred TypeScript types help the editor/compiler check our own code.
 * Neither layer replaces the other: a JSON file has no trusted TS type.
 * Helpers below do not access React or storage, so they can be tested directly.
 */
import { z } from 'zod';
// Reusable bounds keep forms, imports, stored data, and backups on the same contract.
const short = z.string().trim().max(200);
const text = z.string().trim().max(10000);
const required = short.min(1, 'Please enter a value.');
const id = z.uuid();
// Require a timezone-bearing ISO timestamp so a saved message represents one instant.
const instant = z.iso.datetime({ offset: true });
/** Check allowed URL shapes without visiting the link or verifying ownership.
 * The LinkedIn branch limits host AND path; a hostname containing "linkedin.com"
 * somewhere inside it (for example linkedin.com.evil.example) is not sufficient.
 * Blank links are valid because links are optional in the domain model.
 */
export function safeUrl(value: string, linkedin = false): boolean {
  if (!value) return true;
  try {
    const u = new URL(value);
    return linkedin
      ? u.protocol === 'https:' &&
          /^(www\.)?linkedin\.com$/.test(u.hostname) &&
          /^\/in\/[^/]+\/?$/.test(u.pathname)
      : ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}
const url = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => safeUrl(v), 'Use a full http:// or https:// URL.');
// A contact owns profile context; related records store its ID instead of copying it.
export const contactSchema = z.object({
  id,
  name: required,
  company: short,
  role: short,
  email: z.union([z.literal(''), z.email()]),
  linkedin: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => safeUrl(v, true), 'Use an https://www.linkedin.com/in/ profile URL.'),
  tags: z.array(short.min(1)).max(20),
  notes: text,
  intervalDays: z.number().int().min(1).max(365),
  createdAt: instant,
});
// Actual conversations belong here. An unsent/future message belongs in a reminder draft.
export const messageSchema = z.object({
  id,
  contactId: id,
  direction: z.enum(['incoming', 'outgoing']),
  body: text.min(1),
  at: instant.refine(
    (v) => Date.parse(v) <= Date.now(),
    'A message cannot be in the future. Use a reminder for drafts.',
  ),
});
// Task completion is independent of message history: done does not mean a message was sent.
export const reminderSchema = z.object({
  id,
  contactId: id,
  title: required,
  dueAt: instant,
  draft: text,
  done: z.boolean(),
});
// `as const` keeps literal stage names, rather than widening this to an array of any strings.
export const stages = [
  'Wishlist',
  'Applied',
  'Interviewing',
  'Offer',
  'Rejected',
  'Withdrawn',
] as const;
// Empty contactId means unlinked. A deadline is a calendar date, not a timestamp.
export const jobSchema = z.object({
  id,
  company: required,
  role: required,
  kind: z.enum(['Job', 'Internship']),
  status: z.enum(stages),
  url,
  deadline: z.union([z.literal(''), z.iso.date()]),
  contactId: z.union([z.literal(''), id]),
  notes: text,
});
// Validate the WHOLE snapshot at the storage/restore boundary. Per-record schemas
// cannot tell whether an ID is duplicated elsewhere or a referenced contact exists.
export const workspaceSchema = z
  .object({
    schemaVersion: z.literal(1),
    contacts: z.array(contactSchema).max(2000),
    messages: z.array(messageSchema).max(10000),
    reminders: z.array(reminderSchema).max(10000),
    jobs: z.array(jobSchema).max(10000),
  })
  .superRefine((data, ctx) => {
    // A Set keeps only unique values. A smaller size therefore exposes repeated IDs.
    for (const collection of ['contacts', 'messages', 'reminders', 'jobs'] as const) {
      const ids = data[collection].map((x) => x.id);
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({
          code: 'custom',
          path: [collection],
          message: `Duplicate IDs in ${collection}.`,
        });
    }
    // This is application-level referential integrity, analogous to a database foreign key.
    const contacts = new Set(data.contacts.map((c) => c.id));
    for (const collection of ['messages', 'reminders', 'jobs'] as const)
      data[collection].forEach((row, i) => {
        // Jobs may intentionally have an empty contactId; messages/reminders may not.
        if (row.contactId && !contacts.has(row.contactId))
          ctx.addIssue({
            code: 'custom',
            path: [collection, i],
            message: 'Referenced contact does not exist.',
          });
      });
  });
// Infer these from the executable schemas to avoid separately maintaining duplicate types.
export type Contact = z.infer<typeof contactSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Reminder = z.infer<typeof reminderSchema>;
export type Job = z.infer<typeof jobSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Collection = 'contacts' | 'messages' | 'reminders' | 'jobs';
// Return fresh arrays on each call so separate workspaces cannot accidentally share mutations.
export const emptyWorkspace = (): Workspace => ({
  schemaVersion: 1,
  contacts: [],
  messages: [],
  reminders: [],
  jobs: [],
});
// Browser-generated UUIDs identify records locally; IDs do not encode names or array positions.
export const uid = () => crypto.randomUUID();
/** Build comparison keys for the import/manual-add duplicate checks.
 * Precondition: callers normally pass validated contacts; URL parsing may throw.
 * Keys are a matching heuristic, not proof that two records are the same person.
 * Never merge by name alone: different people can have exactly the same name.
 */
export function identityKeys(c: Pick<Contact, 'linkedin' | 'email'>): string[] {
  const keys: string[] = [];
  if (c.linkedin) {
    // Omit tracking query/hash, normalize www/case, and ignore a final slash.
    const u = new URL(c.linkedin);
    keys.push(
      'url:' +
        u.hostname.replace(/^www\./, '').toLowerCase() +
        u.pathname.replace(/\/$/, '').toLowerCase(),
    );
  }
  if (c.email) keys.push('email:' + c.email.trim().toLowerCase());
  return keys;
}
/** Produce a new snapshot after deletion, leaving the original object intact.
 * Messages/reminders depend on this person and are removed. Jobs can stand alone,
 * so preserve the opportunities and clear only their contact association.
 */
export function removeContact(data: Workspace, contactId: string): Workspace {
  return {
    ...data,
    contacts: data.contacts.filter((c) => c.id !== contactId),
    messages: data.messages.filter((m) => m.contactId !== contactId),
    reminders: data.reminders.filter((r) => r.contactId !== contactId),
    jobs: data.jobs.map((j) => (j.contactId === contactId ? { ...j, contactId: '' } : j)),
  };
}
/** Explain a follow-up suggestion using a user-chosen interval.
 * `now` is injectable so tests can check exact boundaries without waiting.
 * Incoming AND outgoing interactions reset the clock; completing tasks does not.
 */
export function nurture(contact: Contact, messages: Message[], now = new Date()) {
  const history = messages.filter((m) => m.contactId === contact.id);
  // null means no history; using zero would invent an interaction at the Unix epoch.
  const last = history.length ? Math.max(...history.map((m) => Date.parse(m.at))) : null;
  // Use whole elapsed 24-hour periods, not calendar date changes. Clamp below
  // zero in case a device clock moves backwards. 86,400,000 is milliseconds/day.
  const days = Math.max(
    0,
    Math.floor((now.getTime() - (last ?? Date.parse(contact.createdAt))) / 86400000),
  );
  return {
    last,
    days,
    // Never-contacted people are suggested immediately; do not fabricate an old message.
    due: last === null || days >= contact.intervalDays,
    reason:
      last === null
        ? 'No messages logged · start a conversation'
        : `${days} days since your last interaction · ${contact.intervalDays}-day rhythm`,
  };
}
/** Aggregate six local calendar weeks, oldest first, with Monday as week start.
 * The current week is partial. Only logged messages contribute to these totals.
 * Calendar date arithmetic, rather than adding 7*24 hours, handles DST boundaries.
 */
export function weeklyActivity(messages: Message[], now = new Date()) {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  // getDay(): Sun=0, Mon=1, ..., Sat=6. This expression converts Monday to offset 0.
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 6 }, (_, i) => {
    // Clone Dates because setDate mutates its receiver; each bucket needs its own bounds.
    const start = new Date(monday);
    start.setDate(start.getDate() - (5 - i) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    // Half-open [start, end) ranges count a boundary message in exactly one week. +Date is epoch ms.
    const week = messages.filter((m) => Date.parse(m.at) >= +start && Date.parse(m.at) < +end);
    return {
      label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      incoming: week.filter((m) => m.direction === 'incoming').length,
      outgoing: week.filter((m) => m.direction === 'outgoing').length,
    };
  });
}
/** Convert unknown exceptions into readable UI text; limit schema errors to four issues. */
export function errorText(error: unknown): string {
  return error instanceof z.ZodError
    ? error.issues
        .map((i) => `${i.path.join('.') || 'Data'}: ${i.message}`)
        .slice(0, 4)
        .join(' • ')
    : error instanceof Error
      ? error.message
      : 'Something went wrong. Please try again.';
}
// datetime-local inputs expect a local wall-clock string with no timezone suffix.
// toISOString uses UTC, so offset a temporary copy before taking YYYY-MM-DDTHH:mm.
// On submit App.tsx interprets the local value and converts it back to an ISO instant.
export const dateTimeLocal = (date = new Date()) => {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
};
// undefined locale follows the browser setting; persisted data stays ISO, not formatted text.
export const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
