# Phase 1: Core Services & API Integration

**Document Version:** 1.0
**Last Updated:** 2025-11-11

---

## Overview

This phase implements the service layer for external API integrations (OpenAI, RxNorm, FDA NDC) and core utility functions for HTTP requests, retry logic, error handling, and logging.

**Dependencies:** [Phase 0: Project Setup & Foundation](phase-0-setup.md)

**Estimated Effort:** Core service implementation

---

## Tasks

### 1.1 - Create HTTP Client Utility

**Description:** Implement reusable HTTP client with timeout and error handling

**Implementation Steps:**
1. Create `src/lib/server/utils/api-client.ts`:
   ```typescript
   import { API_TIMEOUTS } from '$lib/config/constants';

   export interface FetchOptions {
     method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
     headers?: Record<string, string>;
     body?: unknown;
     timeout?: number;
   }

   export class APIClient {
     async fetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
       const controller = new AbortController();
       const timeout = options.timeout || API_TIMEOUTS.RXNORM;

       const timeoutId = setTimeout(() => controller.abort(), timeout);

       try {
         const response = await fetch(url, {
           method: options.method || 'GET',
           headers: {
             'Content-Type': 'application/json',
             ...options.headers
           },
           body: options.body ? JSON.stringify(options.body) : undefined,
           signal: controller.signal
         });

         clearTimeout(timeoutId);

         if (!response.ok) {
           throw new Error(`HTTP ${response.status}: ${response.statusText}`);
         }

         return await response.json() as T;
       } catch (error) {
         clearTimeout(timeoutId);
         throw error;
       }
     }
   }

   export const apiClient = new APIClient();
   ```
2. Create unit test `tests/unit/api-client.test.ts`
3. Verify timeout functionality works
4. Test error handling for non-200 responses

**Acceptance Criteria:**
- HTTP client supports GET/POST methods
- Timeout configuration works
- AbortController cancels requests on timeout
- Error handling for failed requests
- Unit tests pass

**Files Created:**
- `src/lib/server/utils/api-client.ts`
- `tests/unit/api-client.test.ts`

