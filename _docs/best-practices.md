# Best Practices for NDC Calculator Development

**Document Version:** 1.0
**Last Updated:** 2025-11-11

---

## Table of Contents

1. [General Principles](#general-principles)
2. [TypeScript Best Practices](#typescript-best-practices)
3. [SvelteKit Conventions](#sveltekit-conventions)
4. [API Integration](#api-integration)
5. [Error Handling](#error-handling)
6. [Testing Strategy](#testing-strategy)
7. [Code Organization](#code-organization)
8. [Performance Optimization](#performance-optimization)
9. [Security](#security)
10. [AI Integration](#ai-integration)

---

## General Principles

### Write Modular Code

Break down functionality into small, focused modules that do one thing well.

**Good:**
```typescript
// Single responsibility
export function calculateDailyDose(dose: number, frequency: number): number {
  return dose * frequency;
}

export function calculateTotalQuantity(dailyDose: number, days: number): number {
  return dailyDose * days;
}
```

**Bad:**
```typescript
// Multiple responsibilities mixed
export function calculateEverything(dose, frequency, days, unit, packages) {
  const daily = dose * frequency;
  const total = daily * days;
  // ...50 more lines of unrelated logic
}
```

---

### Favor Composition Over Inheritance

Use composition to build complex functionality from simple pieces.

**Good:**
```typescript
const calculator = {
  parseInput: parseSIG,
  calculateQuantity: calculateTotalQuantity,
  matchPackages: findBestNDCMatches
};
```

**Bad:**
```typescript
class BaseCalculator {}
class ExtendedCalculator extends BaseCalculator {}
class UltraCalculator extends ExtendedCalculator {}
```

---

### Keep Functions Pure When Possible

Pure functions are easier to test, debug, and reason about.

**Good:**
```typescript
export function roundToDispensable(quantity: number, unit: string): number {
  if (unit === 'tablet') return Math.ceil(quantity);
  return Math.round(quantity * 10) / 10;
}
```

**Bad:**
```typescript
let globalQuantity = 0;

export function roundToDispensable(unit: string) {
  if (unit === 'tablet') globalQuantity = Math.ceil(globalQuantity);
  return globalQuantity;
}
```

---

## TypeScript Best Practices

### Use Strict Type Checking

Enable all strict TypeScript options for maximum type safety.

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

### Define Explicit Interfaces

Create interfaces for all data structures, especially API contracts.

**Good:**
```typescript
interface PrescriptionInput {
  drugName?: string;
  ndc?: string;
  sig: string;
  daysSupply: number;
}

export function validateInput(input: PrescriptionInput): boolean {
  // Type-safe validation
}
```

**Bad:**
```typescript
export function validateInput(input: any): boolean {
  // No type safety
}
```

---

### Use Type Guards

Implement type guards for runtime type checking.

```typescript
export function isNDCPackage(obj: unknown): obj is NDCPackage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'ndc' in obj &&
    'packageSize' in obj &&
    'status' in obj
  );
}

// Usage
if (isNDCPackage(data)) {
  // TypeScript knows data is NDCPackage
  console.log(data.ndc);
}
```

---

### Avoid Type Assertions

Use type guards instead of type assertions when possible.

**Good:**
```typescript
if (isValidResponse(response)) {
  processResponse(response);
}
```

**Bad:**
```typescript
processResponse(response as ValidResponse);
```

---

### Use Const Assertions for Constants

```typescript
export const WARNING_TYPES = {
  NO_EXACT_MATCH: 'NO_EXACT_MATCH',
  INACTIVE_NDC: 'INACTIVE_NDC',
  OVERFILL: 'OVERFILL'
} as const;

// Type is now literal: 'NO_EXACT_MATCH' | 'INACTIVE_NDC' | 'OVERFILL'
type WarningType = typeof WARNING_TYPES[keyof typeof WARNING_TYPES];
```

---

## SvelteKit Conventions

### File Naming

Follow SvelteKit conventions for routes and components.

```
src/routes/
  +page.svelte           # Page component
  +page.server.ts        # Server-side load function
  +layout.svelte         # Layout component
  api/
    calculate/
      +server.ts         # API endpoint

src/lib/
  components/
    Button.svelte        # PascalCase for components
  server/
    services/
      openai.service.ts  # kebab-case.service.ts
  types/
    api.types.ts         # kebab-case.types.ts
```

---

### Component Organization

Structure Svelte components consistently.

```svelte
<script lang="ts">
  // 1. Imports
  import { onMount } from 'svelte';
  import type { Props } from './types';

  // 2. Exports (props)
  export let data: Props;

  // 3. Local variables
  let loading = false;

  // 4. Reactive statements
  $: isValid = data.length > 0;

  // 5. Functions
  function handleSubmit() {
    // ...
  }

  // 6. Lifecycle
  onMount(() => {
    // ...
  });
</script>

<!-- 7. Template -->
<div>
  <!-- ... -->
</div>

<!-- 8. Styles -->
<style>
  /* ... */
</style>
```

---

### Server-Side Only Code

Keep server-side code in `src/lib/server/` to prevent client exposure.

```typescript
// src/lib/server/services/openai.service.ts
// This code will never be bundled for the client
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Safe: server-side only
});
```

---

### Use Load Functions Appropriately

```typescript
// +page.server.ts - Server-side data loading
export async function load() {
  // Runs on server only
  const data = await fetchSecretData();
  return { data };
}

// +page.ts - Universal data loading
export async function load({ fetch }) {
  // Can run on server or client
  const response = await fetch('/api/data');
  return await response.json();
}
```

---

## API Integration

### Use Service Layer Pattern

Encapsulate all external API calls in service modules.

```typescript
// src/lib/server/services/rxnorm.service.ts
export async function normalizeToRxCUI(drugName: string): Promise<DrugInfo> {
  // All RxNorm logic here
}

// Usage in orchestrator
import * as rxnormService from '$lib/server/services/rxnorm.service';
const drug = await rxnormService.normalizeToRxCUI(input.drugName);
```

---

### Implement Retry Logic

Always add retry logic for external API calls.

```typescript
export async function callExternalAPI<T>(fn: () => Promise<T>): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    baseDelay: 1000,
    shouldRetry: (error) => {
      // Don't retry 4xx errors
      return !error.message.includes('4');
    }
  });
}
```

---

### Handle Timeouts

Set appropriate timeouts for all external calls.

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch(url, { signal: controller.signal });
  return response.json();
} finally {
  clearTimeout(timeout);
}
```

---

### Log API Interactions

Log all external API calls for debugging and monitoring.

```typescript
export async function fetchFromAPI(url: string) {
  logger.info('API request', { url });

  try {
    const response = await fetch(url);
    logger.info('API response', { url, status: response.status });
    return response;
  } catch (error) {
    logger.error('API error', { url, error });
    throw error;
  }
}
```

---

## Error Handling

### Use Custom Error Classes

Create specific error types for different failure scenarios.

```typescript
export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400, false);
  }
}

export class ExternalAPIError extends AppError {
  constructor(message: string, retryable = true) {
    super('EXTERNAL_API_ERROR', message, 502, retryable);
  }
}

// Usage
throw new ValidationError('Invalid drug name');
```

---

### Fail Fast

Validate inputs early and fail fast with clear error messages.

```typescript
export function processCalculation(input: CalculationRequest) {
  // Validate immediately
  validatePrescriptionInput(input);

  // Continue with processing
  // ...
}
```

---

### Provide Meaningful Error Messages

Error messages should be actionable for users.

**Good:**
```typescript
throw new ValidationError(
  'Days supply must be between 1 and 365. Received: ' + input.daysSupply
);
```

**Bad:**
```typescript
throw new Error('Invalid input');
```

---

### Never Swallow Errors Silently

Always log errors, even if you handle them gracefully.

**Good:**
```typescript
try {
  const result = await riskyOperation();
} catch (error) {
  logger.error('Risky operation failed', { error });
  return fallbackValue;
}
```

**Bad:**
```typescript
try {
  const result = await riskyOperation();
} catch (error) {
  return fallbackValue; // Silent failure
}
```

---

## Testing Strategy

### Follow AAA Pattern

Structure tests with Arrange, Act, Assert.

```typescript
test('should calculate total quantity correctly', () => {
  // Arrange
  const sig: ParsedSIG = { dose: 2, unit: 'tablet', frequency: 3, route: 'oral' };
  const days = 30;

  // Act
  const result = calculateTotalQuantity(sig, days);

  // Assert
  expect(result.totalQuantity).toBe(180); // 2 * 3 * 30
});
```

---

### Test Edge Cases

Always test boundary conditions and edge cases.

```typescript
describe('Input Validation', () => {
  it('should reject days supply of 0', () => {
    expect(() => validateInput({ sig: 'test', daysSupply: 0 }))
      .toThrow(ValidationError);
  });

  it('should reject days supply of 366', () => {
    expect(() => validateInput({ sig: 'test', daysSupply: 366 }))
      .toThrow(ValidationError);
  });

  it('should accept days supply of 365', () => {
    expect(() => validateInput({ sig: 'test', daysSupply: 365 }))
      .not.toThrow();
  });
});
```

---

### Mock External Dependencies

Never make real API calls in tests.

```typescript
import { vi } from 'vitest';
import * as openaiService from '$lib/server/services/openai.service';

vi.mock('$lib/server/services/openai.service', () => ({
  parseSIG: vi.fn().mockResolvedValue({
    dose: 1,
    unit: 'tablet',
    frequency: 1,
    route: 'oral'
  })
}));
```

---

### Write Descriptive Test Names

Test names should describe what they test and expected outcome.

**Good:**
```typescript
test('should return overfill warning when package size exceeds requirement', () => {
  // ...
});
```

**Bad:**
```typescript
test('test1', () => {
  // ...
});
```

---

## Code Organization

### Use Barrel Exports

Create index files to simplify imports.

```typescript
// src/lib/types/index.ts
export * from './prescription.types';
export * from './ndc.types';
export * from './api.types';

// Usage
import { PrescriptionInput, NDCPackage, CalculationResponse } from '$lib/types';
```

---

### Keep Files Focused

One primary export per file, related helpers allowed.

**Good:**
```typescript
// quantity-calculator.ts
export function calculateTotalQuantity() { /* ... */ }

function helperFunction() { /* ... */ } // Internal helper
```

**Bad:**
```typescript
// utils.ts
export function calculateQuantity() { /* ... */ }
export function validateNDC() { /* ... */ }
export function parseDate() { /* ... */ }
export function formatCurrency() { /* ... */ }
// Unrelated functions in one file
```

---

### Use Consistent Naming

Follow naming conventions throughout the project.

```
Services:    rxnorm.service.ts
Logic:       quantity-calculator.ts
Types:       prescription.types.ts
Utils:       retry.ts, error-handler.ts
Components:  PrescriptionForm.svelte
Tests:       quantity-calculator.test.ts
```

---

## Performance Optimization

### Minimize API Calls

Batch requests and cache when appropriate.

```typescript
// Run independent API calls in parallel
const [rxcui, aiContext] = await Promise.all([
  rxnormService.normalizeToRxCUI(drugName),
  openaiService.prepareBatchContext(inputs)
]);
```

---

### Optimize Bundle Size

Import only what you need from libraries.

**Good:**
```typescript
import { onMount } from 'svelte';
```

**Bad:**
```typescript
import * as svelte from 'svelte';
```

---

### Use Lazy Loading

Lazy load components that aren't immediately needed.

```svelte
<script>
  const HeavyComponent = import('./HeavyComponent.svelte');
</script>

{#await HeavyComponent then component}
  <svelte:component this={component.default} />
{/await}
```

---

### Profile Before Optimizing

Use browser dev tools and Vitest benchmarks to identify bottlenecks.

```typescript
import { bench } from 'vitest';

bench('calculate quantity', () => {
  calculateTotalQuantity(sig, 30);
});
```

---

## Security

### Validate All Inputs

Never trust user input.

```typescript
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS vectors
    .slice(0, 500); // Enforce max length
}
```

---

### Use Environment Variables for Secrets

Never hardcode API keys or secrets.

**Good:**
```typescript
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY environment variable not set');
}
```

**Bad:**
```typescript
const apiKey = 'sk-1234567890abcdef'; // Hardcoded secret
```

---

### Sanitize Logs

Remove sensitive data from logs.

```typescript
logger.info('Processing prescription', {
  drugName: input.drugName,
  daysSupply: input.daysSupply
  // Do NOT log patient identifiers
});
```

---

### Use HTTPS for All External Calls

```typescript
const url = process.env.API_URL;
if (!url.startsWith('https://')) {
  throw new Error('API URL must use HTTPS');
}
```

---

## AI Integration

### Validate AI Output

Never trust AI responses without validation.

```typescript
const aiResponse = await openai.chat.completions.create({...});
const content = aiResponse.choices[0]?.message?.content;

if (!content) {
  throw new Error('No response from AI');
}

const parsed = JSON.parse(content);

// Validate schema
if (!isValidParsedSIG(parsed)) {
  throw new Error('AI response does not match expected schema');
}
```

---

### Use Structured Outputs

Prefer JSON mode for predictable AI responses.

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }],
  response_format: { type: 'json_object' }, // Enforce JSON
  temperature: 0.1 // Low temperature for consistency
});
```

---

### Handle AI Failures Gracefully

Always have fallback logic when AI fails.

```typescript
try {
  const aiSelection = await openaiService.selectOptimalNDC(options);
  return aiSelection;
} catch (error) {
  logger.warn('AI selection failed, using deterministic fallback', { error });
  return deterministicSelection(options);
}
```

---

### Monitor AI Costs

Log token usage to track costs.

```typescript
const completion = await openai.chat.completions.create({...});

logger.info('OpenAI API call', {
  promptTokens: completion.usage?.prompt_tokens,
  completionTokens: completion.usage?.completion_tokens,
  totalTokens: completion.usage?.total_tokens
});
```

---

## Summary Checklist

Before committing code, verify:

- [ ] TypeScript strict mode passes
- [ ] All tests pass
- [ ] No linting errors
- [ ] Code formatted with Prettier
- [ ] Functions have single responsibility
- [ ] External dependencies mocked in tests
- [ ] Error handling implemented
- [ ] Logging added for debugging
- [ ] Input validation present
- [ ] No hardcoded secrets
- [ ] API calls have timeouts and retries
- [ ] Code documented where needed

---

## Additional Resources

- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Vitest API](https://vitest.dev/api/)
- [OpenAI Best Practices](https://platform.openai.com/docs/guides/best-practices)

---

**Note:** These best practices should be followed consistently across the codebase. When in doubt, prioritize code clarity and maintainability over cleverness.
