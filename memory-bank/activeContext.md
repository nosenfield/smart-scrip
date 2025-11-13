# Active Context: smart-scrip

**Last Updated**: 2025-11-12 (Phase 5 In Progress)

## Current Focus

### What We're Working On Right Now
Phase 5: Testing & Quality Assurance in progress. Task 5.5 (ESLint migration) complete. GCP infrastructure setup complete for Phase 6 deployment.

### Current Phase
**Phase 0: Project Setup & Foundation** - ✅ COMPLETE (12/12 tasks)
**Phase 1: Core Services & API Integration** - ✅ COMPLETE (9/9 tasks)
**Phase 2: Business Logic & Calculations** - ✅ COMPLETE (5/5 tasks)
**Phase 3: API Routes & Orchestration** - ✅ COMPLETE (6/6 tasks)
**Phase 4: Frontend UI** - ✅ COMPLETE (6/6 tasks)
**Phase 5: Testing & Quality Assurance** - IN PROGRESS (1/8 tasks - 12.5%)

### Active Decisions
- **Use $env/static/private for environment variables**: Safer than dynamic imports, prevents client-side exposure
- **Keep adapter-auto for development**: Defer adapter-node migration to Phase 6 for production deployment
- **Document known issues in task-tracker.md**: Centralized tracking instead of separate files
- **Lazy initialization for OpenAI client**: API key validation happens at first use, not module load time, for better testability
- **Silent failure for Cloud Logging errors in production**: Prevents log noise while maintaining development debugging
- **Factory pattern for logger initialization**: Makes environment detection testable, avoids module-level evaluation issues
- **Greedy algorithm for package optimization**: Minimizes package count, not waste. Simpler for MVP, documented trade-off for future enhancement
- **Overfill tracked at result level**: Total waste is more meaningful than per-package distribution. Simpler API, clearer semantics
- **Scoring algorithm: waste × 100 + packageCount**: Ensures waste dominates while package count serves as tiebreaker
- **Rate limiting for MVP only**: In-memory rate limiting acceptable for single-instance MVP. Redis/Memorystore REQUIRED for production multi-instance deployment
- **AI-selected NDCs override deterministic matches**: When AI selection succeeds, use AI-selected NDCs instead of deterministic matches for better optimization
- **Rate limiting before request parsing**: Fail-fast principle - check rate limits before parsing JSON to prevent DoS via malformed requests
- **X-Forwarded-For header handling**: Use X-Forwarded-For for client IP in production, with validation and fallback to getClientAddress()
- **ESLint v9 flat config format**: Migrated from legacy .eslintrc.cjs to modern flat config format for long-term compatibility
- **Unused variable pattern**: Use `_` prefix for intentionally unused variables (cleaner than eslint-disable comments)
- **Defer Playwright E2E for MVP**: Manual testing sufficient for MVP, E2E automation deferred to post-MVP

---

## Recent Changes

### Last 3 Significant Changes
1. ESLint v9 migration complete (Task 5.5) - Migrated to flat config format, fixed all linting errors (18 → 0), added ESLint dependencies - 2025-11-12
2. GCP infrastructure setup complete - Project `smart-scrip-dev` created, all APIs enabled, Secret Manager configured with IAM permissions - 2025-11-12
3. Phase 4 COMPLETE - All frontend UI components and pages implemented (base components, form, results display, main page, global styles, store) - 2025-11-12

---

## Next Steps

### Immediate (Next Session)
- [ ] Continue Phase 5: Testing & Quality Assurance
  - Task 5.1: Complete Unit Test Coverage (9 OpenAI tests failing - known issue)
  - Task 5.3: Create Test Data Fixtures
  - Task 5.4: Implement API Mocking for Tests
  - Task 5.6: Performance Testing
  - Task 5.7: Accessibility Testing
  - Task 5.8: Create Test Documentation

### Near-Term (This Week)
- [ ] Complete Phase 5: Testing & Quality Assurance
- [ ] Begin Phase 6: Deployment (GCP setup ready, adapter configuration next)

---

## Blockers / Open Questions

### Current Blockers
- **Task 5.2 - E2E Test Suite**: Blocked by code review concerns. Decision: Defer to post-MVP, use manual testing for MVP.
- **Task 5.1 - OpenAI Unit Tests**: 9 tests failing due to mock setup issues with singleton pattern. Known issue, non-blocking (integration tests pass).

### Questions to Resolve
1. Should we implement request caching in HTTP client utility from the start? (Deferred - not needed for MVP)
2. What retry strategy for external APIs? (RESOLVED: Exponential backoff with configurable delays, 2 retries default)
3. How detailed should error logging be for external API failures? (RESOLVED: Structured logging with metadata sanitization, silent failures in production)
4. When to address OpenAI unit test mock issues? (Deferred - low priority, integration tests provide coverage)

---

## Key Files Currently Modified

Phase 5 in progress - ESLint migration complete, testing tasks ongoing.

**Recent commits:**
- `363e3f3` - fix: migrate ESLint to v9 flat config format (Task 5.5)
- `175e76f` - notes Playwright blocker
- `17ad831` - docs: document Playwright E2E test suite blocker
- `24197d6` - test: add reset function for OpenAI service singleton
- `ff7dd02` - feat: create client-side store (Task 4.6)
