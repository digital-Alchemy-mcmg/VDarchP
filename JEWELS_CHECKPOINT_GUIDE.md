# Jewels Checkpoint Marking Guide

## Overview

This guide explains how to mark checkpoints as you complete each task in the 4 instruction sets.

**TL;DR:**
1. As you complete each sub-task, mark `[x]` next to the checkpoint in `CHECKPOINTS.md`
2. Save evidence files to `.checkpoints/` directory
3. Runner automatically verifies your work every 30 minutes
4. If Runner flags a discrepancy, loop back to that checkpoint and fix it

---

## How Checkpoints Work

### Before Starting
1. Read `CHECKPOINTS.md` completely
2. Understand your current instruction set (1, 2, 3, or 4)
3. Read the sub-checkpoints for that instruction set

### As You Work

#### Step 1: Complete the Task
- Run the required command or action
- Verify it succeeded
- Document the result

#### Step 2: Create Evidence File
Save output to `.checkpoints/` directory:

```bash
# Example 1: npm install log (Checkpoint 1.3)
npm install > .checkpoints/1_3_npm_install_log.txt 2>&1

# Example 2: Build log (Checkpoint 1.4)
npm run build > .checkpoints/1_4_build_log.txt 2>&1

# Example 3: Markdown documentation (Checkpoint 2.1)
# Create manually in .checkpoints/2_1_defect_inventory.md
cat > .checkpoints/2_1_defect_inventory.md << 'EOF'
# Defect Inventory

Defect #1: ESM __dirname issue
File: vite.config.ts:12
Issue: __dirname not available in ESM
Fix: Replaced with import.meta.dirname
Status: Fixed in commit abc123

... (repeat for each defect)
EOF
```

#### Step 3: Mark Checkpoint Complete
1. Open `CHECKPOINTS.md`
2. Find the checkpoint you just completed
3. Change `[ ]` to `[x]`
4. Commit this change:

```bash
git add CHECKPOINTS.md
git commit -m "checkpoint: mark 1.3 dependencies-installed [x]"
```

#### Step 4: Move to Next Checkpoint
- Read the next checkpoint in the same instruction set
- If last checkpoint in instruction set, move to next instruction set

---

## Example: Completing Checkpoint 1.3 (Dependencies Installed)

```bash
# 1. Run the install
npm install > .checkpoints/1_3_npm_install_log.txt 2>&1

# 2. Verify it succeeded
if [ $? -eq 0 ]; then
  echo "✅ Install succeeded"
else
  echo "❌ Install failed - DO NOT MARK CHECKPOINT"
  exit 1
fi

# 3. Verify node_modules exists and is substantial
if [ -d "node_modules" ] && [ $(du -s node_modules | cut -f1) -gt 50000 ]; then
  echo "✅ node_modules populated"
else
  echo "❌ node_modules missing or too small"
  exit 1
fi

# 4. Edit CHECKPOINTS.md and mark [x]
# (Use editor or sed command)
sed -i 's/^- \[ \] \*\*Checkpoint:\*\* `npm install` executed/- [x] **Checkpoint:** `npm install` executed/' CHECKPOINTS.md

# 5. Commit
git add CHECKPOINTS.md .checkpoints/1_3_npm_install_log.txt
git commit -m "checkpoint: complete 1.3-dependencies-installed [x]"

# 6. Move to next checkpoint: 1.4
echo "✅ Checkpoint 1.3 complete. Next: 1.4 Build Succeeds"
```

---

## Checkpoint Marking Syntax

**Format in CHECKPOINTS.md:**

```markdown
### 1.3 Dependencies Installed Successfully
- [ ] **Checkpoint:** npm install executed with zero critical errors
- [ ] **Checkpoint:** node_modules/ directory populated (>50MB typical)
```

**After completion, change to:**

```markdown
### 1.3 Dependencies Installed Successfully
- [x] **Checkpoint:** npm install executed with zero critical errors
- [x] **Checkpoint:** node_modules/ directory populated (>50MB typical)
```

