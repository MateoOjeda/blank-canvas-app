---
name: second-brain
description: Persistent memory protocol connecting AntiGravity to Obsidian. Use when searching Obsidian notes, checking CIP FITS knowledge, retrieving architectural decisions (ADRs), finding previous solutions or known bugs, loading project context, consulting the Second Brain, or persisting durable engineering knowledge and lessons learned across projects.
---

# Second Brain Architecture & AntiGravity Memory Protocol

This skill connects AntiGravity to Obsidian as its persistent, long-term knowledge layer across all projects.

## Core Architectural Triad

```
Obsidian Vault  =  WHAT + WHY   (Durable knowledge, architecture decisions, patterns, lessons learned)
.agents Skills  =  HOW          (Agent capabilities, specialized engineering rules, execution workflows)
Workspace Repo  =  CODE         (Active source code, tests, configuration, current source of truth)
```

### Precedence & Relationship with CIP FITS Skills

- **`second-brain`**: Provides historical project context, past decisions, and reusable solutions.
- **CIP FITS Skills** (`cip-fits-engineering`, `cip-fits-architecture`, `cip-fits-firestore`, `cip-fits-data-integrity`, `cip-fits-qa`, `cip-fits-performance`, `cip-fits-ux`, `cip-fits-migration`): Provide domain-specific engineering enforcement and technical execution rules.
- **Workspace Repository**: Remains the definitive current source of truth.

---

## 1. Standard Note Metadata Schema

All newly created or materially updated durable notes in Obsidian MUST include this canonical YAML frontmatter header:

```yaml
---
project: <project-name-or-global>
type: <knowledge-type>
tags: [<tags>]
updated: YYYY-MM-DD
---
```

### Supported `type` Values:
- `knowledge`: General domain knowledge and foundational concepts.
- `architecture`: System design specs, diagrams, and component boundaries.
- `pattern`: Reusable engineering patterns, standards, and conventions.
- `solution`: Tested bugfixes, code snippets, and verified problem resolutions.
- `problem`: Documented open bugs, technical debt, and unresolved challenges.
- `decision`: Architectural Decision Records (ADRs) detailing rationale and impact.
- `lesson`: Post-mortems, retrospective findings, and anti-patterns.
- `research`: Technical investigations, deep-dives, and technology benchmarks.
- `idea`: Proposals, future feature concepts, and roadmap items.

---

## 2. Two-Step Search Protocol (Context Protection)

To prevent context window bloat and unnecessary token consumption, agents MUST follow this 4-step search sequence:

### STEP 1 — DISCOVER
Use search tools to find candidate note titles, paths, and metadata:
- `search_simple`: Search vault files using simple keyword queries.
- `search_query`: Search metadata and frontmatter using JsonLogic.
- `vault_list`: Inspect directory paths (e.g. `02 - Projects/CIP FITS/`).

> **RULE**: Do **NOT** immediately execute `vault_read` on all search results.

### STEP 2 — SELECT
Evaluate the list of discovered note paths/titles.
Select **only** the most relevant notes to fetch.
- **Default Maximum**: **2 full note payloads** per search operation.
- **Exception**: Exceed 2 notes only when the user's task explicitly requires broader multi-note context.

### STEP 3 — READ
Execute `vault_read` **only** on the selected target notes.

### STEP 4 — SYNTHESIZE & VALIDATE
Combine retrieved historical context with active codebase state.
- Treat historical notes as past context, not absolute truth.
- Validate old decisions against the current repository before applying them.

---

## 3. Memory Search Rules (WHEN to Search)

Search Obsidian **before**:
- Making architectural decisions or changing design patterns.
- Starting complex feature implementations or multi-file refactors.
- Debugging non-trivial problems, recurring failures, or complex errors.
- Researching technologies or evaluating libraries.
- Modifying critical core systems (e.g., auth, database schemas, rules).
- Designing user workflows or major UI component structures.

### Search Hierarchy Order:
1. Current Project Knowledge: `02 - Projects/<Project Name>/`
2. Global Solutions: `06 - Solutions/`
3. Global Patterns: `04 - Patterns/`
4. Architectural Decisions: `07 - Decisions/`
5. Lessons Learned: `08 - Lessons Learned/`
6. Research & Benchmarks: `09 - Research/`

> **Exception**: Do **NOT** search Obsidian for trivial single-file edits, simple syntax fixes, or routine formatting adjustments.

---

## 4. Memory Persistence Rules (WHEN & HOW to Write)

### Clear Separation: READ vs. WRITE
- **Search freely** whenever prior context will improve quality.
- **Write to Obsidian ONLY** when genuine, durable, reusable knowledge has been created.

### Durable Knowledge Examples (PERSIST THESE):
- Architectural decisions (ADRs) with rationale and trade-offs.
- Proven, non-obvious solutions to complex bugs or performance bottlenecks.
- Reusable engineering patterns and standardized component structures.
- Major lessons learned, anti-patterns discovered, or security findings.
- Key research conclusions and technology evaluation results.

### Anti-Noise Safety Rules (DO NOT PERSIST):
- ❌ Temporary conversation state or chat transcripts.
- ❌ Raw terminal output dumps or command execution logs.
- ❌ Trivial single-line code fixes or formatting changes.
- ❌ Routine implementation details specific to a throwaway edit.
- ❌ Generated noise or duplicate knowledge already present in the vault.

### Pre-Write Workflow:
1. **Search First**: Check if a related note exists using `search_simple`.
2. **Decide Action**: Update/patch an existing note (`vault_patch` / `vault_append`) instead of creating duplicate files.
3. **Apply Schema**: Include canonical YAML frontmatter.
4. **Interlink**: Connect related notes using `[[WikiLinks]]`.
