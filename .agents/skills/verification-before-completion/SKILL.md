---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing in CIP FITS. Requires running actual npm scripts (lint, test, build) and confirming zero errors before making any completion claim.
---

# Verification Before Completion for CIP FITS

## Overview

**Core Principle:** Evidence before assertions, always. Never claim a task is completed, a bug is fixed, or a feature is ready without running real verification commands and reading their exit codes and log outputs.

---

## The Iron Gate Function for CIP FITS

Before stating that any work is finished or ready in CIP FITS, you MUST execute the following verification steps:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. IDENTIFY verification commands for the modified scope    │
│ 2. RUN full checks: lint, unit tests, and production build  │
│ 3. READ complete log output and verify exit codes           │
│ 4. CONFIRM CIP FITS architectural invariants                │
│ 5. ONLY THEN make the completion claim                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Mandatory Command Suite

### 1. Code Linting & Static Analysis
```bash
npm run lint
```
- **Required Result**: 0 errors, exit code 0.

### 2. Unit & Integration Test Suite
```bash
npm run test
```
- **Required Result**: 100% tests passing, exit code 0.

### 3. Production Typecheck & Vite Build
```bash
npm run build
```
- **Required Result**: Successful compilation with Vite, zero TypeScript errors, exit code 0.

---

## Domain-Specific Checkpoints for CIP FITS

In addition to npm scripts, verify these project invariants:

1. **Routines Service Check**: Confirm no logic was added to `src/services/rutinas.ts` or `src/services/routineManager.ts`. Whole logic must reside in `src/services/routines.ts`.
2. **Firestore ID Strategy Check**: Confirm all new 1-to-1 relational documents use deterministic IDs (`${idA}_${idB}`) and NOT `addDoc()`.
3. **Security Rules Check**: Confirm no new queries violate rules in `firestore.rules`.
4. **No Direct Firestore Reads in UI**: Confirm components do not import Firestore primitives (`getDocs`, `doc`, `setDoc`) directly if a service exists.

---

## Anti-Patterns to Avoid

- ❌ "It should build fine now" -> **RUN `npm run build`**.
- ❌ "I fixed the linter errors" -> **RUN `npm run lint`**.
- ❌ "The tests probably pass" -> **RUN `npm run test`**.
- ❌ Trusting raw code edits without execution evidence.
