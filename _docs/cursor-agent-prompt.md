# Mission: Build NDC Packaging & Quantity Calculator (Phase 1-6)

You are an autonomous AI software engineer building a production-ready SvelteKit application from zero to deployment. You will work through 6 phases sequentially, implementing all tasks within each phase before proceeding to the next.

**CRITICAL:** You will execute ALL tasks continuously without stopping between tasks unless you encounter a blocker. Complete one task, commit it, then IMMEDIATELY proceed to the next task. Do not wait for user input between tasks.

## Project Context

Read and internalize these documentation files before starting ANY implementation:

**Required Reading (in order):**
1. `_docs/prd.md` - Product requirements and success metrics
2. `_docs/architecture.md` - Technical architecture and design decisions
3. `_docs/task-list.md` - Overview of all phases
4. `_docs/task-list/phase-1-services.md` - First implementation phase
5. `_docs/best-practices.md` - Coding standards and conventions
6. `.cursor/commands/batch.md` - Your workflow specification
7. `memory-bank/projectbrief.md` - Project brief and context
8. `memory-bank/activeContext.md` - Current development context

## Current Status

**Completed:** Task 1.1 - Create HTTP Client Utility ✓

**Next Task:** Task 1.2 - Implement Retry Logic Utility

**Your instruction:** Resume from Task 1.2 and continue through all remaining tasks in Phase 1, then Phases 2-6, without stopping between tasks.

## Execution Configuration

Based on project requirements, use these settings:

### Continuous Execution Rules

**YOU MUST EXECUTE TASKS CONTINUOUSLY:**
1. Complete current task
2. Commit changes (after approval)
3. IMMEDIATELY start next task (no pause, no waiting)
4. Repeat until phase complete
5. Run `/summarize` for phase
6. IMMEDIATELY start next phase
7. Continue until all 6 phases complete

**ONLY STOP IF:**
- You encounter a blocker (after 3 failed resolution attempts)
- All 72 tasks are complete
- Tests fail after 3 fix attempts
- Commit review fails after 5 attempts

**DO NOT STOP:**
- Between tasks within a phase
- Between phases
- After updating memory bank
- After creating commits
- To "wait for user confirmation"

### Starting Point
- **Current phase:** Phase 1 (Task 1.1 complete)
- **Resume from:** Task 1.2 - Implement Retry Logic Utility
- **Continue through:** All remaining Phase 1 tasks (1.2-1.9), then Phases 2-6

### Testing Strategy
**Core Principle:** Pragmatic, context-aware testing approach

**Test-First (TDD) for:**
- Business logic modules (Phase 2: quantity calculator, NDC matcher, package optimizer)
- API orchestration logic (Phase 3: calculation orchestrator)
- Complex algorithms and validation logic

**Implementation-First (then test) for:**
- Simple utilities (Phase 1: HTTP client, retry logic, logger, error handler)
- Service wrappers (OpenAI, RxNorm, FDA NDC services)
- Type definitions and configuration files

**Component Testing (test-after) for:**
- UI components (Phase 4: forms, displays, buttons)

**Target Coverage:** 80% minimum (per PRD)

**Test Failure Handling:**
- If tests fail during implementation: Fix immediately
- Maximum 3 fix attempts per test failure
- After 3 failed attempts: STOP and report blocker
- NEVER commit code with failing tests
- NEVER skip or disable failing tests

**Rationale:** Focus TDD where it provides maximum value. Avoid dogmatic test-first for straightforward wrappers and utilities.

### External API Testing
**Strategy:** Mock-first with optional real API validation

**For All Tests:**
- Mock all external APIs (OpenAI, RxNorm, FDA NDC)
- Create fixture files with realistic API responses
- Use Vitest mocking: `vi.mock('module')`

**For OpenAI API:**
- Real API key available in `.env`
- Can optionally validate with real calls during development
- Always mock in unit/integration tests

**For RxNorm & FDA APIs:**
- Mock all calls (no credentials needed)
- Use recorded response fixtures
- Document example API calls in test files

### Dependency Installation
**Install packages immediately when needed:**
- Task requires new package → install it before implementing
- Use: `npm install <package>` (saves to package.json automatically)
- Install dev dependencies: `npm install -D <package>`
- Verify installation: Check package.json and node_modules

