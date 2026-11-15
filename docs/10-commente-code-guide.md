# Commented source study guide

This edition adds explanatory comments to the authored application, tests, HTML, styles, and configuration. Read the comments as a guide to the actual implementation; the architecture decision register supplies the evidence and alternatives. The comments explain responsibilities, data flow, edge cases, and limitations rather than repeating every line in English.

## Use the commented project

The download contains the full project, with the dependency fixes from release 1.0.1. No schema, storage key, package versions, application features, or data migration changed for the commented edition.

To update an existing project, export a browser backup, stop its server with Ctrl+C, and copy the matching files from the extracted `the-linked-list` folder into your existing project folder. Match the folder containing `package.json`; avoid accidentally nesting one project inside another. Do not copy generated `node_modules` or `dist` directories from other machines. Run `npm ci` and `npm run dev` in that project folder. Use the same browser profile and printed origin (scheme, host and port) to access your existing data.

Your existing files are on your own computer; this delivery modifies the shared source copy and provides a download. It does not remotely edit your local folder. No personal browser data is included in the archive.

## Read the source in this order

| File                             | What the comments explain                                                                        | Question to answer in class                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `index.html`                     | Browser document, mount point, module entry, viewport                                            | What exists before React mounts?                                              |
| `src/main.tsx`                   | Mounting App, importing CSS, the non-null assertion                                              | How does the browser reach the React application?                             |
| `src/model.ts`                   | Runtime schemas, inferred types, ID relationships, duplicates, deletion, nurturing, date buckets | Why are TypeScript types alone insufficient for an uploaded JSON file?        |
| `src/storage.ts`                 | Origin-scoped storage, validation before writing, recovery, local downloads, upload bounds       | What happens if saving fails or stored JSON is corrupt?                       |
| `src/import.ts`                  | CSV parsing, preamble/header discovery, semantic validation, stable-key matching, preview        | Why does importing the same identified contact twice not add another one?     |
| `src/demo.ts`                    | Fictional fixtures, relative dates, stable relationships within a snapshot                       | Which displayed values are demo data rather than actual user activity?        |
| `src/App.tsx`                    | Shared UI, forms, state, actions, derived lists, each screen, confirmation dialogs               | Trace one record from a button click to its saved representation.             |
| `src/styles.css`                 | Base styles, reusable tokens, component layouts, focus indicators, responsive overrides          | How does the layout adapt without changing the underlying records?            |
| `tests/domain.test.ts`           | Fixtures, identity/invariant assertions, exact date boundaries                                   | Which bug would a selected test catch?                                        |
| `tests/workflows.spec.ts`        | Real browser controls, isolated contexts, persistence, fault injection, keyboard/layout checks   | What does a browser test prove that a pure-function test does not?            |
| `vite.config.ts`                 | React plugin and separation of domain/browser suites                                             | Why do the two test suites use different filename patterns?                   |
| `playwright.config.ts`           | Browser selection, server lifecycle, ports, container launch flag                                | How do the tests know the app is ready before clicking?                       |
| `tsconfig.json`                  | Compiler settings, strictness, JSX, bundler resolution, noEmit                                   | Why does tsc check types while Vite produces the build?                       |
| `.github/workflows/check.yml`    | Repeatable hosted checks and dependency audit                                                    | Which checks are configured in CI and which run separately?                   |
| `.gitignore` / `.prettierignore` | Source-control and formatting exclusions                                                         | Why should dependencies and personal backups stay out of a source repository? |

Look for the file header first, then named functions and uppercase screen/section comments. In App.tsx, the reading map at the top explains its organization. Comments on a shared component apply to every repeated use; individual text labels and obvious assignments are intentionally not all annotated.

## Trace adding a contact

1. A navigation/page button calls `setEditor({ type: 'contacts' })`. This opens an editing dialog; it does not create a record yet.
2. `EditorForm` shows native inputs with defaults. Their `name` attributes become the lookup keys in `FormData`.
3. Submitting calls `submit`. `preventDefault` stops normal page navigation. The helper `s` reads and trims each field, intervalDays becomes a number, and a new UUID is created unless an existing record is being edited.
4. `save` checks supplied stable identities against other contacts. When editing, it excludes the same record ID so the contact does not count itself as a duplicate.
5. `save` constructs a new snapshot with object spread and a new contact array. It passes that snapshot to `commit`.
6. `commit` blocks writes during recovery/cross-tab conflict, then calls `persist`. `persist` validates the complete root schema before `localStorage.setItem` writes it.
7. After a successful write, `commit` calls `setData`. React rerenders; network cards, counts, and suggestions now derive from the saved snapshot.
8. On success the form closes. On error it stays open with the input values intact. This avoids displaying an unsaved record as if saving succeeded.

Editing, task completion, and stage changes reuse the same save/commit boundary. CSV parsing is a separate adapter: it produces a preview, and the Import contacts button later calls commit. Restoring JSON validates a full snapshot and asks permission to replace the current one.

## React form and state details

The editing forms are **uncontrolled**: native input elements retain their unsaved values, `defaultValue` initializes them, and FormData reads them on submit. Search and stage filters are **controlled**: a React state variable supplies `value`, and an onChange handler updates that variable. These are both valid patterns; describing every form in this project as controlled would be inaccurate.

