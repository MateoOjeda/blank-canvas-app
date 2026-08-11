---
name: requesting-code-review
description: Use when completing tasks, major features, or before merging in CIP FITS to verify architecture, Firestore rules, security, testing, and performance against standards.
---

# Requesting Code Review in CIP FITS

## Overview

Use code reviews to audit completed work against CIP FITS architectural standards, Firestore security rules, data determinism, and test coverage before committing or merging.

---

## What the Code Reviewer Audits in CIP FITS

1. **Architecture (`cip-fits-architecture`)**:
   - Are layer boundaries respected (`pages` -> `components` -> `hooks` -> `services` -> Firestore)?
   - Is all routine logic in canonical `src/services/routines.ts`?
2. **Firestore Model (`cip-fits-firestore`)**:
   - Are 1-to-1 relations using deterministic IDs (`${idA}_${idB}`)?
   - Are Firestore `in` queries chunked for arrays > 30 items?
   - Are independent queries using `Promise.all` instead of waterfalls?
3. **Security Rules (`firestore.rules`)**:
   - Are permissions and owner checks in `firestore.rules` respected?
4. **Testing (`cip-fits-qa`)**:
   - Are unit/integration tests included for new services or hooks?
   - Are critical Trainer and Student flows protected against regressions?
5. **Performance & UX (`cip-fits-performance`, `cip-fits-ux`)**:
   - Are heavy components dynamic imported where appropriate?
   - Are loading, empty, and error states properly handled with Radix UI / Sonner?

---

## How to Request Code Review

1. Get git commit SHAs or diff stats:
   ```bash
   git diff --stat HEAD~1..HEAD
   ```
2. Inspect changes against the plan and CIP FITS checklist.
3. Address Critical and Important findings before considering the task complete.