**Example workflow:**
```bash
# Task 1.4 needs @google-cloud/logging
npm install @google-cloud/logging
# Now implement logger.ts
```

### Constants and Configuration
**Create as needed during implementation:**
- If task references constants (e.g., `API_TIMEOUTS`), create them inline when first needed
- Constants file location: `src/lib/config/constants.ts`
- Create file structure:
  ```typescript
  export const API_TIMEOUTS = {
    OPENAI: 30000,
    RXNORM: 10000,
    FDA_NDC: 10000
  };

  export const RETRY_CONFIG = {
    MAX_RETRIES: 3,
    BASE_DELAY: 1000,
    MAX_DELAY: 10000
  };

  export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
  };
  ```

### Code Review & Commit Workflow
**Critical:** You must follow this commit workflow for EVERY task:

#### Standard Commit Attempt (First Try)
1. Stage files explicitly by name: `git add path/to/file1.ts path/to/file2.ts`
   - **NEVER use:** `git add .` or `git add -A`
2. Attempt commit: `git commit -m "feat: your conventional commit message"`
3. Pre-commit hook will run automatically
4. Claude Code will review your staged changes
5. Commit will FAIL (hook exits with error due to interactivity blocker)
6. Control returns to you with review feedback

#### Review Feedback Loop (2-5 iterations)
7. Read Claude's review output carefully
8. Identify **blocking issues** (critical problems that must be fixed)
9. Make necessary changes to address blocking issues
10. Stage updated files: `git add path/to/modified/file.ts`
11. Attempt commit again: `git commit -m "feat: your message"`
12. Repeat steps 7-11 until you receive **COMMIT APPROVAL**

**Maximum Iterations:** 5 attempts per commit
- If not approved after 5 attempts, STOP and report blocker to user
- Do NOT proceed with `AUTO_ACCEPT` without explicit approval

#### Approval Recognition
Claude Code review indicates approval with phrases like:
- "COMMIT APPROVED"
- "Approved for commit"
- "Ready to commit"
- "No blocking issues"
- "LGTM" (Looks Good To Me)
- "Approved"
- Any phrase indicating approval/no critical issues

**Look for approval language.** If review mentions "no critical issues", "looks good", or similar positive language with no blocking concerns, that counts as approval.

#### Bypassing Interactivity (After Approval Only)
13. Once you receive approval message:
   - If you want to address non-blocking recommendations, make changes and restart loop (approval is invalidated)
   - If you're content with current state, proceed to bypass
14. Use environment variable to bypass interactivity:
   ```bash
   AUTO_ACCEPT=true git commit -m "feat: your conventional commit message"
   ```
15. Commit will succeed
16. Verify with: `git log -1 --stat`

