# Build journal

## Initial evidence and decisions

Date: 2026-11-14 in the client's America/Denver timezone. Managed Linux workspace was empty of an application repository; Node v24.22.1, npm 11.9.0 and /usr/bin/chromium were observed. No prior planner code or real LinkedIn archive was available. The earlier assistant's stack claims were not verified and were not reused.

Before application code: wrote README, product specification, architecture/data contract, decision register, reproduction steps, user guide, verification plan, privacy/limits, learning roadmap and this AI handoff. Consulted primary React, Vite, TypeScript, MDN, Papa Parse and LinkedIn documentation. Docs label assumptions and unsupported formats instead of claiming universal optimality.

Planned implementation order: tooling -> domain/CSV/storage -> demo -> UI -> styles -> automated checks -> browser evidence -> documentation reconciliation -> portable archive. Package versions are recorded in lockfile after installation. Observed outcomes are added below during implementation.

## Implementation and verification

Implemented the documented domain model, import adapter, storage recovery, demo data and six responsive screens. Added unit/browser suites before final release. The first dependency install could not use the sandbox's home npm cache, so repeated it with `--cache /workspace/work/npm-cache`; this is an environment-specific flag, not required on a normal user's machine. Vite/React/TS dependencies and tooling are pinned by the installed lockfile. Added Prettier for readable source.

All 11 domain tests and all 8 real Chromium workflows pass after fixing explicit select labels and hiding the decorative navigation count from accessible names. Inspected desktop/mobile screenshots. Improved timestamp sorting to compare actual instants across timezone offsets and gave JSON restore a larger 16 MiB file cap than CSV's 2 MiB, so a full normal localStorage backup is not artificially blocked by the CSV limit. Errors from saves are visible inside native dialogs. Storage failure, corrupt stored JSON and cross-tab behavior are exercised.

The configured chat output directory was read-only on this managed machine. Prepared a private ChatGPT Page with the portable source download and screenshots rather than claiming a nonexistent local download link. No public deployment, repository push, LinkedIn access, credentials or message delivery was performed.

Final clean dependency reinstall passed. Strict typecheck, 11 unit tests and production build passed again using the pinned lockfile. Browser suite already passed against this application version; subsequent changes were docs/formatting only. Final Vite output is recorded in docs/05. Screenshots are included in docs/screenshots.
