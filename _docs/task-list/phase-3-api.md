# Phase 3: API Routes & Orchestration

**Document Version:** 1.0
**Last Updated:** 2025-11-11

---

## Overview

This phase implements the SvelteKit API routes that orchestrate the calculation workflow, combining services and business logic to process prescription requests and return formatted responses.

**Dependencies:** [Phase 2: Business Logic & Calculations](phase-2-logic.md)

**Estimated Effort:** API implementation and orchestration

---

## Tasks

### 3.1 - Create Calculation Orchestrator

**Description:** Implement main orchestration logic for calculation workflow

**Implementation Steps:**
1. Create `src/lib/server/orchestrator/calculation-orchestrator.ts`:
   ```typescript
   import type { CalculationRequest, CalculationResponse, Warning } from '$lib/types';
   import * as openaiService from '$lib/server/services/openai.service';
   import * as rxnormService from '$lib/server/services/rxnorm.service';
   import * as fdaNdcService from '$lib/server/services/fda-ndc.service';
   import { calculateTotalQuantity } from '$lib/server/logic/quantity-calculator';
   import { findBestNDCMatches } from '$lib/server/logic/ndc-matcher';
   import { validatePrescriptionInput } from '$lib/server/logic/validation';
   import { logger } from '$lib/server/utils/logger';
   import { handleAPIError } from '$lib/server/utils/error-handler';

   export async function processCalculation(
     request: CalculationRequest
   ): Promise<CalculationResponse> {
     const startTime = Date.now();

     try {
       logger.info('Processing calculation request', { request });

       // Step 1: Validate input
       validatePrescriptionInput(request);

       // Step 2: Parse SIG with OpenAI
       const parsedSIG = await openaiService.parseSIG(request.sig);
       logger.info('SIG parsed', { parsedSIG });

       // Step 3: Normalize drug name to RxCUI (if provided)
       let rxcui: string;
       let normalizedDrug;

       if (request.drugName) {
         normalizedDrug = await rxnormService.normalizeToRxCUI(request.drugName);
         rxcui = normalizedDrug.rxcui;
       } else if (request.ndc) {
         // If NDC provided, validate it directly
         const validated = await fdaNdcService.validateNDC(request.ndc);
         if (!validated) {
           return {
             success: false,
             error: 'Invalid or inactive NDC provided',
             code: 'VALIDATION_ERROR'
           };
         }
         // Use the NDC directly
         rxcui = request.ndc; // Fallback, ideally get RxCUI from NDC
       } else {
         throw new Error('Either drugName or ndc must be provided');
       }

       // Step 4: Calculate total quantity needed
       const quantityResult = calculateTotalQuantity(parsedSIG, request.daysSupply);

       // Step 5: Retrieve available NDCs from FDA
       const availableNDCs = await fdaNdcService.searchNDCsByRxCUI(rxcui);

       if (availableNDCs.length === 0) {
         return {
           success: false,
           error: 'No NDCs found for this medication',
           code: 'BUSINESS_LOGIC_ERROR'
         };
       }

       // Step 6: Find best matching NDCs (deterministic)
       const matchResult = findBestNDCMatches(
         quantityResult.totalQuantity,
         quantityResult.unit,
         availableNDCs
       );

       // Step 7: Use AI for intelligent selection and reasoning
       let aiReasoning: string | undefined;
       let finalWarnings: Warning[] = [...matchResult.warnings];

       if (matchResult.matches.length > 0) {
         try {
           const aiSelection = await openaiService.selectOptimalNDC({
             requiredQuantity: quantityResult.totalQuantity,
             unit: quantityResult.unit,
             availableNDCs: availableNDCs.map((ndc) => ({
               ndc: ndc.ndc,
               packageSize: ndc.packageSize,
               status: ndc.status
             }))
           });

           aiReasoning = aiSelection.reasoning;
           if (aiSelection.warnings) {
             finalWarnings = [...finalWarnings, ...aiSelection.warnings];
           }
         } catch (error) {
           logger.warn('AI selection failed, using deterministic result', { error });
           // Continue with deterministic result
         }
       }

       const duration = Date.now() - startTime;
       logger.info('Calculation completed', { duration, rxcui });

       return {
         success: true,
         data: {
           rxcui,
           normalizedDrug: {
             name: normalizedDrug?.name || 'Unknown',
             strength: parsedSIG.dose.toString(),
             doseForm: parsedSIG.unit
           },
           parsedSIG,
           selectedNDCs: matchResult.matches,
           totalQuantity: quantityResult.totalQuantity,
           warnings: finalWarnings,
           aiReasoning
         }
       };
     } catch (error) {
       const duration = Date.now() - startTime;
       logger.error('Calculation failed', { error, duration });

       return handleAPIError(error);
     }
   }
   ```
2. Create directory for orchestrator
3. Create unit test for orchestration logic

**Acceptance Criteria:**
- Orchestrator coordinates all services
- Error handling at each step
- Logging throughout workflow
- Proper response formatting
- Unit tests pass

