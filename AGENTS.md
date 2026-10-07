# AGENTS.md — VDarchP EXECUTION CONTRACT

## PURPOSE

This file governs agent execution in `digital-Alchemy-mcmg/VDarchP`.

Its purpose is to prevent completed work from stalling between agents because a task ended without a terminal state, next owner, or explicit handoff.

No agent may treat "I finished my part" as sufficient completion.

A task is complete only when its required terminal state is reached and its next owner is unambiguous.

## AUTHORITY ORDER

When instructions conflict, resolve authority in this order:

1. Current explicit Operator / task directive.
2. This `AGENTS.md`.
3. Repository source-of-truth documents and accepted specifications.
4. Current branch / PR state and committed evidence.
5. Agent assumptions.

Do not invent missing product semantics.

If authority remains ambiguous after applying this order, stop as `OPERATOR_REQUIRED`.

## REQUIRED STARTUP

At the beginning of every task:

1. Inspect the current repository branch and working tree.
2. Read this `AGENTS.md`.
3. Inspect any linked issue, PR, review comments, or task directive.
4. Identify:
   - `TASK_OBJECTIVE`
   - `CURRENT_OWNER`
   - `REQUIRED_TERMINAL_STATE`
   - `NEXT_OWNER`
   - `REQUIRED_CHECKS`
5. Confirm whether prior work already exists before duplicating it.

## EXECUTION LIFECYCLE

Every code task follows:

`INTAKE -> EXECUTE -> VERIFY -> PERSIST -> HANDOFF -> TERMINAL`

An agent must not stop between `PERSIST` and `HANDOFF`.

## VALID TERMINAL STATES

A task must end in exactly one of these states.

### DONE_MERGED

Use only when merge was explicitly authorized and the required branch/PR has been merged.

Required evidence:
- merge commit or merged PR;
- required checks passed;
- clean final repository state.

### DONE_PR_OPEN

Use when the task requires a pushed branch and an open PR, but merge is owned by another role.

Required evidence:
- branch pushed to remote;
- PR URL;
- HEAD commit SHA;
- required checks passed;
- `NEXT_OWNER` named.

### DONE_PUSHED

Use only when the directive requires a remote branch but explicitly does not require a PR.

Required evidence:
- remote branch name;
- pushed commit SHA;
- required checks passed;
- `NEXT_OWNER` named.

### DONE_COMMITTED_LOCAL

This is NOT a normal terminal state.

It is valid only when the task explicitly requires local-only work.

If used, the directive must also name who owns the unpushed commit next.

Without a named handoff owner, `DONE_COMMITTED_LOCAL` is invalid and the task remains incomplete.

### BLOCKED

Use when the task cannot continue mechanically.

Required receipt:
- exact blocker;
- evidence;
- action already attempted;
- authority consulted;
- smallest decision or prerequisite required;
- `NEXT_OWNER`.

### OPERATOR_REQUIRED

Use when continuing would require changing product semantics, scope, acceptance criteria, or another decision reserved to SXV8.

Do not invent the answer.

## DEFAULT CODE-CHANGE TERMINAL STATE

Unless the current directive explicitly says otherwise:

`CODE CHANGE -> VERIFY -> COMMIT -> PUSH -> OPEN OR UPDATE PR -> HANDOFF TO REVIEWER`

A local commit alone is never the default definition of done.

## HANDOFF OWNERSHIP

Every non-final stop must include:

`NEXT_OWNER:`

`NEXT_ACTION:`

`ARTIFACT:`

`COMMIT:`

`PR:`

`CHECKS:`

`BLOCKER:`

No blank `NEXT_OWNER` is allowed.

### Standard ownership transitions

Implementation / repair completed:

`WORKER -> REVIEWER`

Review finds defects:

`REVIEWER -> WORKER`

Review passes and merge is authorized:

`REVIEWER -> MERGER`

Review passes but merge authority was not granted:

`REVIEWER -> OPERATOR / designated merger`

Merge completed:

`MERGER -> POST-MERGE VERIFIER`

Post-merge verification passes:

`POST-MERGE VERIFIER -> TERMINAL`

If a named role does not exist in the current task, escalate to the task originator rather than leaving ownership undefined.

## WORKER CONTRACT

A Worker:

- performs only the authorized implementation or repair;
- does not silently expand scope;
- checks current code before duplicating prior work;
- runs required verification;
- commits actual changes;
- pushes when remote persistence is part of the required terminal state;
- opens or updates the PR when required;
- leaves a handoff receipt;
- does not self-certify independent review.

Worker completion checklist:

- [ ] Authorized scope only
- [ ] Existing work reconciled
- [ ] Relevant tests/checks run
- [ ] Build passes where applicable
- [ ] Changes committed
- [ ] Required branch pushed
- [ ] PR opened/updated if required
- [ ] Commit SHA recorded
- [ ] `NEXT_OWNER` named
- [ ] `NEXT_ACTION` stated
- [ ] No unresolved blocker hidden

## REVIEWER CONTRACT

A Reviewer independently checks the actual repository/PR state.

A Reviewer does not rely solely on Worker claims.

Reviewer completion checklist:

- [ ] Reviewed current HEAD
- [ ] Reviewed changed files
- [ ] Reproduced relevant tests/build
- [ ] Verified reported defects are actually resolved
- [ ] Checked for regressions within task scope
- [ ] Issued PASS or REPAIR
- [ ] Named `NEXT_OWNER`
- [ ] Named `NEXT_ACTION`
- [ ] Did not merge unless explicitly authorized

A review that finds defects must return ownership to a Worker.

A review that passes must route ownership to the authorized merger or Operator.

## MERGER CONTRACT

A Merger may merge only when:

- merge authority exists;
- required review passed;
- required checks passed;
- PR points to the verified commit;
- no known unresolved in-scope blocker remains.

After merge:

- [ ] Record merged PR
- [ ] Record merge commit
- [ ] Verify `main` contains expected result
- [ ] Route to post-merge verification if required

## POST-MERGE VERIFICATION

When required:

- [ ] Pull/read current `main`
- [ ] Verify merge commit
- [ ] Run required build/tests
- [ ] Confirm no branch-only dependency was omitted
- [ ] Record final terminal receipt

Only then declare `DONE_MERGED`.

## PER-TASK COMPLETION CHECKLISTS

### Bootstrap / extraction task

Done requires:
- [ ] source extracted/reconstituted
- [ ] project structure present
- [ ] dependencies install
- [ ] build succeeds
- [ ] generated artifacts/temporary source handled as directed
- [ ] changes committed
- [ ] branch pushed
- [ ] PR opened
- [ ] handoff to reviewer

### Defect-repair task

Done requires:
- [ ] each authorized defect mapped to a code change or explicit non-fix reason
- [ ] relevant tests/build pass
- [ ] repaired commit recorded
- [ ] repaired branch pushed
- [ ] existing PR updated or replacement PR opened
- [ ] reviewer becomes `NEXT_OWNER`

### Code-review task

Done requires:
- [ ] current commit reviewed
- [ ] findings tied to concrete files/lines
- [ ] PASS or REPAIR decision
- [ ] `NEXT_OWNER` set
- [ ] if REPAIR, Worker receives bounded defect list
- [ ] if PASS, merger/Operator receives explicit handoff

### Merge task

Done requires:
- [ ] verified PR/commit is the one being merged
- [ ] required checks pass
- [ ] merge authorized
- [ ] merge completed
- [ ] `main` verified
- [ ] final receipt written

## RECEIPT FORMAT

Every task-ending message must include:

`STATUS:`

`TASK:`

`ROLE:`

`BRANCH:`

`COMMIT:`

`PR:`

`CHECKS:`

`RESULT:`

`BLOCKER:`

`NEXT_OWNER:`

`NEXT_ACTION:`

If `STATUS` is not truly terminal, the receipt must not claim completion.

## NO-STALL INVARIANT

An agent is not permitted to end a task with:

> Committed and verified. Stopping.

unless the same receipt also states who owns the next action and what that action is.

No task may terminate into an ownerless state.

## VDarchP CURRENT RECOVERY RULE

For the currently open PR #1:

- Do not treat the existing local repaired state as a final completion state.
- The repaired six-defect branch must be persisted remotely before it can be reviewed as the repair result.
- The repaired commit must be pushed to a named branch.
- PR #1 must then be updated to that verified repair state or a replacement PR must be opened if branch topology requires it.
- A Reviewer then independently verifies the repaired HEAD.
- Merge occurs only after review passes and merge authority is explicit.
- The task is not terminal while repaired work exists only on a local branch.
