# Learn the project and extend it

## Learning sequence

1. Run it, add one contact/message/reminder/job, export backup. Explain what is and is not stored online.
2. Read model.ts: union types, inferred schemas, UUID relationships, array transformations, date functions. Change a display label without changing the stored enum.
3. Read import.ts with its tests. Explain why `split(',')` fails on a quoted company name and why matching by full name is unsafe.
4. Read storage.ts and App.tsx save flow. Explain compile-time types versus runtime validation, state immutability, write-before-publish and recovery mode.
5. Trace a controlled form into a mutation, then a derived dashboard count. Build a new read-only filter as a small exercise.
6. Read CSS tokens/layout/media queries. Adjust spacing and test 390px and keyboard navigation.
7. Run tests, intentionally break a reference invariant, observe the failure and fix it. Learn Playwright locators and assertions.
8. Make a branch, implement one roadmap item with docs and tests, review the diff, and commit. Only claim skills you can demonstrate.

## Interview walkthrough

Explain: the problem; zero-credential requirement; why local storage fits an MVP; explicit data-loss tradeoffs; import preview + dedupe; runtime validation; referential cleanup; transparent nurture rules; actual checks; and the next persistence migration. Demonstrate one workflow live using fictional data. A technically defensible decision includes when it should be replaced.

Possible resume language after you have studied and extended it:

> Built a TypeScript/React personal CRM with local persistence, validated CSV import, relationship reminders, message activity charts, and a job application pipeline; documented architecture tradeoffs and added unit/browser workflow tests.

Disclose AI assistance when relevant. Do not claim user adoption, percentages, production deployment or benchmark improvements without measuring them.

## Ordered roadmap

| Next change                      | Why                                                        | Completion evidence                                                                                                    |
| -------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Feature component extraction     | Reduce App.tsx complexity as features grow                 | Same browser flows pass; each feature owns its form/view                                                               |
| IndexedDB repository             | Async, transactional writes and larger workspace           | Migration tests, quota/recovery behavior, concurrent-write tests                                                       |
| Verified message archive adapter | Avoid manual history entry                                 | Anonymized real fixture, explicit identity/direction mapping, unknown participant resolution, preview + reimport tests |
| Job stage history                | Interview timeline and elapsed-stage analytics             | Append-only transition model, migration, chronology tests                                                              |
| Calendar export                  | Reminders in an existing calendar without sending messages | RFC-compliant ICS escaping, timezone tests, explicit export                                                            |
| Accessible UX audit              | Verify assistive technology behavior                       | Screen reader and keyboard results, contrast evidence                                                                  |
| Optional hosted mode             | Cross-device access                                        | Threat model, auth, tenant isolation, encrypted transport, backups, deletion/export, integration tests                 |
| Permitted integrations only      | Add sources without scraping                               | Current API permission evidence, rate limits, user consent, documented fallback                                        |

Do not add all of these at once. Each changes scope and should have a new ADR, migration plan where necessary, and demonstrable acceptance test.
