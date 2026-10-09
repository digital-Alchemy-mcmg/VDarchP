STATUS: PASS
TASK: R05 — Markdown arrows corrupt IDs (PR #1 discussion_r4201758206)
ROLE: Codex sole worker
BRANCH: fix/vite-esm-dirname-8379249439334795469
COMMIT: fc8e20dd2864c0486b7d6ffe57c8cf26e212a263
PR: #2; local only
FILES_CHANGED: src/services/parser.ts, tests/services.test.ts, evidence/R05-before.txt, evidence/R05-after.txt
CHECKS: npm test (5 PASS)
RESULT: Before repair NodeA --> NodeB created COMP-NODEA_-. All documented arrows now preserve IDs; hyphenated names and labels work; the word "to" does not split Storage.
BLOCKER: None for this item.
NEXT_OWNER: Operator SXV8 / designated independent reviewer
NEXT_ACTION: Independently inspect and reproduce regression.
Awaiting independent verification.
