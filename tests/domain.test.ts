/**
 * DOMAIN/IMPORT TESTS — run with npm test (Vitest).
 * Each test arranges input, calls a pure function, then asserts user-relevant rules.
 * These tests use no browser or network. Explicit dates keep boundary cases repeatable.
 */
import { describe, it, expect } from 'vitest';
import { parseConnections } from '../src/import';
import {
  emptyWorkspace,
  identityKeys,
  nurture,
  removeContact,
  safeUrl,
  uid,
  weeklyActivity,
  workspaceSchema,
  type Contact,
  type Message,
} from '../src/model';
// Factory returns a valid baseline; Partial<Contact> lets a test override only relevant fields.
const contact = (overrides: Partial<Contact> = {}): Contact => ({
  id: uid(),
  name: 'Alex Morgan',
  company: '',
  role: '',
  email: '',
  linkedin: '',
  tags: [],
  notes: '',
  intervalDays: 30,
  createdAt: '2026-01-01T00:00:00.000Z',
  // Spread overrides LAST so the test can intentionally replace defaults.
  ...overrides,
});
// A separate ID for each message keeps fixture references valid without hardcoding UUIDs.
const message = (
  c: Contact,
  at: string,
  direction: Message['direction'] = 'outgoing',
): Message => ({ id: uid(), contactId: c.id, at, body: 'Hello', direction });
const csv = 'First Name,Last Name,URL,Email Address,Company,Position,Connected On\n';
// IMPORT CONTRACT: successful parsing is not enough; preserve identities and existing user notes.
describe('CSV import integrity', () => {
  it('parses a BOM, preamble, CRLF, quoted commas, and embedded newlines', () => {
    const result = parseConnections(
      '\uFEFFNotes:\r\nExported for you\r\n\r\n' +
        csv.replace('\n', '\r\n') +
        'Alex,Morgan,https://www.linkedin.com/in/alex/,,"North, Inc.","Engineer\nII",01 Nov 2026',
      [],
    );
    expect(result.contacts[0].name).toBe('Alex Morgan');
    expect(result.contacts[0].company).toBe('North, Inc.');
    expect(result.contacts[0].role).toBe('Engineer\nII');
  });
  it('deduplicates by either key against existing and same-file candidates without overwriting notes', () => {
    const existing = contact({ email: 'alex@example.com', notes: 'Keep this' });
    const result = parseConnections(
      csv +
        'Alex,Morgan,,ALEX@example.com,X,Y,\nSofia,Kim,https://www.linkedin.com/in/sofia/?x=1,,X,Y,\nSofia,Kim,https://linkedin.com/in/SOFIA,,X,Y,',
      [existing],
    );
    expect(result.duplicates).toBe(2);
    expect(result.contacts).toHaveLength(1);
    expect(existing.notes).toBe('Keep this');
  });
  it('makes reimport idempotent for rows with stable identity', () => {
    const source =
      csv + 'Alex,Morgan,https://www.linkedin.com/in/alex/,alex@example.com,Acme,Engineer,';
    // Import twice: stable-key rows should contribute no new records on the second pass.
    const first = parseConnections(source, []);
    const second = parseConnections(source, first.contacts);
    expect(second.contacts).toHaveLength(0);
    expect(second.duplicates).toBe(1);
  });
  it('does not merge unrelated same-name contacts', () => {
    const result = parseConnections('First Name,Last Name\nAlex,Morgan\nAlex,Morgan', []);
    expect(result.contacts).toHaveLength(2);
  });
  it('reports semantic invalid rows and rejects malformed CSV or wrong headers', () => {
    expect(
      parseConnections(csv + 'Alex,Morgan,javascript:alert(1),nope,X,Y,\n,,,,X,,', []).invalid,
    ).toBe(2);
    expect(() => parseConnections('name,email\nAlex,a@example.com', [])).toThrow('First Name');
    expect(() => parseConnections(csv + '"Alex,Morgan', [])).toThrow('could not be parsed');
  });
});
// DATA INTEGRITY: deliberately invalid input must fail at the boundary, before storage changes.
describe('workspace invariants', () => {
  it('rejects dangling references and duplicate IDs', () => {
    const c = contact();
    const d = emptyWorkspace();
    d.contacts = [c];
    // This fresh contact was never added to d.contacts, creating a dangling foreign-key reference.
    d.messages = [message(contact(), '2026-01-02T00:00:00Z')];
    expect(workspaceSchema.safeParse(d).success).toBe(false);
    d.messages = [];
    d.contacts.push(c);
    expect(workspaceSchema.safeParse(d).success).toBe(false);
  });
  it('rejects unsupported versions, invalid dates, future messages, oversized fields, unsafe URLs', () => {
    const c = contact();
    const d = { ...emptyWorkspace(), contacts: [c] };
    expect(workspaceSchema.safeParse({ ...d, schemaVersion: 2 }).success).toBe(false);
    expect(
      workspaceSchema.safeParse({ ...d, messages: [message(c, '2099-01-01T00:00:00Z')] }).success,
    ).toBe(false);
    expect(
      workspaceSchema.safeParse({ ...d, contacts: [contact({ name: 'x'.repeat(201) })] }).success,
    ).toBe(false);
    expect(
      workspaceSchema.safeParse({ ...d, contacts: [contact({ createdAt: 'not a date' })] }).success,
    ).toBe(false);
    expect(safeUrl('javascript:alert(1)')).toBe(false);
    expect(safeUrl('https://linkedin.com.evil.example/in/alex', true)).toBe(false);
    expect(safeUrl('https://www.linkedin.com/in/alex/', true)).toBe(true);
  });
  it('cascades contact deletion while preserving and unlinking jobs', () => {
    const c = contact();
    const other = contact();
    const d = emptyWorkspace();
    d.contacts = [c, other];
    d.messages = [message(c, '2026-01-02T00:00:00Z'), message(other, '2026-01-02T00:00:00Z')];
    d.reminders = [
      {
        id: uid(),
        contactId: c.id,
        title: 'Hi',
        dueAt: '2026-01-02T00:00:00Z',
        draft: '',
        done: false,
      },
    ];
    d.jobs = [
      {
        id: uid(),
        company: 'Acme',
        role: 'Engineer',
        kind: 'Job',
        status: 'Wishlist',
        url: '',
        deadline: '',
        contactId: c.id,
        notes: '',
      },
    ];
    // Check all affected collections, including jobs that must survive with their link cleared.
    const next = removeContact(d, c.id);
    expect(next.contacts).toHaveLength(1);
    expect(next.messages[0].contactId).toBe(other.id);
    expect(next.reminders).toHaveLength(0);
    expect(next.jobs[0].contactId).toBe('');
    expect(workspaceSchema.safeParse(next).success).toBe(true);
  });
  it('normalizes identity across query, trailing slash and www variants', () => {
    expect(
      identityKeys(
        contact({
          linkedin: 'https://www.linkedin.com/in/Alex/?tracking=1',
          email: 'Alex@Example.com',
        }),
      ),
    ).toEqual(['url:linkedin.com/in/alex', 'email:alex@example.com']);
  });
});
// DATE RULES: injecting now lets us test exact cutoffs without sleeps or dependence on today.
describe('nurture and charts', () => {
  it('explains no-history contacts and uses latest interaction in either direction', () => {
    const c = contact({ intervalDays: 14 });
    const now = new Date('2026-02-01T00:00:00Z');
    expect(nurture(c, [], now).last).toBeNull();
    expect(nurture(c, [], now).due).toBe(true);
    const history = [
      message(c, '2026-01-01T00:00:00Z'),
      message(c, '2026-01-25T00:00:00Z', 'incoming'),
    ];
    expect(nurture(c, history, now).days).toBe(7);
    expect(nurture(c, history, now).due).toBe(false);
    expect(nurture(c, [message(c, '2026-01-18T00:00:00Z')], now).due).toBe(true);
  });
  it('counts local Monday boundaries exactly once, with separate direction totals', () => {
    const c = contact();
    const now = new Date(2026, 1, 4, 12); // Wednesday
    // JavaScript month indexes start at 0: month 1 is February. Build local calendar boundaries.
    const monday = new Date(2026, 1, 2);
    const result = weeklyActivity(
      [
        message(c, monday.toISOString()),
        // One millisecond before Monday must belong to the previous week, not both weeks.
        message(c, new Date(+monday - 1).toISOString(), 'incoming'),
      ],
      now,
    );
    expect(result).toHaveLength(6);
    expect(result[5].outgoing).toBe(1);
    expect(result[5].incoming).toBe(0);
    expect(result[4].incoming).toBe(1);
    expect(result.reduce((n, w) => n + w.incoming + w.outgoing, 0)).toBe(2);
  });
});
