# Product specification — MVP 1

## Goal

Help one student or early-career professional remember their network, maintain thoughtful contact, and organize jobs and internships. Ship a usable project requiring no credentials and enough explanation to study it later.

## Known requirements

The user requests TypeScript, polished presentation, complete MVP workflows, safe user-controlled LinkedIn integration, manual logging, reminders rather than message sending, a job pipeline, and documentation before implementation. Existing work may be reused only if accessible and simplified. No previous source was supplied or accessible here, so this is a clean implementation. The previous assistant's claims about the user's old stack are not treated as verified facts.

## Explicit design assumptions

- A browser application satisfies “TypeScript program”; no desktop installer was requested.
- One person and one active tab are sufficient for tonight. There is no server and no login.
- User imports an archive they obtained themselves. We do not access LinkedIn sessions.
- Default nurture interval is 30 days; it is editable per contact, between 1 and 365 days. This is a transparent convenience default, not an evidence-backed optimal networking frequency.
- Both incoming and outgoing logged messages count as interaction; a reminder completion alone does not imply a message was sent.
- A job deadline is a calendar date; message/reminder timestamps are instants shown in the user's browser timezone. Local datetime inputs are converted to ISO timestamps.
- No contact is created merely by visiting a page. Demo data is fictional and opt-in.

## Acceptance criteria

| ID  | Workflow and expected result                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Add/edit/search/delete a contact; reload preserves changes; deletion removes that contact's messages/reminders and unlinks jobs after confirmation.                                                    |
| C2  | Upload supported Connections.csv; preview additions/duplicates/rejected rows; cancel changes nothing; commit adds accepted rows and preserves existing notes. Reimport adds zero duplicate identities. |
| C3  | Log an incoming/outgoing message with content and past/present timestamp. The contact history and weekly counts update; delete corrects them.                                                          |
| C4  | Create a reminder with contact, due timestamp, title, draft; edit, complete, reopen or delete it. Due items are visible in overview/reminders.                                                         |
| C5  | Show contacts due for nurturing with exact interval/last-interaction explanation. Never-contacted people are explicitly labeled, not assigned fabricated dates.                                        |
| C6  | Add/edit/delete jobs or internships; change status; retain company, role, URL, deadline, linked contact, notes.                                                                                        |
| C7  | Export versioned JSON; restore preview reports entity counts and requires confirmation. Invalid schema, duplicate IDs, and dangling references are rejected without replacing live data.               |
| C8  | Empty states, opt-in demo, mobile layout, semantic forms, keyboard dialogs, visible focus and errors are usable.                                                                                       |
| C9  | A clean install builds and passes type, domain, and browser workflow tests; docs report actual outcomes and limitations.                                                                               |

## Out of scope

Automatic LinkedIn sending or scraping; production account security; multi-user collaboration; cloud backup; email reminders; AI-written personalization; native message archive import; attachments; fuzzy entity merging; retrospective job stage history. No unsupported claim of official LinkedIn affiliation or approved partner status.
