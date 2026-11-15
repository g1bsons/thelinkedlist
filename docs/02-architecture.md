# Architecture and implementation reference

## System boundary

```text
Local CSV / JSON file -> parser + runtime validation -> preview -> user confirmation
                                                         |
React forms -> validated state snapshot -> localStorage -> React selectors -> UI
                                          |
                                      JSON download
```

Vite serves static frontend assets. The app does not implement a backend, use cookies, or send CRM data to a remote service. React renders imported text as text. External links are user initiated and constrained to HTTP(S); contact profile links are constrained to LinkedIn profile URLs.

## Source map

- `src/model.ts`: Zod schemas, inferred domain types, reference/uniqueness validation, date/identity/nurture/chart functions.
- `src/import.ts`: pure CSV adapter, preamble/header recognition, deduplication preview.
- `src/storage.ts`: versioned localStorage adapter and JSON download.
- `src/demo.ts`: explicit fictional sample workspace with dates relative to load.
- `src/App.tsx`: navigation, screen composition, forms, dialogs, user actions.
- `src/styles.css`: tokens, layout, responsive rules, focus states.
- `tests/`: domain/import tests and Playwright browser flows.
- `public/`: example import fixture; no private data.

## Data model

The complete machine-enforced field definitions are in `model.ts`; inspect them alongside this section. Root schemaVersion is literal 1. Root holds arrays contacts, messages, reminders, jobs. IDs are UUIDs generated via crypto.randomUUID. Limits protect this MVP from accidentally loading huge files.

Contact: id, name, company, role, email, linkedin, tags[], notes, intervalDays, createdAt.
Message: id, contactId, direction (incoming/outgoing), body, at.
Reminder: id, contactId, title, dueAt, draft, done.
Job: id, company, role, kind (Job/Internship), status (Wishlist/Applied/Interviewing/Offer/Rejected/Withdrawn), url, deadline (empty or YYYY-MM-DD), contactId (empty or existing contact), notes.

Root invariants: IDs unique within each entity; all message/reminder contacts exist; nonempty job contactId exists. Strings have bounds; dates parse strictly; future messages are rejected. Backups are parsed with the same root schema as form mutations. Restoring replaces the entire workspace, never silently merges it. Version mismatches are rejected; no unimplemented migration is implied.

## State and persistence

App owns one domain snapshot plus transient UI state. A mutation computes a new immutable snapshot, validates it, writes storage, then publishes it to React. Write errors leave old state in place and show a banner. Initial invalid/unreadable storage enters recovery mode: no fallback silently overwrites the raw contents. Recovery offers raw download plus an explicit reset. Forms remain editable when validation fails. No mutation runs in an effect; effects handle the clock and browser storage-event detection. Cross-tab changes block editing and ask for reload to prevent routine lost updates, but localStorage has no atomic compare-and-swap: truly simultaneous writes remain a documented limit.

## Algorithms

- Identity: normalized lowercase LinkedIn URL (remove query/hash/trailing slash), otherwise lowercase email. Name alone is never an automatic match. Contacts with neither stable key are imported as distinct; duplicate names are not proof of identity.
- CSV dedupe: compare both supplied stable keys against existing and previously accepted rows; skip a row if either matches. This prevents overwriting richer manual notes but may skip ambiguous shared-email rows. Preview explains counts.
- Nurture: latest incoming/outgoing message timestamp, otherwise createdAt, determines elapsed whole 24-hour days. If there is no message, mark “No messages logged” and recommend an introduction immediately. Otherwise due if elapsed >= intervalDays. A reminder never fabricates an interaction. Sort never-contacted first then most overdue; it is a heuristic without predictive claims.
- Charts: six consecutive Monday-start local calendar weeks, count incoming and outgoing message timestamps falling into each half-open range. Current week is partial. Exact counts are exposed in text alongside bars. No synthetic engagement score or response-rate estimate.
- Jobs: current stage is mutable and stored; stage totals are derived, not separately persisted. Deadlines do not schedule background notifications.
- File import: 2 MiB CSV / 16 MiB JSON file cap, maximum 2,000 contacts and 10,000 other records per collection. Synchronous JSON/localStorage is a deliberate small-workspace constraint, not a measured performance guarantee.

## Extension boundaries

Move storage behind an asynchronous repository when adopting IndexedDB/SQLite or a service. Add source adapters producing validated candidate contacts/messages without coupling UI to LinkedIn archive internals. Introduce migration functions before changing schemaVersion. Keep message sending out of domain operations unless a permitted integration is separately designed and authorized.

## Field limits and validation details

| Field group                              | Contract                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| IDs                                      | UUID strings; generated IDs use the browser crypto API                                                                                |
| Names, roles, companies, reminder titles | Trimmed strings, maximum 200 characters; contact name, job company/role, reminder title required                                      |
| Notes, message bodies, drafts            | Trimmed strings, maximum 10,000 characters; message body required                                                                     |
| Contact email                            | Empty or syntactically valid email; source is not verified for deliverability                                                         |
| Contact LinkedIn link                    | Empty or HTTPS linkedin.com / www.linkedin.com with /in/ profile path; no scraping request is performed                               |
| Job URL                                  | Empty or complete HTTP(S) URL; no claim that the posting exists or is current                                                         |
| Tags                                     | Maximum 20, each nonempty and at most 200 characters                                                                                  |
| Follow-up interval                       | Integer 1–365 inclusive, default 30                                                                                                   |
| Job deadline                             | Empty or valid ISO calendar date YYYY-MM-DD                                                                                           |
| Message/reminder timestamps              | ISO timestamps with timezone; comparisons use epoch milliseconds rather than lexicographic sorting, so backup offsets order correctly |
| Upload limits                            | CSV 2 MiB; JSON 16 MiB, larger than typical localStorage capacity to allow restoring full exports                                     |

Job required-field behavior is checked by native forms and domain validation. A field passing native browser validation still goes through the root runtime schema. Schemas strip unknown object keys; version 1 does not promise preservation of unrecognized extension fields. Plain string content, including spreadsheet formulas and HTML-looking text, remains text.
