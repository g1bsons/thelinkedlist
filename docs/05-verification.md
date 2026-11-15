# Verification plan and evidence

Run from project root. Final observed results are appended after implementation, not predicted.

| Check   | Command           | Purpose                                                                                    |
| ------- | ----------------- | ------------------------------------------------------------------------------------------ |
| Types   | npm run typecheck | Strict application and config type validation                                              |
| Domain  | npm test          | CSV edge cases, duplicate identity, broken references, dates, nurture and chart boundaries |
| Build   | npm run build     | Typecheck plus production static bundle                                                    |
| Browser | npm run test:e2e  | Real Chromium empty/demo states, CRUD, reload, import/backup validation and mobile layout  |

## Manual release checklist

- Empty workspace has meaningful onboarding; demo is explicitly fictional.
- Contact add/edit, message log, reminder completion and job stage movement work and survive reload.
- Invalid CSV/JSON show understandable errors; previews require explicit commit.
- Exported JSON can be restored and does not lose relationships.
- Canceling a deletion leaves records unchanged; confirmed contact deletion removes dependent records.
- Tab order, Escape, focus return, required form fields, readable contrast and 390px layout are inspected.
- Storage failures are surfaced and malformed stored data is not silently replaced.
- App makes no runtime remote data calls; imported strings render as plain text.

## Limits of evidence

No real user LinkedIn archive was supplied; fixtures cover the documented supported format, not every historical/localized export variant. Browser checks use Chromium here, not Safari/Firefox or an assistive technology audit. No load benchmark, penetration test, guaranteed uptime, hiring outcome, or dependency vulnerability-free claim is made. Development verification is not an observed GitHub CI run.

## Observed release results

Verified on the managed Linux environment, Node 24.22.1 / npm 11.9.0, using system Chromium through Playwright 1.65.1:

- `npm run typecheck`: passed strict TypeScript checking.
- `npm test`: **11 tests passed**, covering quoted/preamble CSV, stable-key reimports, invalid inputs, identity normalization, reference constraints, cascade deletion, nurture boundary and six-week Monday boundaries.
- `npm run test:e2e`: **8 tests passed** in the final application run. They exercise contact creation/edit/search, message logging, reminder create/edit/complete/reopen, application creation/stage movement, reload persistence, cancel/confirm deletion and cascading cleanup; CSV preview cancellation/import/reimport; backup download, rejected restore and successful roundtrip; corrupt-storage recovery; simulated quota failure with unchanged live data; cross-tab blocking; duplicate manual identity/future message errors; and all six screens at 390px width.
- Desktop screenshot at 1440px and mobile screenshot at 390px were opened and visually inspected. Chromium reported no uncaught application exceptions and no remote requests during the demo navigation test. Mobile document width stayed within the viewport on each screen. The navigation itself intentionally scrolls horizontally at narrow sizes.
- Escape closes a native dialog and restores focus to its opener in the browser test. A full keyboard-only or screen-reader audit was not performed.
- `npm ci --cache /workspace/work/npm-cache`: clean reinstall passed with 113 packages. The cache flag only accommodates this sandbox. Typecheck, 11 unit tests, and the final production build passed after reinstall.
- Final production assets: JavaScript 382.43 kB (117.40 kB gzip), CSS 26.52 kB (6.66 kB gzip), as reported by Vite. These are build artifact sizes, not latency or runtime performance measurements.
- Vite reports two upstream Zod comment annotation warnings, removes the optimization comments, and completes successfully. No application compile/build error remains.

The first test run exposed implicit select-label matching and a navigation count becoming part of the button's accessible name. Explicit label/control IDs and an aria-hidden decorative count resolved those issues. Initial CSV test fixtures mixed record line endings; fixtures were corrected to test the documented consistent LF/CRLF variants. This was a test-fixture correction, not claimed new format support.