---

## Evidence File Naming Convention

**Pattern:** `.checkpoints/<SET>_<CHECKPOINT>_<DESCRIPTION>.txt` or `.md`

| Checkpoint | File Name | Content |
|------------|-----------|---------|
| 1.1 | `.checkpoints/1_1_intake_structure.txt` | Unpack log |
| 1.3 | `.checkpoints/1_3_npm_install_log.txt` | npm install output |
| 1.4 | `.checkpoints/1_4_build_log.txt` | npm run build output |
| 1.5 | `.checkpoints/1_5_intake_report.md` | Markdown summary |
| 2.1 | `.checkpoints/2_1_defect_inventory.md` | Defect list (6+) |
| 2.2 | `.checkpoints/2_2_test_log.txt` | Compilation output |
| 2.3 | `.checkpoints/2_3_blocker_analysis.md` | Blocker findings |
| 2.4 | `.checkpoints/2_4_repairs_log.md` | Repair details |
| 2.5 | `.checkpoints/2_5_final_build_log.txt` | Final build output |
| 3.1 | `.checkpoints/3_1_git_status.txt` | Pre-push git status |
| 3.2 | `.checkpoints/3_2_push_log.txt` | Push output |
| 3.4 | `.checkpoints/3_4_handoff_receipt.md` | Handoff receipt |
| 4.1 | `.checkpoints/4_1_receipt_posted.txt` | PR comment link |
| 4.2 | `.checkpoints/4_2_checklist.md` | Verification checklist |

---

## Runner Verification & Loop-Back

### How Runner Works

Every 30 minutes, the automated runner:

1. **Reads** `CHECKPOINTS.md`
2. **Verifies** each checkpoint against actual repository state
3. **Checks** for required evidence files in `.checkpoints/`
4. **Flags** any discrepancies (missing files, failed builds, etc.)
5. **Posts** a comment on PR #1 if issues found

### Example Runner Check

```
CHECK: DEPENDENCIES_INSTALLED
  ✓ node_modules/ exists
  ✓ .checkpoints/1_3_npm_install_log.txt exists
  ✓ No peer dependency conflicts

Result: PASS ✅
```

### If Discrepancy Detected

**Runner posts:** "DISCREPANCY_BUILD_FAILED: No build output found"

**You must:**

1. Read the discrepancy message in PR #1 comments
2. Identify which checkpoint failed (e.g., 1.4)
3. Go back to that checkpoint in `CHECKPOINTS.md`
4. Complete the missing task or fix the error
5. Create/update the evidence file
6. Mark the checkpoint `[x]`
7. Commit and push
8. Runner re-checks on next scheduled run

**Example loop-back:**

```bash
# Runner flagged: DISCREPANCY_BUILD_FAILED

# 1. Go back to checkpoint 1.4
# Read error in build log: "Error: __dirname is not defined"

# 2. Fix the error in vite.config.ts
# ... make code change ...

# 3. Re-run build
npm run build > .checkpoints/1_4_build_log.txt 2>&1

# 4. Verify success
# If build succeeds: mark checkpoint and commit
sed -i 's/\[ \]/[x]/' CHECKPOINTS.md
git add CHECKPOINTS.md .checkpoints/1_4_build_log.txt
git commit -m "checkpoint: fix 1.4-build-succeeds [LOOP-BACK]"
git push origin <current-branch>

# 5. Runner will verify on next run
echo "✅ Loop-back complete. Waiting for runner verification..."
```

---

## Handoff Receipt Template (Checkpoints 3.4 & 4.1)

When you reach Checkpoint 3.4 or 4.1, save this to `.checkpoints/3_4_handoff_receipt.md`:

