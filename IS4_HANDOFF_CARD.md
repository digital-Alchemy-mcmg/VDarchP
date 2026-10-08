# INSTRUCTION SET 4: HANDOFF DOCUMENTATION & TERMINAL RECEIPT

**Objective:** Deliver clear handoff to reviewer and establish path to merge.

## Tasks

1. **Post handoff receipt to PR #1**
   - Copy content from `.checkpoints/3_4_handoff_receipt.md`
   - Post as PR comment with all fields filled
   Mark `[x]` in CHECKPOINTS.md line: `### 4.1 Handoff Receipt Posted to PR`

2. **Post pre-review verification checklist**
   - Reply to handoff receipt comment with:
   ```markdown
   ## Pre-Review Verification Checklist

   - [x] Bootstrap structure complete
   - [x] npm install succeeds without errors
   - [x] npm run build succeeds
   - [x] All defects mapped to code changes
   - [x] Each fix tested locally
   - [x] All commits recorded and pushed
   - [x] PR updated with clear handoff
   - [x] No unresolved blockers
   - [x] Reviewer ownership clear
   - [x] AGENTS.md authority order referenced
   ```
   Mark `[x]` in CHECKPOINTS.md line: `### 4.2 Pre-Review Verification Checklist Posted`

3. **Reference AGENTS.md authority**
   - Add comment to PR:
   ```markdown
   Terminal state: DONE_PR_OPEN
   This handoff follows AGENTS.md authority order.
   Next owner: Reviewer (independent verification required)
   Merge authority: Not assumed by worker
   ```
   Mark `[x]` in CHECKPOINTS.md line: `### 4.3 AGENTS.md Authority & Next Steps Documented`

4. **Final commit**
   ```bash
   git add CHECKPOINTS.md
   git commit -m "checkpoint: complete instruction-set-4-handoff [#4.4]"
   git push origin repair/versail-deployment-<date>
   ```
   Mark `[x]` in CHECKPOINTS.md line: `### 4.4 INSTRUCTION SET 4 COMPLETE`

---

## TERMINAL STATE
**DONE_PR_OPEN**
- Branch pushed ✅
- PR open ✅
- Handoff receipt visible ✅
- Reviewer assigned ✅
- No merge claimed ✅

---

## NEXT OWNER
**Reviewer (code review)**

