# Reproduce, inspect, and rebuild

## Reproduce this exact source release

1. Install Node.js 24 LTS and its bundled npm. Development here used Node 24.22.1 and npm 11.9.0 on Linux. Other supported versions may work but were not tested here.
2. Extract the complete archive, including the hidden `.github` directory. Do not copy node_modules from another operating system.
3. Open a terminal in `the-linked-list` (where package.json lives).
4. Run `npm ci`; this uses package-lock.json. Internet is needed for the first install. No API keys or environment variables are needed.
5. Run `npm run dev`. Open the printed localhost address. Keep the same origin each time; changing localhost to 127.0.0.1 or changing ports selects different browser storage.
6. Run `npm run typecheck`, `npm test`, `npm run build`. Run `npx playwright install chromium` then `npm run test:e2e` for full browser verification when a system Chromium is unavailable.
7. Use `npm run preview` to inspect the production build. Its port differs from development; import a backup there to transfer your workspace. Do not double-click dist/index.html: file URL storage/module behavior is not the supported run mode.

## Construction sequence used

Documentation was written before application files. Read the build journal for actual verification and deviations.

1. Specify requirements, assumptions, boundaries, acceptance criteria, sources, and tradeoffs.
2. Write package.json, tsconfig.json, vite.config.ts, index.html, .gitignore, and lock dependencies through npm install. This is a manually scaffolded React/TypeScript Vite application, not an unexplained generated template.
3. Implement domain schemas, identity helpers, date calculations, root reference validation. Unit tests check behavioral properties rather than CSS snapshots.
4. Implement CSV parsing as a pure adapter. Feed text fixtures first, without browser file handling.
5. Add storage and recovery handling. Commit validated snapshots synchronously before publishing state.
6. Implement opt-in fictional demo data, dashboard, contacts, message logs, follow-ups, job pipeline, data tools and native editing dialogs.
7. Add CSS tokens and responsive behavior, charts with text alternatives, file preview and confirmation flows.
8. Run compiler/tests/build; fix failures; use a browser to exercise the actual controls, persistence, import and backup paths. Capture the final interface.
9. Update verification docs with actual results. Bundle source, docs, lockfile and fixtures; exclude node_modules and machine-specific caches.

## Recreate behavior independently

Use `08-ai-handoff.md` as the starting prompt and all linked docs as the specification. Keep tests and acceptance criteria. Use the source as the ground truth for exact field limits/algorithms. You cannot guarantee another model generates identical bytes from prose; copying this release or using version control provides that guarantee for the source.

## Formatting

Run `npm run format` to format source and docs using the included Prettier config. `npm run format:check` checks without editing. Prettier is a development-only tool.

## Version control and CI

After extraction run `git init`, `git add .`, `git commit -m "Build local-first networking CRM MVP"` after reviewing the files. No remote repository was created or published by this delivery. The included GitHub Actions workflow runs install, typecheck, unit tests and build on push/PR. Browser tests remain a separate local command to avoid quietly claiming CI coverage we have not observed on GitHub.

## Troubleshooting

- `node` not found: install Node, restart your terminal, check `node --version`.
- Port occupied: stop the previous server or choose another port; changing ports means a different storage origin. Export first when possible.
- Empty workspace after reopening: confirm exact origin and browser profile. Import a backup if moving origins. Private mode may clear data.
- Storage failure banner: export existing data, free browser storage or use another normal profile. A failed write does not count as saved.
- Invalid stored data: download the raw recovery file before reset. Restore a valid previous backup; schema version 1 does not migrate unknown formats.
- Browser test executable missing: run `npx playwright install chromium`; install required OS dependencies following Playwright docs if necessary.
