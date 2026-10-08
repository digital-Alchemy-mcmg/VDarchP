# Garage Verification & Progress Nudge System

**Purpose:** Grok runs two hourly verification passes to ensure Jewels' build is moving and escalate blockers.

## GARAGE ROLE

Garage is a verification + nudge agent that runs on a 60-minute cycle.

- **Pass 1 (Top of Hour):** Verify current state against CHECKPOINTS.md
- **Pass 2 (Bottom of Hour):** Check for progress since Pass 1; escalate if stalled

---

## PASS 1: VERIFICATION CHECK (00 minutes)

**Task:** Read CHECKPOINTS.md and verify actual repository state matches reported checkpoints.

### Step 1: Read Current Checkpoints
```bash
# Fetch CHECKPOINTS.md
# Count: How many checkpoints marked [x]?
# Current instruction set: 1, 2, 3, or 4?
```

### Step 2: Verify Instruction Set 1 State
If IS1 checkpoints claim complete:
- ✅ Does `node_modules/` exist? (size > 50MB)
- ✅ Does `.checkpoints/1_3_npm_install_log.txt` exist?
- ✅ Does `.checkpoints/1_4_build_log.txt` exist?
- ✅ Does `dist/` directory exist?
- If ANY fail: **REPORT DISCREPANCY** → "IS1 checkpoint mismatch: missing [X]"

### Step 3: Verify Instruction Set 2 State
If IS2 checkpoints claim complete:
- ✅ Does `.checkpoints/2_1_defect_inventory.md` exist?
- ✅ Does `.checkpoints/2_4_repairs_log.md` exist?
- ✅ Does `.checkpoints/2_5_final_build_log.txt` exist?
- ✅ Can current HEAD build successfully?
- If ANY fail: **REPORT DISCREPANCY** → "IS2 checkpoint mismatch: missing [X]"

### Step 4: Verify Instruction Set 3 State
If IS3 checkpoints claim complete:
- ✅ Does remote branch `repair/versail-deployment-*` exist?
- ✅ Does `.checkpoints/3_2_push_log.txt` exist?
- ✅ Is PR #1 open?
- ✅ Does PR #1 branch point to repair branch?
- If ANY fail: **REPORT DISCREPANCY** → "IS3 checkpoint mismatch: missing [X]"

### Step 5: Verify Instruction Set 4 State
If IS4 checkpoints claim complete:
- ✅ Does `.checkpoints/4_1_receipt_posted.txt` exist?
- ✅ Is handoff receipt visible in PR #1?
- ✅ Is NEXT_OWNER set to Reviewer?
- If ANY fail: **REPORT DISCREPANCY** → "IS4 checkpoint mismatch: missing [X]"

### Step 6: Post PASS 1 Result

**If all verified:** Post comment to PR #1
```
✅ PASS 1 VERIFICATION (HH:MM UTC)
Current state: Instruction Set [X] in progress
Checkpoints verified: [N]/20 complete
No discrepancies detected.
```

**If discrepancies found:** Post comment to PR #1
```
⚠️ PASS 1 VERIFICATION DISCREPANCY (HH:MM UTC)

Issue: [SPECIFIC DISCREPANCY]
Expected: [WHAT SHOULD EXIST]
Found: [WHAT EXISTS]

Action: Jewels, loop back to [CHECKPOINT X.Y] and verify.
```

---

## PASS 2: PROGRESS CHECK (30 minutes)

**Task:** Compare checkpoint state now vs. 60 minutes ago. Detect stalls and escalate.

### Step 1: Get Checkpoint History
```bash
# From Pass 1 (60 min ago): [N] checkpoints marked [x]
# From current CHECKPOINTS.md: [N+M] checkpoints marked [x]
# Progress: Did we move forward M checkpoints?
```

### Step 2: Detect Stall
- **No progress in 60 minutes?** → STALL DETECTED
- **Same checkpoint repeated?** → LOOP-BACK STALL
- **No commits in 60 minutes?** → WORK STALL

### Step 3: Escalate if Stalled

**If stalled on same checkpoint:**
```
⚠️ STALL ALERT: Checkpoint [X.Y] stuck for 60+ minutes

Last checkpoint state: [DATE/TIME]
Current state: [DATE/TIME]
No progress detected.

@digital-Alchemy-mcmg: Nudge required. 
Is Jewels blocked or waiting for input?
```

**If stalled with no commits:**
```
⚠️ STALL ALERT: No commits in 60 minutes

Expected: Work progress on IS[X]
Actual: No repository changes

@digital-Alchemy-mcmg: Check Jewels status.
May need operator intervention.
```