**Files Created:**
- `src/lib/server/orchestrator/calculation-orchestrator.ts`
- `tests/unit/calculation-orchestrator.test.ts`

**Directories Created:**
- `src/lib/server/orchestrator/`

**Reference:** [architecture.md - Data Flow](../architecture.md#data-flow)

---

### 3.2 - Create API Calculate Endpoint

**Description:** Implement POST /api/calculate SvelteKit server route

**Implementation Steps:**
1. Create `src/routes/api/calculate/+server.ts`:
   ```typescript
   import { json } from '@sveltejs/kit';
   import type { RequestHandler } from './$types';
   import { processCalculation } from '$lib/server/orchestrator/calculation-orchestrator';
   import type { CalculationRequest } from '$lib/types';
   import { logger } from '$lib/server/utils/logger';

   export const POST: RequestHandler = async ({ request }) => {
     try {
       const body = (await request.json()) as CalculationRequest;

       logger.info('API request received', {
         drugName: body.drugName,
         ndc: body.ndc,
         daysSupply: body.daysSupply
       });

       const result = await processCalculation(body);

       const statusCode = result.success ? 200 : 400;

       return json(result, { status: statusCode });
     } catch (error) {
       logger.error('API request failed', { error });

       return json(
         {
           success: false,
           error: 'Invalid request format',
           code: 'VALIDATION_ERROR'
         },
         { status: 400 }
       );
     }
   };
   ```
2. Test endpoint with curl or Postman
3. Verify request/response format

**Acceptance Criteria:**
- POST endpoint accepts JSON request
- Returns proper status codes
- Response format matches spec
- Error handling works
- Logging captures requests

**Files Created:**
- `src/routes/api/calculate/+server.ts`

**Reference:** [architecture.md - API Layer](../architecture.md#api-layer)

---

### 3.3 - Create API Integration Tests

**Description:** Implement end-to-end API tests

**Implementation Steps:**
1. Create `tests/integration/api-calculate.test.ts`:
   ```typescript
   import { describe, it, expect, beforeAll } from 'vitest';
   import type { CalculationRequest } from '$lib/types';

   describe('POST /api/calculate', () => {
     const API_URL = 'http://localhost:5173/api/calculate';

     it('should calculate NDC for valid prescription', async () => {
       const request: CalculationRequest = {
         drugName: 'Lisinopril 10mg tablet',
         sig: 'Take 1 tablet by mouth once daily',
         daysSupply: 30
       };

       const response = await fetch(API_URL, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(request)
       });

       expect(response.ok).toBe(true);

       const data = await response.json();
       expect(data.success).toBe(true);
       expect(data.data).toBeDefined();
       expect(data.data.totalQuantity).toBe(30);
     });

     it('should return error for invalid input', async () => {
       const request = {
         sig: 'Take 1 tablet daily',
         daysSupply: -5 // Invalid
       };

       const response = await fetch(API_URL, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(request)
       });

       expect(response.ok).toBe(false);

       const data = await response.json();
       expect(data.success).toBe(false);
       expect(data.code).toBe('VALIDATION_ERROR');
     });

     it('should handle NDC input directly', async () => {
       const request: CalculationRequest = {
         ndc: '00071-0304-23',
         sig: 'Take 1 tablet twice daily',
         daysSupply: 30
       };

       const response = await fetch(API_URL, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(request)
       });

       const data = await response.json();
       expect(data.success).toBeDefined();
     });

     // Add more test cases
   });
   ```
2. Setup test server for integration tests
3. Mock external APIs for deterministic tests

**Acceptance Criteria:**
- Integration tests cover main scenarios
- Valid and invalid requests tested
- Response validation works
- All tests pass

**Files Created:**
- `tests/integration/api-calculate.test.ts`

**Reference:** [architecture.md - Testing Strategy](../architecture.md#testing-strategy)

---

### 3.4 - Add Request Rate Limiting (Optional)

**Description:** Implement basic rate limiting for API endpoint

**Implementation Steps:**
1. Create `src/lib/server/middleware/rate-limiter.ts`:
   ```typescript
   interface RateLimitStore {
     [key: string]: {
       count: number;
       resetTime: number;
     };
   }

   const store: RateLimitStore = {};

   export interface RateLimitOptions {
     maxRequests: number;
     windowMs: number;
   }

   export function checkRateLimit(
     identifier: string,
     options: RateLimitOptions = { maxRequests: 100, windowMs: 60000 }
   ): { allowed: boolean; remaining: number } {
     const now = Date.now();
     const record = store[identifier];

     if (!record || now > record.resetTime) {
       // Create new window
       store[identifier] = {
         count: 1,
         resetTime: now + options.windowMs
       };
       return { allowed: true, remaining: options.maxRequests - 1 };
     }

     if (record.count >= options.maxRequests) {
       return { allowed: false, remaining: 0 };
     }

     record.count++;
     return { allowed: true, remaining: options.maxRequests - record.count };
   }

   export function resetRateLimit(identifier: string): void {
     delete store[identifier];
   }
   ```
2. Integrate into API endpoint
3. Add rate limit headers to responses

**Acceptance Criteria:**
- Rate limiting tracks requests per identifier
- Limits enforced correctly
- Rate limit headers included
- Unit tests pass

**Files Created:**
- `src/lib/server/middleware/rate-limiter.ts`
- `tests/unit/rate-limiter.test.ts`

**Files Modified:**
- `src/routes/api/calculate/+server.ts`

**Reference:** [architecture.md - API Integration Strategy](../architecture.md#api-integration-strategy)

---

### 3.5 - Add API Response Caching Headers

**Description:** Configure caching headers for API responses

**Implementation Steps:**
1. Update `src/routes/api/calculate/+server.ts`:
   ```typescript
   export const POST: RequestHandler = async ({ request, setHeaders }) => {
     try {
       const body = (await request.json()) as CalculationRequest;
       const result = await processCalculation(body);

       // Set cache headers
       setHeaders({
         'Cache-Control': 'no-store, no-cache, must-revalidate',
         'Pragma': 'no-cache',
         'Expires': '0'
       });

       const statusCode = result.success ? 200 : 400;
       return json(result, { status: statusCode });
     } catch (error) {
       // Error handling...
     }
   };
   ```
2. Verify headers in response

**Acceptance Criteria:**
- Appropriate cache headers set
- No caching of calculation results
- Headers verified in tests

**Files Modified:**
- `src/routes/api/calculate/+server.ts`

**Reference:** [architecture.md - Performance Optimization](../architecture.md#performance-optimization)

---

### 3.6 - Create API Documentation

**Description:** Document API endpoint specification

**Implementation Steps:**
1. Create `_docs/api-spec.md`:
   ```markdown
   # API Specification

   ## POST /api/calculate

   Calculate optimal NDC package selection for a prescription.

   ### Request

   **Endpoint:** `POST /api/calculate`

   **Headers:**
   - `Content-Type: application/json`

   **Body:**
   ```json
   {
     "drugName": "string (optional)",
     "ndc": "string (optional, format: XXXXX-XXX-XX)",
     "sig": "string (required, max 500 chars)",
     "daysSupply": "number (required, 1-365)"
   }
   ```

   Note: Either `drugName` or `ndc` must be provided.

   ### Response

   **Success (200):**
   ```json
   {
     "success": true,
     "data": {
       "rxcui": "string",
       "normalizedDrug": {
         "name": "string",
         "strength": "string",
         "doseForm": "string"
       },
       "parsedSIG": {
         "dose": "number",
         "unit": "string",
         "frequency": "number",
         "route": "string",
         "specialInstructions": "string"
       },
       "selectedNDCs": [
         {
           "ndc": "string",
           "quantity": "number",
           "packageCount": "number",
           "overfill": "number (optional)",
           "underfill": "number (optional)"
         }
       ],
       "totalQuantity": "number",
       "warnings": [
         {
           "type": "string",
           "message": "string",
           "severity": "info | warning | error"
         }
       ],
       "aiReasoning": "string (optional)"
     }
   }
   ```

   **Error (400/500):**
   ```json
   {
     "success": false,
     "error": "string",
     "code": "string",
     "retryable": "boolean (optional)"
   }
   ```

   ### Error Codes

   - `VALIDATION_ERROR` - Invalid input data
   - `EXTERNAL_API_ERROR` - External API failure
   - `BUSINESS_LOGIC_ERROR` - Business logic error
   - `INTERNAL_ERROR` - Unexpected server error

   ### Examples

   **Example 1: Drug name input**
   ```bash
   curl -X POST http://localhost:5173/api/calculate \
     -H "Content-Type: application/json" \
     -d '{
       "drugName": "Lisinopril 10mg tablet",
       "sig": "Take 1 tablet by mouth daily",
       "daysSupply": 30
     }'
   ```

   **Example 2: NDC input**
   ```bash
   curl -X POST http://localhost:5173/api/calculate \
     -H "Content-Type: application/json" \
     -d '{
       "ndc": "00071-0304-23",
       "sig": "Take 1 tablet twice daily with food",
       "daysSupply": 90
     }'
   ```
   ```

**Acceptance Criteria:**
- API documentation complete
- Request/response formats documented
- Examples provided
- Error codes listed

**Files Created:**
- `_docs/api-spec.md`

**Reference:** [architecture.md - API Layer](../architecture.md#api-layer)

---

## Phase Completion Criteria

All tasks (3.1 - 3.6) completed and verified:
- [ ] Calculation orchestrator implemented
- [ ] API calculate endpoint created
- [ ] API integration tests passing
- [ ] Rate limiting added (optional)
- [ ] Caching headers configured
- [ ] API documentation complete

**Next Phase:** [Phase 4: Frontend UI](phase-4-frontend.md)
