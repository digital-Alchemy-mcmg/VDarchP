STATUS: PASS — local regression evidence; acceptance remains pending.
TASK: C08 React store updates
ROLE: Codex, sole worker under the 2026-10-08 solo work order
BRANCH: fix/vite-esm-dirname-8379249439334795469
COMMIT: 534953735723db0d6146c94cafb411de5fd660cb
PR: #2 (no remote changes made)
FILES_CHANGED: src/App.tsx, src/store/ModelStore.ts, package.json, package-lock.json, .gitignore, playwright.config.js, tests/store.test.ts, tests/browser/app.spec.js, evidence/C08-before.txt, evidence/C08-after.txt, evidence/C08-browser.txt
CHECKS: npm test (PASS); npm run typecheck (PASS); CHROMIUM_PATH=/opt/meta-chromium/chrome npm run test:browser (1 PASS).
RESULT: 7b1b1f4 only shallow-copied notification state; 93018f4 is an empty commit. The old test-store.js checks a single notification, not rendered React. New regression initially failed against those commits (evidence/C08-before.txt). Stable cloned snapshots now drive useSyncExternalStore; direct layout actions notify; invalid/missing-target edits no longer silently change history. Store regression covers repeated mutation categories, old snapshot preservation and unsubscribe; Chromium executes the real App and observes phase transitions and repeated node status updates without page errors.
BLOCKER: None for C08. Browser loopback responses are served through Playwright's Node request client due to workspace Chromium restrictions; this is not a deployed Vercel test.
NEXT_OWNER: Operator SXV8 / designated independent reviewer
NEXT_ACTION: Independently inspect the local commit and reproduce both regressions before acceptance.
Awaiting independent verification.

Follow-up tooling commit: ef607a6d990f0b18d61a1473a97ce1f9ea47b594 replaces the inadequate legacy test-store.js body with an entry point to the asserted store tests. `node --import tsx test-store.js` passes (evidence/legacy-store-entry.txt).
