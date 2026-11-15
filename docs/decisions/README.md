# Architecture decision register

Status: accepted for this MVP. Evidence checked against primary documentation on 2026-11-14 (America/Denver). Sources explain capabilities; conclusions below are engineering judgments under the stated constraints. Versions actually installed are pinned in package-lock.json, not inferred from documentation websites.

## ADR-001 — TypeScript with strict checks

Context: user explicitly wants TypeScript and explainable domain models. Choose strict TS with inferred Zod types, no untyped application-level `any`. Alternative: JavaScript with JSDoc is simpler to start but cannot meet the requested language as directly. Tradeoff: type syntax and build checks add learning work; compile-time types cannot validate file uploads. Evidence: [TypeScript strict](https://www.typescriptlang.org/tsconfig/strict.html) describes the stricter checker family. Therefore runtime validation remains separate.

## ADR-002 — React with Vite, no server framework

Context: interactive lists, dialogs, filters, and charts without keys or server persistence. React teaches component composition and controlled forms; Vite builds static assets. Alternatives: vanilla TS uses fewer dependencies but more manual DOM coordination; Next.js introduces server/runtime concepts this MVP does not require; Vue is credible but offers no uniquely necessary capability here. Tradeoff: no SSR or backend. Evidence: [React composition and state process](https://react.dev/learn/thinking-in-react), [Vite getting started](https://vite.dev/guide/). This is a fit decision, not a hiring-market ranking.

## ADR-003 — Browser localStorage with explicit backups

Context: zero configuration and persistence tonight. localStorage is available by origin and survives ordinary browser restarts. Alternatives: IndexedDB supports more structured/asynchronous storage; SQLite needs another runtime; hosted Postgres needs setup, security, credentials. Tradeoffs: synchronous writes, quotas, no synchronization, no encryption, private-mode and deletion risks. Use bounded workspaces, catch writes, version and validate backups. Evidence: [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). Revisit when workspaces approach limits; no benchmark establishes a safe contact count for every device.

## ADR-004 — User export import plus manual logs

Context: user rejects account risk and automation. Parse a user-selected Connections.csv and never request LinkedIn credentials. Alternatives: sanctioned partner APIs may require access outside this project; scraping/browser automation violates the user's chosen constraint. Tradeoff: snapshots can grow stale; no message synchronization. Evidence: [LinkedIn export instructions](https://www.linkedin.com/help/linkedin/answer/a566336), [LinkedIn agreement, section 8.2](https://www.linkedin.com/legal/user-agreement). LinkedIn provides an export path and restricts various automated access behaviors. This design avoids those behaviors; it is not a blanket legal compliance certification. Unverified native message archive schemas are explicitly deferred.

## ADR-005 — Papa Parse instead of splitting on commas

Context: real CSV may contain quotes, commas, CRLF and a preamble. Choose a maintained CSV parser; our adapter handles the supported header contract and validation. Alternative: hand-rolled parser creates avoidable edge cases. Tradeoff: dependency size and upstream maintenance. Evidence: [Papa Parse parsing, configuration and errors](https://www.papaparse.com/docs). Reject parse errors rather than partially committing a malformed file; preview valid rows and report semantic skips.

## ADR-006 — Zod at external and mutation boundaries

Context: TS erases types at runtime. Backups, persisted data and forms are untrusted. Zod defines one executable schema and inferred TS types. Alternatives: hand validation duplicates types; JSON Schema/Ajv is useful for cross-language contracts but adds concepts here. Tradeoff: runtime cost and dependency; constraints may reject otherwise useful large archives. Evidence: [Zod basics](https://zod.dev/basics). Root-level relationship checks supplement per-field schemas.

## ADR-007 — React state and pure functions

Context: four collections with simple derived summaries. Use a single owned snapshot, pure domain functions, and explicit saves. Alternative: Redux/Zustand is valuable with more complex shared state; a backend query cache is unnecessary here. Tradeoff: App.tsx is intentionally a larger MVP composition file and should be split by feature as complexity grows. Evidence: [React state structure](https://react.dev/learn/choosing-the-state-structure). Derived chart totals and due lists are computed to avoid contradictory stored state.

## ADR-008 — Native forms/dialogs and CSS charts

Context: polished but understandable interface. Semantic labels, native dialog focus behavior, visible focus rings, responsive CSS, system fonts, Lucide icons. Charts are simple CSS bars with equivalent text counts. Alternative: a component framework or chart package adds bundle size and conventions; drag-and-drop-only kanban reduces keyboard usability. Tradeoff: no zoom/interactive chart legend; a select changes job stages. Evidence: [MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog), [W3C form labels](https://www.w3.org/WAI/tutorials/forms/labels/), [Lucide React](https://lucide.dev/guide/packages/lucide-react). No formal WCAG certification is claimed.

## ADR-009 — Explainable interval rules and in-app reminders

Context: no email keys or background server. Calculate due reminders against current time while open. Nurture interval is user configurable; no opaque relationship score. Alternatives: email jobs/push need infrastructure and permissions; ML prioritization needs data and evaluation we do not have. Tradeoff: closing the app stops notification visibility. Evidence: [MDN setInterval](https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval) documents timers and delays; timers are not guaranteed exact execution. The 30-day default is a product choice, not sourced science.

## ADR-010 — Vitest and Playwright with npm lockfile

Context: imports, relationships and dates can lose or misrepresent personal data. Unit tests exercise pure invariants; browser tests verify real forms and reload. Alternative: manual-only testing is not repeatable; snapshots alone would not verify persistence. Tradeoff: browser installation and test maintenance. Evidence: [Vitest guide](https://vitest.dev/guide/), [Playwright tests](https://playwright.dev/docs/writing-tests), [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci). npm ci uses a committed lockfile for dependency reproduction; OS/browser versions and future registry availability can still differ.

## ADR-011 — Versioned portable JSON, explicit destructive actions

Context: user owns the data and must recover from browser storage loss. Choose full snapshot export/restore with schema and reference checks. CSV export loses relationships and nested fields. Cloud backup requires an account. Tradeoff: JSON contains private readable data and replacement restore can discard newer work. UI warns and asks confirmation; export first. Evidence: localStorage limitations in ADR-003 and runtime validation in ADR-006 support this choice. The exact backup version contract is our design, not a standard CRM interchange format.

## ADR-012 — Light editorial visual system

Context: a network tool should feel calm, legible and finished. Choose warm paper background, dark ink, orange accent, spacious cards, compact sidebar, serif headlines, system sans body, and clear status colors with text. Alternatives: dark-only UI or dense enterprise table view are valid but less aligned with this design direction. Tradeoff: personal aesthetic judgment, not objectively best; no external user usability study was performed. Mobile layouts adapt without removing core actions. Color alone never encodes state.

### Supporting implementation choices

- Use native `Date`, `Intl` formatting, `crypto.randomUUID`, `File.text`, `Blob` downloads and a native dialog instead of additional packages for small operations. This reduces concepts and dependencies; locale/timezone behavior is explicit in the architecture and tests. Evidence: [MDN Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date), [randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID), [File text via Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob/text). Full timezone scheduling would justify a separate date/time design.
- Use Prettier as a development-only formatter, with single quotes and 100-character preferred lines, to make the delivered source readable and reduce formatting-only review noise. These style values are preferences, not performance or correctness claims. Evidence: [Prettier rationale](https://prettier.io/docs/rationale). Run `npm run format` or `npm run format:check`.
- Use npm and a Node 24 baseline because npm is bundled with Node, it avoids another package-manager setup step, and the observed environment can verify it. No package-manager benchmark is claimed. `.gitignore` excludes generated output and likely personal backup names; it does not guarantee users cannot commit sensitive files under other names.
- Use independent domain tests plus end-to-end browser tests instead of duplicating every form with shallow component snapshots. These checks target data loss and user-visible outcomes. No numeric coverage target or all-browser guarantee is claimed. CI uses Node 24 on Ubuntu; local Chromium executable selection is a portability fallback, not an app runtime requirement.
- Use MIT for this project's code to permit reuse and modification with a standard permission notice. Third-party dependency notices remain in their packages. Evidence: [OSI MIT text](https://opensource.org/license/mit). This is a license choice, not a warranty.