**If looping back repeatedly on same checkpoint:**
```
⚠️ LOOP-BACK STALL: Checkpoint [X.Y] failed 2+ times

Attempts: [N]
Last failure: [REASON from runner]
Status: Possible blocking issue

@digital-Alchemy-mcmg: Investigate checkpoint [X.Y].
May require manual repair or scope adjustment.
```

### Step 4: If Making Progress

**If progress is steady:**
```
✅ PASS 2 PROGRESS CHECK (HH:MM UTC)

Progress: [N] → [N+M] checkpoints (+M in 60 min)
Current: Instruction Set [X], Checkpoint [X.Y]
Rate: [M] checkpoints/hour
ETA to merge: ~[TIME] at current rate

On track. Continue.
```

**If progress is slow (< 1 checkpoint/hour):**
```
⚠️ PASS 2 PROGRESS WARNING (HH:MM UTC)

Progress: [N] → [N+1] checkpoint (+1 in 60 min)
Current: Instruction Set [X], Checkpoint [X.Y]
Rate: Slower than expected (1 checkpoint/hour)

Monitor. Nudge if stall continues.
```

---

## ESCALATION MATRIX

| Condition | Action | Owner |
|-----------|--------|-------|
| Discrepancy in verified checkpoint | Post discrepancy flag | Garage → Jewels loop-back |
| No progress for 60 min | Post stall warning | Garage → Operator nudge |
| Same checkpoint fails 3+ times | Post loop-back stall alert | Garage → Operator review |
| Build still passes | No action | Garage → Continue monitoring |
| All 20 checkpoints complete | Post completion notice | Garage → Reviewer handoff |

---

## GARAGE INSTRUCTIONS FOR GROK

### Configuration

```yaml
agent: garage
task: verify_and_nudge
repo: digital-Alchemy-mcmg/VDarchP
schedule: every 60 minutes
passes:
  - pass_1: verification (top of hour)
  - pass_2: progress (30 min after)
```

### Pass 1 Execution (Every Hour at :00)

1. Fetch `CHECKPOINTS.md` from repo
2. Count checkpoints marked `[x]`
3. Identify current instruction set
4. Run verification checks for that IS (see PASS 1 section above)
5. Post result comment to PR #1

### Pass 2 Execution (Every Hour at :30)

1. Fetch checkpoint count from last Pass 1 result (from PR comments)
2. Fetch current `CHECKPOINTS.md` checkpoint count
3. Calculate progress: current - previous
4. Determine stall status
5. Post progress comment to PR #1
6. If stalled: mention `@digital-Alchemy-mcmg` with escalation

### Stall Thresholds

- **STALL:** 0 checkpoints in 60 minutes
- **SLOW:** 1 checkpoint in 60 minutes (continue monitoring)
- **NORMAL:** 2+ checkpoints in 60 minutes (on track)
- **FAST:** 4+ checkpoints in 60 minutes (ahead of schedule)

### Loop-Back Detection

If `.checkpoints/` files are recreated or timestamps show repeated work on same checkpoint:
- Count attempts on checkpoint [X.Y]
- After 2 attempts: warn
- After 3 attempts: escalate to operator

### Operator Nudge Template

```
@digital-Alchemy-mcmg Operator nudge required:

Issue: [SPECIFIC STALL REASON]
Checkpoint: [X.Y]
Status: [BLOCKED/SLOW/NO_PROGRESS]

Possible actions:
1. Check if Jewels is waiting for input
2. Verify no external dependency blocking
3. Escalate to SXV8 if scope/acceptance criteria needs adjustment
4. Authorize manual intervention if required

Please respond or authorize continuation.
```

---

## GARAGE REPORTING INTERVAL

**Continuous 60-minute cycle:**
- :00 → PASS 1 verification
- :30 → PASS 2 progress & escalate
- :60 → PASS 1 verification (cycle repeats)

**Stop conditions:**
- All 20 checkpoints marked complete
- DONE_PR_OPEN terminal state reached
- Handoff to Reviewer confirmed

---

## SUCCESS METRIC

Garage runs continuously until one of these occurs:
1. ✅ All checkpoints complete → "DEPLOYMENT READY"
2. ⚠️ Stall detected → Escalate to operator
3. 🔄 Loop-back stall (3+ attempts) → Escalate to operator with blocker analysis

Garage does NOT stop the work; it verifies and nudges to keep momentum.

