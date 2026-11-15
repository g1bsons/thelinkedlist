# Documentation map

These documents are the specification, rationale, operating guide, and handoff for this release. They were started before application code. The build journal distinguishes initial decisions from verified outcomes.

| Document                | Purpose                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| 01-product-spec         | Authorized scope, explicit assumptions, acceptance criteria             |
| 02-architecture         | Files, entities, invariants, data flow, algorithms                      |
| decisions/README        | Decision register with alternatives, tradeoffs, primary sources         |
| 03-reproduce            | Exact commands to run the pinned release; construction sequence         |
| 04-user-guide           | Every user workflow, formats, recovery                                  |
| 05-verification         | Repeatable automated and manual checks, actual verification results     |
| 06-security-and-limits  | Trust boundaries, data loss risks, supported limits                     |
| 07-learning-and-roadmap | Skills, interview walkthrough, incremental improvements                 |
| 08-ai-handoff           | Complete implementation brief and definition of done for a future agent |
| 09-build-journal        | Work sequence, deviations, observed environment                         |

No set of prose can promise a byte-identical rebuild by an arbitrary AI. This bundle includes source, pinned dependency lockfile, fixtures, tests, and commands; those are the exact reproducibility artifact. The handoff specifies behavior for independent reimplementation. Sources support technical properties, not a universal claim that our choices outperform every alternative. Product defaults are labeled design decisions, not research findings.