The domain snapshot is different from temporary UI state. `data` is persisted; `page`, `query`, `editor`, upload previews and notices are not. A reload restores the snapshot but starts navigation at Overview. Derived arrays such as `due` and `activeJobs` are computed, avoiding a second stored count that could disagree with the underlying records.

## Syntax worth understanding

| Syntax                          | Meaning in this project                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `type Page = 'Overview' \| ...` | Only the listed strings are allowed by the TypeScript checker.                                                  |
| `z.infer<typeof contactSchema>` | Derive a compile-time type from the runtime validation schema.                                                  |
| `as Contact`, `!`               | Type assertions tell the checker what the author expects. They do not validate data or catch errors at runtime. |
| `?.`                            | Read/call only when the preceding value is not null or undefined.                                               |
| `??`                            | Use a fallback for null/undefined; preserve valid values such as false or zero.                                 |
| `{ ...data, [type]: rows }`     | Copy an object and replace the property whose name is held in type. This is a shallow copy, not a deep clone.   |
| `map`, `filter`, `find`, `some` | Transform all items, retain matching items, find the first match, or check whether any match exists.            |
| `new Set(keys)`                 | Store unique keys and support direct membership checks.                                                         |
| `async` / `await`               | Wait for file reading without pretending its result is already available.                                       |
| `useEffect` cleanup             | Unsubscribe from events/timers or clean up the native dialog when the component unmounts.                       |
| `useState(load)`                | Call load as a lazy initializer instead of reading storage during every rerender.                               |
| `+date`                         | Convert a Date to epoch milliseconds for numeric comparison/arithmetic.                                         |
| `{/* ... */}`                   | A JSX comment that is not rendered as visible page content.                                                     |

The Editor union and its assertions are an MVP convenience rather than the strongest possible type model. A discriminated union binding each collection to exactly its matching value shape is a reasonable future refactor. Runtime snapshot validation remains the protection at the save boundary. Similarly, App.tsx intentionally remains a larger composition file; feature extraction is documented future work, not hidden behind comments.

## Files that cannot contain comments

`package.json`, `package-lock.json` and `.prettierrc.json` use strict JSON. JavaScript-style comments would break those formats. `tsconfig.json` supports JSON with comments, so it can be annotated directly. CSV fixtures and image assets are data, not places to insert explanatory code comments. Existing Markdown docs already contain prose explanations.

### package.json

| Field                 | Purpose                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| name/version          | Package identity and release label; they are not user data schema versions.                                                           |
| private               | Prevent accidental npm publication; it does not make a deployed website private.                                                      |
| type: module          | Use ECMAScript module semantics in the Node tooling context.                                                                          |
| engines.node          | Declare the documented Node baseline; enforcement can depend on installer settings.                                                   |
| dev                   | Start Vite on loopback. npm run alone lists commands; npm run dev starts the application server.                                      |
| typecheck             | Run the TypeScript checker without emitting JavaScript.                                                                               |
| build                 | Typecheck, then create static production output with Vite.                                                                            |
| preview               | Serve an existing production build locally for inspection.                                                                            |
| test / test:e2e       | Run the Vitest domain suite / Playwright browser suite.                                                                               |
| format / format:check | Apply Prettier or check formatting without rewriting files.                                                                           |
| dependencies          | React/React DOM for UI, Zod for validation, Papa Parse for CSV, Lucide for icons.                                                     |
| devDependencies       | Compiler, bundler/plugin, test runners, type declarations and formatter. They are development tools, not hosted application services. |
| allowScripts          | Approve the locked esbuild version's install script under npm 12, without allowing every package's scripts.                           |

Most dependency ranges permit compatible updates, while `npm ci` installs the exact graph from the lockfile. Vitest is pinned to the patched release chosen in the support update. Do not hand-edit the lockfile as a way to update package code; use npm and review its changes.

### .prettierrc.json

`singleQuote` prefers single quotes in supported JavaScript/TypeScript contexts; JSX/JSON retain their own syntax rules. `trailingComma: all` uses trailing commas where supported. `printWidth: 100` is a preferred wrapping width, not a guarantee that every source line is at most 100 characters. These affect formatting, not app functionality.

### package-lock.json and generated directories

npm generates the lockfile's resolved dependency graph, versions and integrity metadata. You would normally commit that file but would not author it manually. `node_modules` is the installed dependency tree; `dist` is Vite's generated output; `test-results` contains test artifacts. This commented edition does not add explanatory comments to generated files or dependency source.

## Presentation practice

Choose one function, explain its inputs and output, and point to a test exercising its behavior. Then explain one tradeoff: localStorage simplicity versus device sync, stable-key matching versus name matching, or explicit intervals versus a fabricated relationship score. Use the code comments to understand the implementation; they are not a substitute for being able to explain it in your own words. Existing AI-assistance disclosure and class-policy guidance in README still apply.

## Verification of the commented edition

The release process compares the annotated files with the pre-comment version: emitted TypeScript/TSX token streams, parsed CSS rules/declarations, HTML markup ignoring comments/whitespace, parsed compiler settings, workflow steps and ignore patterns. This checks for accidental executable or style changes introduced while inserting comments. The package manifest, formatter JSON and generated lockfile are also compared byte-for-byte with the original 1.0.1 archive. The final typecheck, 11 domain tests, production build and 8 browser tests are rerun before delivery. Actual outcomes are recorded in docs/05-verification.md.
