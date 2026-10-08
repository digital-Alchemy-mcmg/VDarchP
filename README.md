# VDarchP — Vercel Deployment Readiness

## Active objective (Operator directive, October 8, 2026)
Bring VDarchP to **100% independently verified readiness for Vercel deployment from `main`**. This is a target, **not an assertion that the app currently deploys**. The Operator inspects verified work and alone authorizes any merge or production deployment.

## Role boundaries
- **Jules:** Exclusive application-code author. Repairs and tests code in its assigned work environment. No pushing, merging, or deploying without a new Operator directive.
- **ChatGPT Technical Verifier:** Read-only verification every hour at :15, America/New_York. Independently checks code/build/config and relevant Codex suggestions.
- **ChatGPT Continuity Verifier:** Read-only verification every hour at :40, America/New_York. Independently checks progress, open defects, Codex suggestions, and handoff continuity.
- **Codex:** Provides independent review findings; verified deployment-critical findings are incorporated into Jules' workload, without granting Codex write authority.
- **Operator:** Only acceptance, merge, and deployment authority.
- **ChatGPT instruction publisher:** Authorized only to publish these governance documents in the current setup. Not authorized to alter app code.

The authoritative updated boundaries and work-loop requirements are in [AGENTS.md](AGENTS.md). Historical instructions in that file are superseded where inconsistent.

## Current repository posture
- Production target branch: `main`.
- Application reconstruction is under [PR #1](https://github.com/digital-Alchemy-mcmg/VDarchP/pull/1) on a Jules development branch; unmerged code is **not** a verified main-branch release.
- Current governance documents and older checkpoint procedures do not prove a successful Vercel deployment.
- Do not mark completed until each acceptance gate below is supported by recorded evidence.

## Jules startup
1. Read `AGENTS.md`, this README, `CHECKPOINTS.md`, latest PR review/Codex comments, current tree and relevant recent commits.
2. Reconcile existing repairs before duplicating work; create an itemized, prioritized defect ledger with source, SHA, issue, Vercel relevance, acceptance test, owner, and state.
3. Verify dependency installation, TypeScript, build, routing, static assets, and app behavior. Validate Vercel project integration/configuration and environment requirements.
4. Implement authorized fixes only as the exclusive code author. Record file changes, local references, executed checks/results and unresolved blockers. **Do not push, merge, or deploy.**
5. Supply a precise handoff receipt to the two read-only verifiers; incorporate verified Codex findings into the next workload iteration. If a delivery mechanism is unavailable, mark HANDOFF_PENDING.

## Independent verification
Each verifier must inspect real evidence, distinguish assertions from successful checks, carry forward unresolved findings, and report status with timestamp, branch/commit, checked gates, URLs, Codex findings, next owner and next action. At :15 and :40 the verifiers work in succession without editing GitHub or app code. Absence of new Codex suggestions is explicitly flagged to the Operator in ChatGPT and does not itself establish completion.

## Readiness gates
- [ ] The intended production code is present in the accepted `main` deployment tree (following separately authorized merge).
- [ ] Dependencies install reproducibly and TypeScript/build checks pass.
- [ ] Required app functionality, imports, asset loading, and navigation have been tested.
- [ ] Vercel project connection, root, build command, output, SPA routing, and needed environment configuration have been confirmed.
- [ ] No outstanding critical code review, build, or Vercel deployment blocker remains.
- [ ] Verifier reports and Jules receipts identify matching code revisions and independent evidence.
- [ ] Operator reviews and expressly authorizes merge/deployment.
- [ ] A real Vercel production deployment is independently verified when authorized.

Do not declare the repository '100% complete' before the applicable gates are evidenced. No agent is authorized to silently bypass a blocked gate, merge, or deploy.
