---
name: writing-plans
description: Use when creating a technical implementation plan for multi-file features or refactors in CIP FITS before writing implementation code
---

# Writing Plans for CIP FITS

## Overview

Create comprehensive, bite-sized implementation plans for CIP FITS features, refactors, or bug fixes. Ensure that every plan evaluates architectural impact, Firestore models, security rules, UX, performance, and testing strategy.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

---

## Required Plan Document Template

Every plan in CIP FITS **MUST** follow this structure:

```markdown
# [Feature/Task Name] Implementation Plan

> **Goal:** [One sentence describing what this feature builds or fixes]
> **Tech Stack:** React 18, Vite, TypeScript, Cloud Firestore, React Query, Tailwind CSS, Radix UI

## Impact Analysis

### 1. Architecture Impact (`cip-fits-architecture`)
- [Files modified/created across pages, components, hooks, services]
- [Verification of canonical services (e.g. routines.ts)]

### 2. Firestore Data Model Impact (`cip-fits-firestore`)
- [Collections affected, deterministic ID strategy, `in` query limits, query waterfalls]

### 3. Security Rules Impact (`firestore.rules`)
- [Read/write permissions checked, role validations, hasOnly ownership checks]

### 4. Testing Strategy (`cip-fits-qa`)
- [Unit tests (Vitest), integration tests, E2E flows impacted]

### 5. UX & UI Impact (`cip-fits-ux`)
- [Trainer/Student domain impact, responsive design, skeleton states, toasts, drawers]

### 6. Migration Impact (`cip-fits-migration`)
- [Legacy data handling, dual-write requirement, cleanup conditions]

### 7. Rollback Strategy
- [How to safely revert changes if verification fails in production or staging]

---

## Proposed Changes

### [Component / Layer Name]

#### [MODIFY] [file_basename](file:///path/to/file)
#### [NEW] [file_basename](file:///path/to/file)
#### [DELETE] [file_basename](file:///path/to/file)

---

## Step-by-Step Task Decomposition

### Task 1: [Task Title]
- **Files**: `src/path/to/file.ts`
- [ ] **Step 1: Write failing test or define types**
- [ ] **Step 2: Implement minimal code**
- [ ] **Step 3: Run verification (`npm run test`)**

---

## Verification Plan

### Automated Verification
- `npm run lint`
- `npm run test`
- `npm run build`

### Manual / Browser Verification
- [List specific UI flows or agent-browser checks]
```

---

## Rules for Task Granularity

1. **No Placeholders**: Never write "TBD", "TODO", or "implement later". Include actual signatures, routes, or code snippets.
2. **Bite-Sized Tasks**: Each task should be independently verifiable and focused on a single layer or responsibility.
3. **Respect CIP FITS Architecture**: Ensure tasks follow the `pages` -> `components` -> `hooks` -> `services` -> Firestore flow.