**Reference:** [architecture.md - API Integration Strategy](../architecture.md#api-integration-strategy)

---

### 1.2 - Implement Retry Logic Utility

**Description:** Create retry utility with exponential backoff

**Implementation Steps:**
1. Create `src/lib/server/utils/retry.ts`:
   ```typescript
   import { RETRY_CONFIG } from '$lib/config/constants';

   export interface RetryOptions {
     maxRetries?: number;
     baseDelay?: number;
     maxDelay?: number;
     shouldRetry?: (error: Error) => boolean;
   }

   export async function retryWithBackoff<T>(
     fn: () => Promise<T>,
     options: RetryOptions = {}
   ): Promise<T> {
     const {
       maxRetries = RETRY_CONFIG.MAX_RETRIES,
       baseDelay = RETRY_CONFIG.BASE_DELAY,
       maxDelay = RETRY_CONFIG.MAX_DELAY,
       shouldRetry = () => true
     } = options;

     let lastError: Error;

     for (let attempt = 0; attempt < maxRetries; attempt++) {
       try {
         return await fn();
       } catch (error) {
         lastError = error as Error;

         if (attempt === maxRetries - 1 || !shouldRetry(lastError)) {
           throw lastError;
         }

         const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
         await new Promise((resolve) => setTimeout(resolve, delay));
       }
     }

     throw lastError!;
   }
   ```
2. Create unit test `tests/unit/retry.test.ts`
3. Test exponential backoff timing
4. Verify retry count limits

**Acceptance Criteria:**
- Retry function implements exponential backoff
- Maximum retry limit enforced
- Custom retry conditions supported
- Unit tests validate retry behavior

**Files Created:**
- `src/lib/server/utils/retry.ts`
- `tests/unit/retry.test.ts`

**Reference:** [architecture.md - Retry Logic](../architecture.md#retry-logic)

---

### 1.3 - Create Error Handling Utility

**Description:** Implement custom error classes and error handler

**Implementation Steps:**
1. Create `src/lib/server/utils/error-handler.ts`:
   ```typescript
   import { ERROR_CODES } from '$lib/config/constants';

   export class AppError extends Error {
     constructor(
       public code: string,
       public message: string,
       public statusCode: number = 500,
       public retryable: boolean = false
     ) {
       super(message);
       this.name = 'AppError';
     }
   }

   export class ValidationError extends AppError {
     constructor(message: string) {
       super(ERROR_CODES.VALIDATION_ERROR, message, 400, false);
       this.name = 'ValidationError';
     }
   }

   export class ExternalAPIError extends AppError {
     constructor(message: string, retryable: boolean = true) {
       super(ERROR_CODES.EXTERNAL_API_ERROR, message, 502, retryable);
       this.name = 'ExternalAPIError';
     }
   }

   export function handleAPIError(error: unknown) {
     if (error instanceof AppError) {
       return {
         success: false,
         error: error.message,
         code: error.code,
         retryable: error.retryable
       };
     }

     console.error('Unexpected error:', error);

     return {
       success: false,
       error: 'An unexpected error occurred',
       code: ERROR_CODES.INTERNAL_ERROR
     };
   }
   ```
2. Create unit test `tests/unit/error-handler.test.ts`
3. Test error class hierarchy
4. Verify error formatting

**Acceptance Criteria:**
- Custom error classes extend Error properly
- Error handler formats responses correctly
- Status codes assigned appropriately
- Unit tests cover all error types

**Files Created:**
- `src/lib/server/utils/error-handler.ts`
- `tests/unit/error-handler.test.ts`

**Reference:** [architecture.md - Error Handling Strategy](../architecture.md#error-handling-strategy)

---

### 1.4 - Setup Cloud Logging Utility

**Description:** Create logging utility with Cloud Logging integration

**Implementation Steps:**
1. Create `src/lib/server/utils/logger.ts`:
   ```typescript
   import { Logging } from '@google-cloud/logging';

   const IS_PRODUCTION = process.env.NODE_ENV === 'production';
   const logging = IS_PRODUCTION ? new Logging() : null;
   const log = logging?.log('ndc-calculator');

   type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

   interface LogMetadata {
     [key: string]: unknown;
   }

   function writeLog(level: LogLevel, message: string, metadata?: LogMetadata) {
     const logData = {
       severity: level,
       message,
       timestamp: new Date().toISOString(),
       ...metadata
     };

     if (IS_PRODUCTION && log) {
       const entry = log.entry({ severity: level }, logData);
       log.write(entry).catch(console.error);
     } else {
       // Development: console logging
       const logFn = level === 'ERROR' ? console.error : console.log;
       logFn(`[${level}] ${message}`, metadata || '');
     }
   }

   export const logger = {
     debug: (message: string, metadata?: LogMetadata) =>
       writeLog('DEBUG', message, metadata),

     info: (message: string, metadata?: LogMetadata) =>
       writeLog('INFO', message, metadata),

     warn: (message: string, metadata?: LogMetadata) =>
       writeLog('WARN', message, metadata),

     error: (message: string, metadata?: LogMetadata) =>
       writeLog('ERROR', message, metadata)
   };
   ```
2. Test logging in development mode
3. Verify Cloud Logging integration (production)

**Acceptance Criteria:**
- Logger uses Cloud Logging in production
- Console logging in development
- Structured log format
- Type-safe metadata

**Files Created:**
- `src/lib/server/utils/logger.ts`

**Reference:** [architecture.md - Cloud Logging Integration](../architecture.md#cloud-logging-integration)

---

### 1.5 - Implement OpenAI Service

**Description:** Create service wrapper for OpenAI API integration

**Implementation Steps:**
1. Create `src/lib/server/services/openai.service.ts`:
   ```typescript
   import OpenAI from 'openai';
   import type { ParsedSIG } from '$lib/types';
   import { API_TIMEOUTS } from '$lib/config/constants';
   import { ExternalAPIError } from '$lib/server/utils/error-handler';
   import { logger } from '$lib/server/utils/logger';
   import { retryWithBackoff } from '$lib/server/utils/retry';

   const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
     timeout: API_TIMEOUTS.OPENAI
   });

   const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

   export async function parseSIG(sigText: string): Promise<ParsedSIG> {
     logger.info('Parsing SIG with OpenAI', { sigText });

     const prompt = `You are a pharmacy AI assistant. Parse the following prescription SIG into structured JSON.

   SIG: "${sigText}"

   Return ONLY valid JSON matching this exact schema (no markdown, no explanations):
   {
     "dose": number,
     "unit": string,
     "frequency": number,
     "route": string,
     "specialInstructions": string
   }`;

     try {
       const result = await retryWithBackoff(async () => {
         const completion = await openai.chat.completions.create({
           model: MODEL,
           messages: [{ role: 'user', content: prompt }],
           response_format: { type: 'json_object' },
           temperature: 0.1
         });

         const content = completion.choices[0]?.message?.content;
         if (!content) {
           throw new Error('No response from OpenAI');
         }

         return JSON.parse(content) as ParsedSIG;
       }, { maxRetries: 2 });

       logger.info('SIG parsed successfully', { result });
       return result;

     } catch (error) {
       logger.error('Failed to parse SIG', { error, sigText });
       throw new ExternalAPIError('Failed to parse prescription directions');
     }
   }

   export interface NDCSelectionInput {
     requiredQuantity: number;
     unit: string;
     availableNDCs: Array<{
       ndc: string;
       packageSize: number;
       status: string;
     }>;
   }

   export async function selectOptimalNDC(input: NDCSelectionInput) {
     logger.info('Selecting optimal NDC with OpenAI', { input });

     const prompt = `You are a pharmacy AI assistant selecting the optimal NDC package(s) for a prescription.

   Required quantity: ${input.requiredQuantity} ${input.unit}
   Available NDCs: ${JSON.stringify(input.availableNDCs, null, 2)}

   Select the best option(s) considering:
   - Minimize waste (prefer exact matches)
   - Prefer single packages over multiple
   - Flag inactive NDCs with warnings
   - Warn about significant overfills/underfills

   Return ONLY valid JSON matching this schema:
   {
     "selectedNDCs": [
       {
         "ndc": string,
         "packageCount": number,
         "totalQuantity": number
       }
     ],
     "reasoning": string,
     "warnings": [
       {
         "type": string,
         "message": string,
         "severity": "info" | "warning" | "error"
       }
     ]
   }`;

     try {
       const result = await retryWithBackoff(async () => {
         const completion = await openai.chat.completions.create({
           model: MODEL,
           messages: [{ role: 'user', content: prompt }],
           response_format: { type: 'json_object' },
           temperature: 0.3
         });

         const content = completion.choices[0]?.message?.content;
         if (!content) {
           throw new Error('No response from OpenAI');
         }

         return JSON.parse(content);
       }, { maxRetries: 2 });

       logger.info('NDC selection completed', { result });
       return result;

     } catch (error) {
       logger.error('Failed to select NDC', { error, input });
       throw new ExternalAPIError('Failed to select optimal NDC');
     }
   }
   ```
2. Create unit test with mocked OpenAI responses
3. Test error handling and retries
4. Validate JSON schema parsing

**Acceptance Criteria:**
- OpenAI client initialized with API key
- parseSIG function returns ParsedSIG type
- selectOptimalNDC function returns selection
- JSON schema validation enforced
- Retry logic on failures
- Error handling with logging
- Unit tests pass

**Files Created:**
- `src/lib/server/services/openai.service.ts`
- `tests/unit/openai-service.test.ts`

**Reference:** [architecture.md - OpenAI Integration](../architecture.md#openai-integration)

---

### 1.6 - Implement RxNorm Service

**Description:** Create service wrapper for RxNorm API integration

**Implementation Steps:**
1. Create `src/lib/server/services/rxnorm.service.ts`:
   ```typescript
   import { apiClient } from '$lib/server/utils/api-client';
   import { API_TIMEOUTS } from '$lib/config/constants';
   import { ExternalAPIError } from '$lib/server/utils/error-handler';
   import { logger } from '$lib/server/utils/logger';
   import { retryWithBackoff } from '$lib/server/utils/retry';

   const BASE_URL = process.env.RXNORM_API_BASE_URL || 'https://rxnav.nlm.nih.gov/REST';

   interface RxNormResponse {
     idGroup?: {
       rxnormId?: string[];
     };
   }

   interface RxNormProperties {
     properties?: {
       name?: string;
       synonym?: string;
       tty?: string;
       language?: string;
       suppress?: string;
       umlscui?: string;
     };
   }

   export interface DrugInfo {
     rxcui: string;
     name: string;
     synonym?: string;
     tty?: string;
   }

   export async function normalizeToRxCUI(drugName: string): Promise<DrugInfo> {
     logger.info('Normalizing drug name to RxCUI', { drugName });

     try {
       const result = await retryWithBackoff(async () => {
         const url = `${BASE_URL}/rxcui.json?name=${encodeURIComponent(drugName)}`;
         const response = await apiClient.fetch<RxNormResponse>(url, {
           timeout: API_TIMEOUTS.RXNORM
         });

         const rxcui = response.idGroup?.rxnormId?.[0];
         if (!rxcui) {
           throw new Error(`No RxCUI found for drug: ${drugName}`);
         }

         return rxcui;
       }, { maxRetries: 3 });

       // Get properties for the RxCUI
       const properties = await getRxCUIProperties(result);

       logger.info('Drug normalized successfully', { drugName, rxcui: result });

       return {
         rxcui: result,
         name: properties.name || drugName,
         synonym: properties.synonym,
         tty: properties.tty
       };

     } catch (error) {
       logger.error('Failed to normalize drug name', { error, drugName });
       throw new ExternalAPIError('Failed to normalize drug name with RxNorm');
     }
   }

   export async function getRxCUIProperties(rxcui: string): Promise<Partial<DrugInfo>> {
     logger.info('Fetching RxCUI properties', { rxcui });

     try {
       const url = `${BASE_URL}/rxcui/${rxcui}/properties.json`;
       const response = await apiClient.fetch<RxNormProperties>(url, {
         timeout: API_TIMEOUTS.RXNORM
       });

       return {
         name: response.properties?.name,
         synonym: response.properties?.synonym,
         tty: response.properties?.tty
       };

     } catch (error) {
       logger.warn('Failed to fetch RxCUI properties', { error, rxcui });
       return {};
     }
   }
   ```
2. Create unit test with mocked API responses
3. Test error handling for unknown drugs
4. Verify retry logic

**Acceptance Criteria:**
- RxNorm API integration working
- normalizeToRxCUI returns valid RxCUI
- Error handling for unknown drugs
- Retry logic on failures
- Logging integration
- Unit tests pass

**Files Created:**
- `src/lib/server/services/rxnorm.service.ts`
- `tests/unit/rxnorm-service.test.ts`

**Reference:** [architecture.md - RxNorm Integration](../architecture.md#rxnorm-integration)

---

### 1.7 - Implement FDA NDC Service

**Description:** Create service wrapper for FDA NDC Directory API integration

**Implementation Steps:**
1. Create `src/lib/server/services/fda-ndc.service.ts`:
   ```typescript
   import { apiClient } from '$lib/server/utils/api-client';
   import { API_TIMEOUTS } from '$lib/config/constants';
   import type { NDCPackage } from '$lib/types';
   import { ExternalAPIError } from '$lib/server/utils/error-handler';
   import { logger } from '$lib/server/utils/logger';
   import { retryWithBackoff } from '$lib/server/utils/retry';

   const BASE_URL = process.env.FDA_NDC_API_BASE_URL || 'https://api.fda.gov/drug/ndc.json';

   interface FDANDCResponse {
     results?: Array<{
       product_ndc: string;
       generic_name: string;
       brand_name?: string;
       active_ingredients: Array<{
         name: string;
         strength: string;
       }>;
       packaging?: Array<{
         package_ndc: string;
         description: string;
       }>;
       marketing_status: string;
     }>;
   }

   export async function searchNDCsByRxCUI(rxcui: string): Promise<NDCPackage[]> {
     logger.info('Searching NDCs by RxCUI', { rxcui });

     try {
       const result = await retryWithBackoff(async () => {
         const url = `${BASE_URL}?search=rxcui:${rxcui}&limit=100`;
         const response = await apiClient.fetch<FDANDCResponse>(url, {
           timeout: API_TIMEOUTS.FDA_NDC
         });

         if (!response.results || response.results.length === 0) {
           return [];
         }

         return parseNDCPackages(response.results);
       }, {
         maxRetries: 3,
         shouldRetry: (error) => {
           // Don't retry if no results found
           return !(error.message.includes('No results'));
         }
       });

       logger.info('NDCs found', { rxcui, count: result.length });
       return result;

     } catch (error) {
       logger.error('Failed to search NDCs', { error, rxcui });
       throw new ExternalAPIError('Failed to retrieve NDC data from FDA');
     }
   }

   export async function validateNDC(ndc: string): Promise<NDCPackage | null> {
     logger.info('Validating NDC', { ndc });

     try {
       const url = `${BASE_URL}?search=product_ndc:"${ndc}"&limit=1`;
       const response = await apiClient.fetch<FDANDCResponse>(url, {
         timeout: API_TIMEOUTS.FDA_NDC
       });

       if (!response.results || response.results.length === 0) {
         return null;
       }

       const packages = parseNDCPackages(response.results);
       return packages[0] || null;

     } catch (error) {
       logger.error('Failed to validate NDC', { error, ndc });
       throw new ExternalAPIError('Failed to validate NDC with FDA');
     }
   }

   function parseNDCPackages(results: FDANDCResponse['results']): NDCPackage[] {
     if (!results) return [];

     const packages: NDCPackage[] = [];

     for (const result of results) {
       const status = result.marketing_status?.toLowerCase().includes('active')
         ? 'active'
         : 'inactive';

       if (result.packaging && result.packaging.length > 0) {
         for (const pkg of result.packaging) {
           packages.push({
             ndc: pkg.package_ndc,
             packageSize: extractPackageSize(pkg.description),
             packageUnit: extractPackageUnit(pkg.description),
             status,
             manufacturer: result.brand_name
           });
         }
       } else {
         // No specific packaging info, use product NDC
         packages.push({
           ndc: result.product_ndc,
           packageSize: 1,
           packageUnit: 'unit',
           status,
           manufacturer: result.brand_name
         });
       }
     }

     return packages;
   }

   function extractPackageSize(description: string): number {
     // Parse descriptions like "100 TABLET in 1 BOTTLE"
     const match = description.match(/^(\d+)/);
     return match ? parseInt(match[1], 10) : 1;
   }

   function extractPackageUnit(description: string): string {
     // Parse descriptions like "100 TABLET in 1 BOTTLE"
     const match = description.match(/^\d+\s+(\w+)/);
     return match ? match[1].toLowerCase() : 'unit';
   }
   ```
2. Create unit test with mocked FDA responses
3. Test package size parsing logic
4. Verify NDC validation

**Acceptance Criteria:**
- FDA NDC API integration working
- searchNDCsByRxCUI returns package array
- validateNDC checks NDC status
- Package size parsing accurate
- Active/inactive status detection
- Unit tests pass

**Files Created:**
- `src/lib/server/services/fda-ndc.service.ts`
- `tests/unit/fda-ndc-service.test.ts`

**Reference:** [architecture.md - FDA NDC Directory Integration](../architecture.md#fda-ndc-directory-integration)

---

### 1.8 - Create External API Types

**Description:** Define TypeScript interfaces for external API responses

**Implementation Steps:**
1. Create `src/lib/types/external-api.types.ts`:
   ```typescript
   // RxNorm API Response Types
   export interface RxNormAPIResponse {
     idGroup?: {
       rxnormId?: string[];
     };
   }

   export interface RxNormPropertiesResponse {
     properties?: {
       name?: string;
       synonym?: string;
       tty?: string;
       language?: string;
       suppress?: string;
       umlscui?: string;
     };
   }

   // FDA NDC API Response Types
   export interface FDANDCAPIResponse {
     meta?: {
       disclaimer: string;
       terms: string;
       license: string;
       last_updated: string;
     };
     results?: Array<{
       product_ndc: string;
       generic_name: string;
       brand_name?: string;
       brand_name_base?: string;
       brand_name_suffix?: string;
       product_type: string;
       route?: string[];
       marketing_start_date?: string;
       marketing_end_date?: string;
       marketing_category: string;
       application_number?: string;
       labeler_name: string;
       substance_name?: string;
       active_ingredients: Array<{
         name: string;
         strength: string;
       }>;
       finished?: boolean;
       packaging?: Array<{
         package_ndc: string;
         description: string;
         marketing_start_date?: string;
         sample?: boolean;
       }>;
       listing_expiration_date?: string;
       marketing_status: string;
     }>;
   }

   // OpenAI API Response Types (for structured outputs)
   export interface OpenAIParsedSIG {
     dose: number;
     unit: string;
     frequency: number;
     route: string;
     duration?: number;
     specialInstructions?: string;
   }

   export interface OpenAINDCSelection {
     selectedNDCs: Array<{
       ndc: string;
       packageCount: number;
       totalQuantity: number;
     }>;
     reasoning: string;
     warnings: Array<{
       type: string;
       message: string;
       severity: 'info' | 'warning' | 'error';
     }>;
   }
   ```
2. Update barrel export in `src/lib/types/index.ts`

**Acceptance Criteria:**
- All external API response types defined
- Types match actual API responses
- Exported from index.ts
- No TypeScript errors

**Files Created:**
- `src/lib/types/external-api.types.ts`

**Files Modified:**
- `src/lib/types/index.ts`

**Reference:** [architecture.md - Type Definitions](../architecture.md#type-definitions)

---

### 1.9 - Create Service Integration Tests

**Description:** Implement integration tests for all service modules

**Implementation Steps:**
1. Create `tests/integration/services.test.ts`:
   ```typescript
   import { describe, it, expect, vi, beforeEach } from 'vitest';
   import * as openaiService from '$lib/server/services/openai.service';
   import * as rxnormService from '$lib/server/services/rxnorm.service';
   import * as fdaNdcService from '$lib/server/services/fda-ndc.service';

   // Mock external API calls
   vi.mock('openai');
   vi.mock('$lib/server/utils/api-client');

   describe('Service Integration Tests', () => {
     describe('OpenAI Service', () => {
       it('should parse SIG text correctly', async () => {
         // Test implementation
       });

       it('should select optimal NDC', async () => {
         // Test implementation
       });
     });

     describe('RxNorm Service', () => {
       it('should normalize drug name to RxCUI', async () => {
         // Test implementation
       });

       it('should handle unknown drugs gracefully', async () => {
         // Test implementation
       });
     });

     describe('FDA NDC Service', () => {
       it('should search NDCs by RxCUI', async () => {
         // Test implementation
       });

       it('should validate NDC status', async () => {
         // Test implementation
       });
     });
   });
   ```
2. Implement test cases for each service
3. Mock external API responses
4. Verify error handling

**Acceptance Criteria:**
- Integration tests for all services
- Mocked API responses
- Error scenarios tested
- All tests pass

**Files Created:**
- `tests/integration/services.test.ts`

**Reference:** [architecture.md - Testing Strategy](../architecture.md#testing-strategy)

---

## Phase Completion Criteria

All tasks (1.1 - 1.9) completed and verified:
- [ ] HTTP client utility implemented
- [ ] Retry logic with exponential backoff
- [ ] Error handling utilities created
- [ ] Cloud Logging integration setup
- [ ] OpenAI service implemented
- [ ] RxNorm service implemented
- [ ] FDA NDC service implemented
- [ ] External API types defined
- [ ] Service integration tests passing

**Next Phase:** [Phase 2: Business Logic & Calculations](phase-2-logic.md)