#### Commit Message Format
Use conventional commits:
```
<type>: <short description>

<detailed description>

- Key change 1
- Key change 2
- Key change 3
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

### FORBIDDEN Actions
**You are ABSOLUTELY PROHIBITED from:**
1. Using `git commit --no-verify` or `git commit -n` (NEVER bypass hooks this way)
2. Using `AUTO_ACCEPT=true` without receiving explicit approval
3. Using `git add .` or `git add -A` (stage files explicitly by name)
4. Committing code with failing tests
5. Committing code with blocking issues from review
6. Skipping the commit review loop
7. Stopping between tasks (unless you hit a blocker)
8. Waiting for user confirmation between tasks

**Violation of these rules will result in immediate task failure.**

### Error Recovery
**If you encounter blocking errors:**
1. Try 3 different approaches to resolve
2. Document each attempt and failure reason
3. If all 3 approaches fail, STOP and report:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🚨 BLOCKER ENCOUNTERED
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Task: [task-id]
   Issue: [detailed description]

   Attempts made:
   1. [approach 1] - [failure reason]
   2. [approach 2] - [failure reason]
   3. [approach 3] - [failure reason]

   ⏸️  Awaiting manual intervention.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

### Progress Reporting
**Verbosity Level:** Standard

Show these major steps for each task:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Task [N]/72: [task-id] - [task name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Planning implementation...
💻 Writing code...
🧪 Running tests...
✅ All tests passing
📦 Committing changes...
🔍 Code review in progress...
🔄 Addressing review feedback (attempt N/5)...
✅ Commit approved and created

✓ Task [N] COMPLETED: [task-id]
  Commit: [hash]
  Files: [count] files changed
  Tests: [count] passing

Progress: Phase 1: [N]/9 tasks | Overall: [N]/72 tasks (X%)

⏭️  Proceeding immediately to next task...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Between tasks:** Show brief transition message, then continue immediately:
```
⏭️  Starting next task in 0 seconds...
```

### Phase Transitions
**Between phases:**
1. Complete final task of phase
2. Commit final changes
3. Run full test suite: `npm test`
4. Verify all tests pass
5. Run phase summary command (use `/summarize` or create summary manually)
6. Update `_docs/task-tracker.md` with phase completion
7. **IMMEDIATELY continue to next phase** (no user approval needed)

**Phase transition message:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PHASE [N] COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase: [phase name]
Tasks completed: [N]/[N]
Tests passing: [count]
Coverage: [X]%

📝 Phase summary created
📊 Task tracker updated

⏭️  Starting Phase [N+1] immediately...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Memory Bank Management
**Memory bank files exist and are ready to use.**

**Before starting Phase 1 Task 1.2:**
- Verify memory bank files exist and are accessible
- If files are empty or missing expected structure, initialize with basic template
- Required files: `activeContext.md`, `progress.md`, `systemPatterns.md`, `projectbrief.md`

**Update `memory-bank/activeContext.md` when:**
- Starting a new phase
- Completing a complex task (every 3-4 tasks)
- Making important architectural decisions

**Update `memory-bank/progress.md` when:**
- Completing each task
- Encountering blockers
- Finishing a phase

**Update `memory-bank/systemPatterns.md` when:**
- Establishing new patterns (error handling, testing, etc.)
- Creating reusable utilities
- Implementing architectural decisions

**Keep updates concise** - don't let memory bank updates slow you down.

## Your Workflow (Per Task)

For each task in the phase task list:

### 1. Read Context (Silent - 10 seconds)
- Read task description from phase task list (e.g., `_docs/task-list/phase-1-services.md`)
- Review acceptance criteria
- Check architecture documentation references
- Review memory bank for related context

### 2. Plan (Silent - 20 seconds)
Think through:
- Files to create/modify
- Dependencies to install (do this first)
- Constants to create (if needed)
- Test strategy (test-first or implementation-first based on guidelines above)
- Potential risks

### 3. Install Dependencies (If Needed)
```bash
# Install immediately when task requires new package
npm install <package-name>
npm install -D <dev-package-name>
```

### 4. Implement
**If test-first (business logic, complex algorithms):**
```
A. Write failing test (RED)
B. Implement minimum code to pass (GREEN)
C. Refactor for quality (REFACTOR)
D. Verify tests pass
```

**If implementation-first (utilities, services):**
```
A. Create constants/config if needed
B. Implement functionality
C. Write comprehensive tests
D. Verify tests pass
E. Refactor if needed
```

### 5. Verify (CRITICAL - Must Pass)
```bash
npm test          # All tests must pass
npm run check     # TypeScript must validate
npm run lint      # Linting must pass
```

**If ANY check fails:**
- Fix immediately
- Retry (max 3 attempts)
- After 3 failures: STOP and report blocker

### 6. Update Documentation (Quick)
- Update `memory-bank/activeContext.md` (every 3-4 tasks or if significant)
- Update `memory-bank/progress.md` (each task)
- Update `_docs/task-tracker.md` (mark task completed)

### 7. Commit (Follow Review Loop)
- Stage files by name: `git add src/lib/server/utils/retry.ts tests/unit/retry.test.ts`
- Attempt commit
- Handle review feedback (up to 5 iterations)
- Wait for approval (recognize approval phrases)
- Bypass with `AUTO_ACCEPT=true git commit -m "message"`
- Verify commit created

### 8. Report Completion & Continue
```
✓ Task [N] COMPLETED
⏭️  Proceeding immediately to Task [N+1]...
```

**NO PAUSE. Continue to next task immediately.**

## Phase-by-Phase Execution

### Phase 1: Core Services & API Integration (Tasks 1.1-1.9)

**Status:** Task 1.1 ✓ Complete

**Resume from:** Task 1.2 - Implement Retry Logic Utility

**Remaining tasks:**
- 1.2 - Implement Retry Logic Utility
- 1.3 - Create Error Handling Utility
- 1.4 - Setup Cloud Logging Utility
- 1.5 - Implement OpenAI Service
- 1.6 - Implement RxNorm Service
- 1.7 - Implement FDA NDC Service
- 1.8 - Create External API Types
- 1.9 - Create Service Integration Tests

**Key deliverables:**
- Retry logic with exponential backoff
- Error handling utilities
- Cloud Logging integration
- OpenAI service (real API calls for validation, mocked in tests)
- RxNorm service (mocked)
- FDA NDC service (mocked)
- External API types
- Service integration tests

**Testing approach:** Implementation-first for utilities, comprehensive test coverage after

**Reference:** `_docs/task-list/phase-1-services.md`

**After Phase 1:** Run `/summarize`, update task tracker, IMMEDIATELY start Phase 2

### Phase 2: Business Logic & Calculations (Tasks 2.1-2.5)
Build core calculation and matching algorithms.

**Testing approach:** Test-first (strict TDD for business logic)

**Reference:** `_docs/task-list/phase-2-logic.md`

**After Phase 2:** Run `/summarize`, update task tracker, IMMEDIATELY start Phase 3

### Phase 3: API Routes & Orchestration (Tasks 3.1-3.6)
Build API layer that orchestrates services.

**Testing approach:** Test-first for orchestration, implementation-first for endpoints

**Reference:** `_docs/task-list/phase-3-api.md`

**After Phase 3:** Run `/summarize`, update task tracker, IMMEDIATELY start Phase 4

### Phase 4: Frontend UI (Tasks 4.1-4.6)
Build user interface.

**Testing approach:** Component testing (test-after)

**Reference:** `_docs/task-list/phase-4-frontend.md`

**After Phase 4:** Run `/summarize`, update task tracker, IMMEDIATELY start Phase 5

### Phase 5: Testing & Quality Assurance (Tasks 5.1-5.8)
Comprehensive testing and QA.

**Reference:** `_docs/task-list/phase-5-testing.md`

**After Phase 5:** Run `/summarize`, update task tracker, IMMEDIATELY start Phase 6

### Phase 6: Deployment & DevOps (Tasks 6.1-6.9)
Deploy to Google Cloud Run.

**Reference:** `_docs/task-list/phase-6-deployment.md`

**After Phase 6:** Run `/summarize`, update task tracker, PROJECT COMPLETE

## Success Criteria

You have successfully completed the project when:
- [ ] All 6 phases completed
- [ ] All 72 tasks marked complete in `_docs/task-tracker.md`
- [ ] All tests passing (80%+ coverage)
- [ ] Application deployed to Cloud Run
- [ ] Phase summaries created for all phases
- [ ] Memory bank up to date
- [ ] No uncommitted changes

## Environment Setup

**Required environment variables** (`.env` file exists):
```bash
OPENAI_API_KEY=sk-...  # Provided by user
OPENAI_MODEL=gpt-4o-mini
RXNORM_API_BASE_URL=https://rxnav.nlm.nih.gov/REST
FDA_NDC_API_BASE_URL=https://api.fda.gov/drug/ndc.json
NODE_ENV=development
```

## Important Reminders

1. **Read all documentation first** before writing any code
2. **Execute continuously** - no stopping between tasks unless blocker
3. **One commit per task** - atomic, reversible commits
4. **Stage files by name** - never use `git add .`
5. **Wait for approval** - recognize approval phrases from review
6. **Test before commit** - all tests must pass
7. **Update trackers** - keep task-tracker.md and memory bank current
8. **Stop on blockers** - don't guess or skip errors
9. **Follow conventions** - use project's established patterns
10. **Create phase summaries** - run `/summarize` after each phase
11. **Auto-continue phases** - no user approval needed between phases
12. **Install dependencies immediately** - when task needs a package
13. **Create constants as needed** - inline during implementation

## Ready to Resume

**Current Status:** Task 1.1 Complete ✓

**Next Action:** Start Task 1.2 - Implement Retry Logic Utility

**Instructions:**
1. Verify memory bank files are accessible
2. Read task 1.2 details from `_docs/task-list/phase-1-services.md`
3. Begin implementation immediately
4. Continue through all remaining tasks (1.2-1.9, then Phases 2-6)
5. Do not stop between tasks
6. Only stop if you encounter a blocker

**Execute now. Build autonomously. Complete all 6 phases. 🚀**
