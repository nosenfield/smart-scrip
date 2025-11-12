# Active Context: smart-scrip

**Last Updated**: 2025-11-12

## Current Focus

### What We're Working On Right Now
Phase 3 COMPLETE! All 6 tasks finished. Ready to begin Phase 4: Frontend UI.

### Current Phase
**Phase 0: Project Setup & Foundation** - ✅ COMPLETE (12/12 tasks)
**Phase 1: Core Services & API Integration** - ✅ COMPLETE (9/9 tasks)
**Phase 2: Business Logic & Calculations** - ✅ COMPLETE (5/5 tasks)
**Phase 3: API Routes & Orchestration** - ✅ COMPLETE (6/6 tasks)
**Phase 4: Frontend UI** - READY TO START (0/6 tasks)

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

---

## Recent Changes

### Last 3 Significant Changes
1. Phase 3 COMPLETE - All API routes and orchestration implemented (orchestrator, endpoint, tests, rate limiting, caching, docs) - 2025-11-12
2. API calculate endpoint created with rate limiting and caching headers - 9 unit tests, 8 integration tests - 2025-11-12
3. Calculation orchestrator implemented - Coordinates all services and business logic, 10 unit tests - 2025-11-12

---

## Next Steps

### Immediate (Next Session)
- [ ] Begin Phase 4 Task 4.1: Create Base UI Components
- [ ] Begin Phase 4 Task 4.2: Create Prescription Form Component

### Near-Term (This Week)
- [ ] Complete Phase 4: Frontend UI development

---

## Blockers / Open Questions

### Current Blockers
None - Phase 0 complete and ready to proceed.

### Questions to Resolve
1. Should we implement request caching in HTTP client utility from the start? (Deferred - not needed for MVP)
2. What retry strategy for external APIs? (RESOLVED: Exponential backoff with configurable delays, 2 retries default)
3. How detailed should error logging be for external API failures? (RESOLVED: Structured logging with metadata sanitization, silent failures in production)

---

## Key Files Currently Modified

Phase 3 complete - All API routes and orchestration (3.1-3.6) implemented and tested.

**Recent commits:**
- `99015ef` - docs: create API documentation (Task 3.6)
- `c4a497a` - feat: add API response caching headers (Task 3.5)
- `5df2b5b` - feat: add request rate limiting (Task 3.4)
- `163a07f` - feat: create API integration tests (Task 3.3)
- `93b8919` - feat: create API calculate endpoint (Task 3.2)
- `fd0440d` - feat: create calculation orchestrator (Task 3.1)
