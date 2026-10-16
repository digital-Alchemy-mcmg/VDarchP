STATUS: PASS
TASK: R07 — Starter Mermaid ingestion loses edges and creates spurious arrow nodes (new executable finding)
ROLE: Codex sole worker
BRANCH: fix/vite-esm-dirname-8379249439334795469
COMMIT: 83477ff6d48fd32f2d12cb8d59bf5a6d7ba76685
PR: #2; local only
FILES_CHANGED: src/services/parser.ts, tests/services.test.ts, evidence/R07-before.txt, evidence/R07-after.txt
CHECKS: npm test (7 PASS); npm run typecheck (PASS)
RESULT: Before repair e-commerce retained 11/12 edges, ETL 7/9, zero-trust 7/8; arrow fragments became external nodes. Inline definitions are now stripped while retaining real IDs, arrows cannot become IDs, and chained edges parse. Regression checks all three built-in fixtures (11/10/9 nodes; 12/9/8 edges), types, labels and a chained inline diagram.
BLOCKER: None for this item. This remains a limited deterministic Mermaid parser, not the entire Mermaid language.
NEXT_OWNER: Operator SXV8 / designated independent reviewer
NEXT_ACTION: Independently inspect and reproduce regression.
Awaiting independent verification.
