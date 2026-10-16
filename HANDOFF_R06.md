STATUS: PASS
TASK: R06 — Recompute layout direction (PR #1 discussion_r4201758209)
ROLE: Codex sole worker
BRANCH: fix/vite-esm-dirname-8379249439334795469
COMMIT: 6f649a1e561c85217dcb95b13377bb47ca27d4d1
PR: #2; local only
FILES_CHANGED: src/store/ModelStore.ts, tests/store.test.ts, evidence/R06-before.txt, evidence/R06-after.txt
CHECKS: npm test (6 PASS)
RESULT: Regression failed before repair because node coordinates stayed TB. TB→LR→TB now updates actual coordinates, publishes once per change, and retains the lock invariant.
BLOCKER: None for this item.
NEXT_OWNER: Operator SXV8 / designated independent reviewer
NEXT_ACTION: Independently inspect and reproduce regression.
Awaiting independent verification.
