# INSTRUCTION SET 3: REMOTE PERSISTENCE & PR UPDATE

**Objective:** Push repaired code and establish clear handoff for review.

## Tasks

1. **Pre-push verification**
   ```bash
   git status
   # Should: "On branch repair/versail-deployment-<date>"
   # Should: "nothing to commit, working tree clean"
   ```
   Mark `[x]` in CHECKPOINTS.md line: `### 3.1 Pre-Push Verification`

2. **Create and push repair branch**
   ```bash
   git checkout -b repair/versail-deployment-$(date +%Y%m%d)
   git push origin repair/versail-deployment-$(date +%Y%m%d)
   # Record: Branch name and HEAD SHA
   ```
   Mark `[x]` in CHECKPOINTS.md line: `### 3.2 Remote Push Executed`

3. **Update PR #1 with repairs**
   - Update PR body to include:
     - Summary of 6 repairs (file:line, fix applied)
     - Build status: ✅ Pass
     - Deployment readiness: Ready
   Mark `[x]` in CHECKPOINTS.md line: `### 3.3 PR Updated or Created`

4. **Create handoff receipt**
   - Save to `.checkpoints/3_4_handoff_receipt.md`
   ```markdown
   # Handoff Receipt

   STATUS: DONE_PR_OPEN
   TASK: Bootstrap extraction + defect repair for Versail deployment
   ROLE: Worker (Jewels)
   BRANCH: repair/versail-deployment-<date>
   COMMIT: <SHA>
   PR: #1
   CHECKS: ✅ Build passed
   RESULT: 6 defects repaired [list each]
   BLOCKER: None
   NEXT_OWNER: Reviewer
   NEXT_ACTION: Code review required
   ```
   Mark `[x]` in CHECKPOINTS.md line: `### 3.4 Handoff Documentation Created`

5. **Finalize**
   ```bash
   git add CHECKPOINTS.md .checkpoints/
   git commit -m "checkpoint: complete instruction-set-3-persist [#3.5]"
   git push origin repair/versail-deployment-<date>
   ```
   Mark `[x]` in CHECKPOINTS.md line: `### 3.5 INSTRUCTION SET 3 COMPLETE`

---

## NEXT OWNER
**Reviewer (independent code review)**

