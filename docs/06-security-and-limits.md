# Privacy, safety and operational limits

## Trust boundaries

Local files, form values and persisted JSON are untrusted. Zod validates snapshots, custom checks enforce relationships, CSV parsing rejects syntax failures, React escapes rendered strings. Profile URLs accept HTTPS LinkedIn /in/ URLs; other links accept HTTP(S), never javascript/data URLs. External links use noopener/noreferrer. Imported CSV formulas remain text; this MVP exports JSON, not spreadsheet CSV.

## Data handling

No authentication, server database, telemetry, remote fonts, analytics, account credentials, or CRM network requests. The dev server serves code; do not expose it publicly with personal data. Use the localhost command as supplied. Downloaded JSON backups contain names, addresses, notes, and message content in readable text. This is not encryption at rest. Anyone with access to your browser profile can inspect it; malicious extensions or same-origin scripts can read it. Keep your device/profile private and collect only data you need.

## Availability and correctness

Browser deletion, private browsing, profile changes, storage quotas, origin changes and device loss may remove or hide data. Export regularly. Synchronous localStorage writes may be slow for large data. Limits are conservative product guardrails, not empirically measured universal safe values: 2 MiB CSV files / 16 MiB JSON backups, 2,000 contacts, 10,000 messages/reminders/jobs per collection. A workspace can still hit the browser quota below these counts. Storage errors reject the save and leave the existing state intact.

One active tab is the supported editing mode. A storage event from another tab blocks edits pending reload, but simultaneous writes have a remaining race because localStorage is not transactional. IndexedDB transactions or server concurrency control are a future improvement.

Dates use the browser's timezone. Six-week charts start Monday using local midnight; daylight saving changes do not redefine calendar weeks. Nurture intervals use elapsed 24-hour periods, which is deliberately different from counting calendar date boundaries. Clock/device timezone changes affect display and due calculations. Due tasks update within approximately a minute while open; closed apps do not notify you. No background scheduler is implemented.

## LinkedIn boundary

The app has no LinkedIn password field, extension, scraper, session access, API call or sending function. User-controlled exports are parsed locally. Manual messages and drafts are user entered. These architectural facts avoid implementing prohibited automation; they do not certify every future use against changing terms or privacy laws. Consult current LinkedIn rules before adding an integration. The project is independent and unaffiliated.

## Dependencies and maintenance

package-lock.json pins the install graph. Review dependency updates, rerun checks, and use `npm audit` as a maintenance signal; a clean scan would not prove security. Do not commit personal backups. .gitignore excludes common backup names, .env files, test output and node_modules. Do not deploy this MVP as a shared multi-user system without a new security and persistence design.
