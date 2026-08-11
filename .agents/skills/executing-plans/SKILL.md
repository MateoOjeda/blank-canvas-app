---
name: executing-plans
description: Use when you have a written implementation plan to execute step-by-step with review checkpoints in CIP FITS
---

# Executing Implementation Plans in CIP FITS

## Overview

This skill guides the step-by-step execution of a approved implementation plan in the CIP FITS project.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

---

## Execution Process

### Step 1: Load and Review Plan
1. Open and read the target implementation plan.
2. Review critically — verify that all tasks adhere to CIP FITS architecture (`cip-fits-architecture`), Firestore determinism (`cip-fits-firestore`), and security rules (`firestore.rules`).
3. If there are ambiguities or unaddressed risks, raise them before touching any code.
4. Create task checklists and proceed sequentially.

### Step 2: Execute Tasks Step-by-Step
For each task in the plan:
1. Mark the task as in-progress.
2. Follow each bite-sized step precisely.
3. Write/update tests matching `cip-fits-qa` standards.
4. Run incremental verification (lint, unit tests) after each task.
5. Mark task as completed once verified.

### Step 3: Verify and Complete Task
After all tasks in the plan are completed:
1. Run full project verification:
   - `npm run lint`
   - `npm run test`
   - `npm run build`
2. Check overall regression and verify critical user flows.
3. Present execution summary and request code review using `requesting-code-review`.

---

## Stop Criteria & Help Checkpoints

**STOP executing immediately when:**
- Encountering an unexpected build error or test failure that breaks existing functionality.
- Discovering an unhandled Firestore security rule conflict or schema incompatibility.
- A requirement in the plan is underspecified or contradictory.
- Verification commands fail.

**Always resolve blockers or ask for clarification before proceeding.**
