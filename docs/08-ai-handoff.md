# AI handoff — complete continuation brief

You are working on The Linked List, a TypeScript personal professional-network CRM. Read README, docs/01 through docs/09, decisions/README, package.json, model.ts and tests before editing. This brief plus those files are the requirements; do not ask the user to repeat them.

## Nonnegotiable user intent

Deliver a functional, polished, understandable MVP with documentation first. No authentication keys, paid accounts, LinkedIn scraping, automatic message sending, or unsupported “best” claims. Explain alternatives and evidence. The user wants to study and reproduce the work later. Build changes within the existing source; preserve personal browser data. Do not assume access to the user's previous planner or infer its stack from another assistant's claims.

## Required experience

Navigation: Overview, Network, Messages, Follow-ups, Applications, Data & settings. Empty first-run onboarding; opt-in fictional demo. Warm light responsive design with dark sidebar, orange accent, serif headings, legible data cards and text-backed weekly charts. Contact CRUD/search/details, CSV import preview/dedupe, incoming/outgoing manual logs, interval-based nurture explanations, dated drafts/reminders with completion/reopen/edit, editable job/internship pipeline, schema-validated JSON backup/restore, safe explicit reset.

## Technical contract

React + strict TypeScript + Vite. Zod runtime schemas and inferred types. Papa Parse local CSV. Lucide icons. CSS without required network fonts. Browser localStorage root key `the-linked-list:v1`, literal schemaVersion 1 and contacts/messages/reminders/jobs arrays. IDs UUID. All message/reminder references resolve; job contact optional. Stable URL/email identity dedupe, never fuzzy name merge. Save validated snapshot before updating UI; show persistence failures. Bad stored data enters recover/reset UI and is not overwritten. New schema version requires a migration design.

CSV contract: header row containing First Name + Last Name after optional preamble, optional URL/Email Address/Company/Position/Connected On; trim/BOM/quoted cells/CRLF; preview commit; no messages inferred. 2 MiB CSV / 16 MiB JSON file cap, max 2,000 contacts, 10,000 each other collection. Future message timestamps are invalid. External links constrained. See source for exact field bounds. JSON restore replaces only after preview and explicit confirmation.

## Verification and delivery

Use `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`. Use installed Chromium or Playwright's supported browser. Keep meaningful domain and UI workflow assertions. Test reload persistence, rejected restore nonmutation, contact cascade, CSV dedupe, due logic and responsive overflow. Update docs/05 with observed results, not assumptions. Do not claim a real LinkedIn archive, WCAG audit or production security was tested when it was not.

Before coding enhancements: document scope, ADR and acceptance criteria; implement; verify; update guides and journal; provide source/lockfile/docs/tests/fixtures. Avoid node_modules in source delivery. No deployment, public GitHub push, or account connection is necessary for this MVP. All currently deferred work belongs in docs/07 unless separately requested.
