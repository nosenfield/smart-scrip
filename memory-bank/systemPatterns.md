# System Patterns: smart-scrip

**Last Updated**: 2025-11-11

## Architecture Overview

### System Design
SvelteKit full-stack application with service layer architecture. Server-side services handle external API integrations and business logic. Frontend provides UI for prescription input and results display.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   API Layer  │────▶│  Services   │
│  (SvelteKit)│     │  (Routes)    │     │  (External  │
└─────────────┘     └──────────────┘     │   APIs)     │
                                         └─────────────┘
```

### Module Structure
```
src/
├── lib/
│   ├── components/     # UI components (Phase 4)
│   ├── server/
│   │   ├── services/   # External API services
│   │   └── utils/      # Utility functions
│   ├── config/         # Configuration constants
│   └── types/           # Type definitions
├── routes/
│   └── api/            # API endpoints
└── tests/
    ├── unit/           # Unit tests
    └── integration/    # Integration tests
```

---

## Design Patterns

### Pattern 1: Custom Error Classes with Centralized Handling
**When to use**: All server-side error handling
**Location**: `src/lib/server/utils/error-handler.ts`

**Pattern**:
- Custom error classes extend `AppError` base class
- Error types: `ValidationError`, `ExternalAPIError`, `BusinessLogicError`
- Centralized `handleAPIError()` function converts errors to API responses
- Errors include: code, message, statusCode, retryable flag

**Example**:
```typescript
// Throw custom error
throw new ValidationError('SIG text is required');

// Handle in API route
try {
  const result = await parseSIG(sigText);
  return json({ success: true, data: result });
} catch (error) {
  return json(handleAPIError(error), { status: 500 });
}
```

### Pattern 2: Factory Pattern for Testable Services
**When to use**: Services that need environment-based behavior (logging, initialization)
**Location**: `src/lib/server/utils/logger.ts`

**Pattern**:
- Use `initializeLogger(config)` factory function instead of module-level evaluation
- Config allows overriding `isProduction` for testing
- State stored in module-level variable but initialized via factory
- Enables proper testing of both dev and prod paths

**Example**:
```typescript
// In tests
await initializeLogger({ isProduction: true });
logger.info('Test'); // Uses Cloud Logging

// In production
await initializeLogger(); // Uses NODE_ENV
```

### Pattern 3: Lazy Initialization for External Clients
**When to use**: External API clients that need validation but shouldn't fail at module load
**Location**: `src/lib/server/services/openai.service.ts`

**Pattern**:
- Client instance stored in module-level variable
- `getOpenAIClient()` function performs lazy initialization
- Validation happens at first use, not module load time
- Enables testing without environment variables set at import time

**Example**:
```typescript
let openaiInstance: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not set');
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}
```

### Pattern 4: Service Layer with Retry and Error Handling
**When to use**: All external API service implementations
**Location**: `src/lib/server/services/openai.service.ts`

**Pattern**:
- Services use `retryWithBackoff()` for resilience
- Input validation with `ValidationError` for invalid inputs
- Schema validation for AI responses with type guards
- Input sanitization to prevent injection attacks
- Structured logging with metadata
- Token usage logging for cost monitoring

**Example**:
```typescript
export async function parseSIG(sigText: string): Promise<ParsedSIG> {
  // Validate input
  if (!sigText || typeof sigText !== 'string') {
    throw new ValidationError('SIG text is required');
  }
  
  // Sanitize input
  const sanitized = sigText.trim().replace(/[<>]/g, '');
  
  // Retry with backoff
  const result = await retryWithBackoff(
    async () => {
      const completion = await getOpenAIClient().chat.completions.create({...});
      const parsed = JSON.parse(completion.choices[0].message.content);
      
      // Schema validation
      if (!isValidParsedSIG(parsed)) {
        throw new Error('Invalid response schema');
      }
      return parsed;
    },
    { maxRetries: 2 }
  );
  
  return result;
}
```

---

## Key Invariants

### Invariant 1: Error Handling Consistency
All API routes must use `handleAPIError()` to convert errors to consistent API responses. Never return raw errors or throw unhandled exceptions.

### Invariant 2: Input Validation
All user inputs must be validated before processing. Use `ValidationError` for invalid inputs. Sanitize inputs to prevent injection attacks.

### Invariant 3: External API Resilience
All external API calls must use `retryWithBackoff()` with appropriate retry configuration. Handle failures gracefully with `ExternalAPIError`.

### Invariant 4: Logging Consistency
All server-side logging must use the `logger` utility. Never use `console.log`/`console.error` directly in production code (except in logger itself).

---

## Data Flow

### Request/Response Cycle
1. User submits prescription data via frontend form
2. Frontend sends POST request to `/api/calculate`
3. API route validates input and calls calculation orchestrator
4. Orchestrator coordinates services:
   - OpenAI service parses SIG
   - RxNorm service normalizes drug name
   - FDA NDC service retrieves package data
   - Business logic calculates optimal NDC selection
5. Results returned as JSON response
6. Frontend displays results with warnings/errors

### State Management
- **Server**: Stateless - no session storage, all data in request/response
- **Client**: Svelte stores for UI state (form data, results, loading states)
- **No database**: MVP is stateless, processes requests independently

---

## Integration Points

### OpenAI API
- **Purpose**: Parse prescription SIG text and select optimal NDC packages
- **How we use it**: GPT-4o-mini model with JSON response format, structured prompts
- **Failure handling**: Retry with exponential backoff (2 retries), throws `ExternalAPIError` on failure
- **Timeout**: 30 seconds
- **Cost monitoring**: Token usage logged for each request

### RxNorm API (NIH/NLM)
- **Purpose**: Normalize drug names to RxCUI (standardized drug identifiers)
- **How we use it**: REST API calls to rxnav.nlm.nih.gov
- **Failure handling**: Retry with exponential backoff, throws `ExternalAPIError` on failure
- **Timeout**: 10 seconds
- **Status**: Not yet implemented (Task 1.6)

### FDA NDC Directory API
- **Purpose**: Retrieve NDC package information (package size, status, manufacturer)
- **How we use it**: REST API calls to api.fda.gov
- **Failure handling**: Retry with exponential backoff, throws `ExternalAPIError` on failure
- **Timeout**: 10 seconds
- **Status**: Not yet implemented (Task 1.7)

### Google Cloud Logging
- **Purpose**: Structured logging in production environment
- **How we use it**: `@google-cloud/logging` package, buffered writes with graceful shutdown
- **Failure handling**: Silent failure in production (prevents log noise), console fallback in development
- **Features**: Metadata sanitization, sensitive data redaction, log buffering

---

## Performance Considerations

### Optimization Strategy
- **API Timeouts**: Configured per service (OpenAI: 30s, RxNorm/FDA: 10s)
- **Retry Logic**: Exponential backoff prevents overwhelming external APIs
- **Lazy Initialization**: Clients initialized on first use, not module load
- **Async Operations**: All external API calls are async/await
- **Response Format**: JSON response format for OpenAI reduces parsing overhead

### Caching Strategy
- **Current**: No caching implemented (MVP is stateless)
- **Future**: Consider caching RxNorm lookups and FDA NDC data (Phase 2+)

### Scaling Approach
- **Stateless Design**: Each request is independent, enables horizontal scaling
- **Cloud Run**: Auto-scales based on request volume
- **No Database**: Eliminates database connection pooling concerns
- **External APIs**: Rate limiting handled by retry logic and timeouts