```markdown
# Handoff Receipt

## Terminal State: DONE_PR_OPEN

- **STATUS:** DONE_PR_OPEN
- **TASK:** Bootstrap extraction + defect repair for Versail deployment
- **ROLE:** Worker (Jewels)
- **BRANCH:** repair/versail-deployment-<DATE>
- **COMMIT:** <SHA of last repair commit>
- **PR:** #1 (or #<new-number>)
- **CHECKS:** ✅ Build passed, all dependencies resolve, no TypeScript errors
- **RESULT:** Extracted application configured, 6 identified defects repaired:
  1. [Defect #1] → [File:Line] → [Fix Applied]
  2. [Defect #2] → [File:Line] → [Fix Applied]
  3. [Defect #3] → [File:Line] → [Fix Applied]
  4. [Defect #4] → [File:Line] → [Fix Applied]
  5. [Defect #5] → [File:Line] → [Fix Applied]
  6. [Defect #6] → [File:Line] → [Fix Applied]
- **BLOCKER:** None
- **NEXT_OWNER:** Reviewer (code review required)
- **NEXT_ACTION:** Independently verify all repairs; approve or request changes

---

## Pre-Review Verification Checklist (Jewels):
- [x] Bootstrap structure complete (package.json, vite.config.ts, tsconfig present)
- [x] npm install succeeds without errors
- [x] npm run build succeeds
- [x] All identified defects mapped to code changes
- [x] Each fix tested locally
- [x] All commits recorded and pushed
- [x] PR updated with clear handoff
- [x] No unresolved blockers hidden
- [x] Reviewer ownership clear
- [x] AGENTS.md authority order referenced
```

---

## Quick Reference: Checkpoint Paths

### Instruction Set 1: INTAKE (5 sub-checkpoints)
```
1.1 ─→ 1.2 ─→ 1.3 ─→ 1.4 ─→ 1.5 ─→ 1.6 (COMPLETE)
```

### Instruction Set 2: DEFECTS (6 sub-checkpoints)
```
2.1 ─→ 2.2 ─→ 2.3 ─→ 2.4 ─→ 2.5 ─→ 2.6 (COMPLETE)
```

### Instruction Set 3: PERSIST (5 sub-checkpoints)
```
3.1 ─→ 3.2 ─→ 3.3 ─→ 3.4 ─→ 3.5 (COMPLETE)
```

### Instruction Set 4: HANDOFF (4 sub-checkpoints)
```
4.1 ─→ 4.2 ─→ 4.3 ─→ 4.4 (COMPLETE)
```

**Total Checkpoints:** 20

---

## Troubleshooting

### "Runner flagged DISCREPANCY but I marked the checkbox"

**Reason:** Checkpoint was marked but evidence file is missing or incorrect.

**Fix:**
1. Verify the evidence file exists: `ls -la .checkpoints/X_Y_*.txt`
2. Check file contents: `cat .checkpoints/X_Y_*.txt | head -20`
3. If missing, recreate by re-running the command with output redirect
4. Re-commit and push

### "I need to redo Instruction Set 1, do I start from 1.1?"

**Answer:** Yes, go back to 1.1 and work through all checkpoints in order. Runner will re-verify each.

### "I'm on 2.4 (repairs) but don't know which 6 defects to fix"

**Answer:** Look at `.checkpoints/2_1_defect_inventory.md`. You should have created that at checkpoint 2.1. If missing, go back to 2.1 and create it.

### "Can I skip checkpoints?"

**Answer:** No. Each checkpoint has dependencies. Skipping a checkpoint will cause Runner to flag a discrepancy, and you'll loop back.

---

## Success Criteria

✅ **You're done when:**

1. All 20 checkpoints marked `[x]` in `CHECKPOINTS.md`
2. All evidence files exist in `.checkpoints/`
3. PR #1 (or new PR) is open with handoff receipt
4. Runner verification passes with no discrepancies
5. Handoff comment posted to PR with NEXT_OWNER = Reviewer

**Then:** Merge authority passes to Reviewer and Merger.

---

**Questions?** Refer back to `AGENTS.md` for authority order. When in doubt, flag the issue and wait for Operator guidance.

