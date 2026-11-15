/**
 * CSV ADAPTER — translate an external file into validated candidate contacts.
 * This module never saves data. App.tsx displays this preview and commits it only
 * after the user chooses Import contacts. Tests can call it with plain strings.
 */
import Papa from 'papaparse';
import { contactSchema, identityKeys, uid, type Contact } from './model';
// Counts explain why source rows did or did not become new contacts.
export interface ImportPreview {
  contacts: Contact[];
  duplicates: number;
  invalid: number;
  total: number;
}
/** Parse the documented English Connections.csv shape, including an optional preamble.
 * Syntax errors reject the file; semantically invalid records are skipped/countable.
 * Existing contact objects are only read, so their notes cannot be overwritten here.
 */
export function parseConnections(
  text: string,
  existing: Contact[],
  now = new Date(),
): ImportPreview {
  // A BOM is an invisible encoding marker, not part of the first heading.
  // Papa Parse handles quoted commas/newlines; split(',') would corrupt such rows.
  // greedy skips fully empty records, including comma-only records.
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy' });
  if (parsed.errors.length) throw new Error('CSV could not be parsed: ' + parsed.errors[0].message);
  const normalize = (s: string) => s.trim().toLowerCase();
  // Find the actual header record instead of assuming it is the first line of an export.
  const index = parsed.data.findIndex(
    (row) => row.map(normalize).includes('first name') && row.map(normalize).includes('last name'),
  );
  if (index < 0)
    throw new Error(
      'Expected First Name and Last Name columns. Choose Connections.csv, not a ZIP or message archive.',
    );
  const headers = parsed.data[index].map(normalize);
  // Ambiguous duplicate column names would make our field lookup unreliable.
  if (new Set(headers).size !== headers.length)
    throw new Error('Duplicate CSV column names are not supported.');
  // Seed with existing identities, then extend with accepted candidates from THIS file.
  const known = new Set(existing.flatMap(identityKeys));
  const preview: ImportPreview = { contacts: [], duplicates: 0, invalid: 0, total: 0 };
  for (const row of parsed.data.slice(index + 1)) {
    preview.total++;
    // Wrong field counts may indicate a bad export/row; do not shift values into wrong fields.
    if (row.length !== headers.length) {
      preview.invalid++;
      continue;
    }
    // Optional missing columns return an empty value; name columns were required above.
    const get = (name: string) => (row[headers.indexOf(name)] ?? '').trim();
    // safeParse returns success/data or errors without throwing for every invalid row.
    // createdAt is the import time. Connected On is not a message date and is not inferred.
    const candidate = contactSchema.safeParse({
      id: uid(),
      name: [get('first name'), get('last name')].filter(Boolean).join(' '),
      company: get('company'),
      role: get('position'),
      email: get('email address'),
      linkedin: get('url'),
      tags: [],
      notes: '',
      intervalDays: 30,
      createdAt: now.toISOString(),
    });
    if (!candidate.success) {
      preview.invalid++;
      continue;
    }
    // Match either email or canonical profile URL. No stable key means no automatic dedupe.
    const keys = identityKeys(candidate.data);
    if (keys.some((key) => known.has(key))) {
      preview.duplicates++;
      continue;
    }
    // Register a row immediately so a duplicate later in the same upload is also skipped.
    keys.forEach((key) => known.add(key));
    preview.contacts.push(candidate.data);
  }
  // Check aggregate capacity before the UI offers a commit that would exceed the root schema.
  if (existing.length + preview.contacts.length > 2000)
    throw new Error(
      'This import would exceed the 2,000 contact limit. Split the file or reduce your workspace.',
    );
  return preview;
}
