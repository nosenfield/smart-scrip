# Phase 5: Testing & Quality Assurance

**Document Version:** 1.0
**Last Updated:** 2025-11-11

---

## Overview

This phase focuses on comprehensive testing, code quality improvements, and validation of the application against requirements. Includes unit tests, integration tests, and end-to-end testing setup.

**Dependencies:** [Phase 4: Frontend UI](phase-4-frontend.md)

**Estimated Effort:** Testing and QA

---

## Tasks

### 5.1 - Complete Unit Test Coverage

**Description:** Ensure all modules have comprehensive unit tests

**Implementation Steps:**
1. Review existing unit tests from previous phases
2. Add missing test cases for edge scenarios
3. Achieve target code coverage (80%+)
4. Run coverage report:
   ```bash
   npm run test:coverage
   ```
5. Review coverage report and add tests for uncovered code

**Test Categories:**
- Utility functions (retry, error handling, validation)
- Business logic (quantity calculator, NDC matcher, optimizer)
- Service mocks (OpenAI, RxNorm, FDA NDC)

**Acceptance Criteria:**
- Unit test coverage above 80%
- All edge cases tested
- Mock external dependencies
- Tests run quickly (<10 seconds)
- All tests pass

**Files Modified:**
- Various test files in `tests/unit/`

**Reference:** [architecture.md - Testing Strategy](../architecture.md#testing-strategy)

---

### 5.2 - Create End-to-End Test Suite

**Description:** Implement Playwright tests for critical user workflows

**Implementation Steps:**
1. Configure Playwright (should be installed from Phase 0)
2. Create `tests/e2e/prescription-flow.spec.ts`:
   ```typescript
   import { test, expect } from '@playwright/test';

   test.describe('Prescription Calculation Flow', () => {
     test('should calculate NDC for valid drug name', async ({ page }) => {
       await page.goto('/');

       // Verify page loaded
       await expect(page.locator('h1')).toContainText('NDC Packaging');

       // Fill form
       await page.fill('input[name="drugName"]', 'Lisinopril 10mg tablet');
       await page.fill('input[name="sig"]', 'Take 1 tablet by mouth daily');
       await page.fill('input[name="daysSupply"]', '30');

       // Submit form
       await page.click('button[type="submit"]');

       // Wait for results
       await expect(page.locator('.results-display')).toBeVisible({
         timeout: 10000
       });

       // Verify results contain expected data
       await expect(page.locator('.drug-info')).toContainText('Lisinopril');
       await expect(page.locator('.quantity-summary')).toBeVisible();
     });

     test('should show validation error for invalid input', async ({ page }) => {
       await page.goto('/');

       // Submit without required fields
       await page.click('button[type="submit"]');

       // Should show validation errors
       await expect(page.locator('.error-message')).toBeVisible();
     });

     test('should display warnings when NDC has overfill', async ({ page }) => {
       await page.goto('/');

       // Fill form with scenario that produces overfill
       await page.fill('input[name="drugName"]', 'Test Drug');
       await page.fill('input[name="sig"]', 'Take 1 tablet daily');
       await page.fill('input[name="daysSupply"]', '25');

       await page.click('button[type="submit"]');

       await page.waitForSelector('.results-display', { timeout: 10000 });

       // Check for warning badges
       const warnings = page.locator('.warning-badge');
       await expect(warnings).toBeVisible();
     });
   });
   ```
3. Add more E2E test scenarios
4. Configure test environment variables
5. Run E2E tests:
   ```bash
   npx playwright test
   ```

**Acceptance Criteria:**
- E2E tests cover main user flows
- Tests use realistic data
- Assertions verify UI state
- Tests can run in CI/CD
- All E2E tests pass

**Files Created:**
- `tests/e2e/prescription-flow.spec.ts`
- `playwright.config.ts` (if not exists)

**Reference:** [architecture.md - End-to-End Testing](../architecture.md#end-to-end-testing)

---

### 5.3 - Create Test Data Fixtures

**Description:** Create reusable test data for consistent testing

**Implementation Steps:**
1. Create `tests/fixtures/prescriptions.ts`:
   ```typescript
   import type { CalculationRequest, CalculationResponse } from '$lib/types';

   export const validPrescriptions: CalculationRequest[] = [
     {
       drugName: 'Lisinopril 10mg tablet',
       sig: 'Take 1 tablet by mouth once daily',
       daysSupply: 30
     },
     {
       drugName: 'Metformin 500mg tablet',
       sig: 'Take 1 tablet by mouth twice daily with meals',
       daysSupply: 90
     },
     {
       ndc: '00071-0304-23',
       sig: 'Take 2 tablets by mouth every 6 hours as needed for pain',
       daysSupply: 7
     }
   ];

   export const invalidPrescriptions = [
     {
       drugName: '',
       sig: '',
       daysSupply: 0
     },
     {
       drugName: 'Test',
       sig: 'Take daily',
       daysSupply: -10
     },
     {
       drugName: 'Test',
       sig: 'Take daily',
       daysSupply: 500 // Exceeds max
     }
   ];

   export const mockNDCPackages = [
     {
       ndc: '12345-678-90',
       packageSize: 30,
       packageUnit: 'tablet',
       status: 'active' as const,
       manufacturer: 'Test Pharma'
     },
     {
       ndc: '12345-678-91',
       packageSize: 100,
       packageUnit: 'tablet',
       status: 'active' as const,
       manufacturer: 'Test Pharma'
     }
   ];

   export const mockSuccessResponse: CalculationResponse = {
     success: true,
     data: {
       rxcui: '314076',
       normalizedDrug: {
         name: 'Lisinopril 10mg tablet',
         strength: '10mg',
         doseForm: 'tablet'
       },
       parsedSIG: {
         dose: 1,
         unit: 'tablet',
         frequency: 1,
         route: 'oral'
       },
       selectedNDCs: [
         {
           ndc: '12345-678-90',
           quantity: 30,
           packageCount: 1
         }
       ],
       totalQuantity: 30,
       warnings: []
     }
   };
   ```
2. Create `tests/fixtures/api-responses.ts` for mocked API responses
3. Use fixtures in tests to ensure consistency

**Acceptance Criteria:**
- Test fixtures cover common scenarios
- Fixtures match TypeScript types
- Reusable across test suites
- Edge cases included

**Files Created:**
- `tests/fixtures/prescriptions.ts`
- `tests/fixtures/api-responses.ts`

**Directories Created:**
- `tests/fixtures/`

**Reference:** [architecture.md - Testing Strategy](../architecture.md#testing-strategy)

---

### 5.4 - Implement API Mocking for Tests

**Description:** Setup API mocking to avoid external API calls during tests

**Implementation Steps:**
1. Install MSW (Mock Service Worker) for API mocking:
   ```bash
   npm install -D msw
   ```
2. Create `tests/mocks/handlers.ts`:
   ```typescript
   import { http, HttpResponse } from 'msw';
   import { mockSuccessResponse } from '../fixtures/prescriptions';

   export const handlers = [
     // Mock OpenAI API
     http.post('https://api.openai.com/v1/chat/completions', () => {
       return HttpResponse.json({
         choices: [
           {
             message: {
               content: JSON.stringify({
                 dose: 1,
                 unit: 'tablet',
                 frequency: 1,
                 route: 'oral',
                 specialInstructions: ''
               })
             }
           }
         ]
       });
     }),

     // Mock RxNorm API
     http.get('https://rxnav.nlm.nih.gov/REST/rxcui.json', () => {
       return HttpResponse.json({
         idGroup: {
           rxnormId: ['314076']
         }
       });
     }),

     // Mock FDA NDC API
     http.get('https://api.fda.gov/drug/ndc.json', () => {
       return HttpResponse.json({
         results: [
           {
             product_ndc: '12345-678',
             generic_name: 'Test Drug',
             active_ingredients: [{ name: 'Test', strength: '10mg' }],
             packaging: [
               { package_ndc: '12345-678-90', description: '30 TABLET in 1 BOTTLE' }
             ],
             marketing_status: 'Active'
           }
         ]
       });
     }),

     // Mock local API
     http.post('/api/calculate', () => {
       return HttpResponse.json(mockSuccessResponse);
     })
   ];
   ```
3. Create `tests/mocks/server.ts`:
   ```typescript
   import { setupServer } from 'msw/node';
   import { handlers } from './handlers';

   export const server = setupServer(...handlers);
   ```
4. Configure test setup file to use MSW
5. Update tests to use mocked APIs

**Acceptance Criteria:**
- API mocking configured for all external APIs
- Tests don't make real API calls
- Mocked responses realistic
- Easy to customize per test

**Files Created:**
- `tests/mocks/handlers.ts`
- `tests/mocks/server.ts`

**Directories Created:**
- `tests/mocks/`

**Reference:** [architecture.md - Testing Strategy](../architecture.md#testing-strategy)

---

### 5.5 - Code Quality and Linting

**Description:** Ensure code quality standards are met

**Implementation Steps:**
1. Run full linting check:
   ```bash
   npm run lint
   ```
2. Fix any linting errors
3. Run format check:
   ```bash
   npm run format:check
   ```
4. Auto-format all files:
   ```bash
   npm run format
   ```
5. Run TypeScript type checking:
   ```bash
   npm run check
   ```
6. Fix all type errors

**Acceptance Criteria:**
- No linting errors
- All files formatted consistently
- No TypeScript errors
- Code meets style guidelines

**Reference:** [architecture.md - Development Tools](../architecture.md#development-tools)

---

### 5.6 - Performance Testing

**Description:** Test application performance against requirements

**Implementation Steps:**
1. Create `tests/performance/response-time.test.ts`:
   ```typescript
   import { describe, it, expect } from 'vitest';

   describe('Performance Tests', () => {
     it('should complete calculation within 5 seconds', async () => {
       const startTime = Date.now();

       const response = await fetch('/api/calculate', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           drugName: 'Lisinopril 10mg tablet',
           sig: 'Take 1 tablet daily',
           daysSupply: 30
         })
       });

       const endTime = Date.now();
       const duration = endTime - startTime;

       expect(response.ok).toBe(true);
       expect(duration).toBeLessThan(5000); // 5 seconds max
     }, 10000); // 10 second test timeout

     // Add more performance tests
   });
   ```
2. Test with various payload sizes
3. Document performance metrics
4. Identify bottlenecks if targets not met

**Acceptance Criteria:**
- Response time measured
- Performance documented
- Bottlenecks identified (if any)
- Results logged

**Files Created:**
- `tests/performance/response-time.test.ts`

**Directories Created:**
- `tests/performance/`

**Reference:** [architecture.md - Performance Requirements](../architecture.md#performance-requirements)

---

### 5.7 - Accessibility Testing

**Description:** Ensure UI meets accessibility standards

**Implementation Steps:**
1. Install axe-core for accessibility testing:
   ```bash
   npm install -D @axe-core/playwright
   ```
2. Create `tests/e2e/accessibility.spec.ts`:
   ```typescript
   import { test, expect } from '@playwright/test';
   import AxeBuilder from '@axe-core/playwright';

   test.describe('Accessibility Tests', () => {
     test('should not have accessibility violations', async ({ page }) => {
       await page.goto('/');

       const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

       expect(accessibilityScanResults.violations).toEqual([]);
     });

     test('form should be keyboard navigable', async ({ page }) => {
       await page.goto('/');

       // Tab through form fields
       await page.keyboard.press('Tab');
       await expect(page.locator('input[name="drugName"]')).toBeFocused();

       await page.keyboard.press('Tab');
       await page.keyboard.press('Tab'); // Skip OR divider
       await expect(page.locator('input[name="ndc"]')).toBeFocused();
     });
   });
   ```
3. Run accessibility tests
4. Fix any violations

**Acceptance Criteria:**
- No critical accessibility violations
- Keyboard navigation works
- Screen reader compatibility
- ARIA labels present

**Files Created:**
- `tests/e2e/accessibility.spec.ts`

**Reference:** [architecture.md - User Experience & Design](../architecture.md#user-experience--design-considerations)

---

### 5.8 - Create Test Documentation

**Description:** Document testing strategy and procedures

**Implementation Steps:**
1. Create `_docs/testing.md`:
   ```markdown
   # Testing Documentation

   ## Testing Strategy

   This project uses a multi-layered testing approach:

   ### Unit Tests
   - Location: `tests/unit/`
   - Framework: Vitest
   - Run: `npm test`
   - Coverage target: 80%+

   ### Integration Tests
   - Location: `tests/integration/`
   - Framework: Vitest
   - Mocked external APIs

   ### End-to-End Tests
   - Location: `tests/e2e/`
   - Framework: Playwright
   - Run: `npx playwright test`

   ## Running Tests

   ```bash
   # Run all unit tests
   npm test

   # Run tests in watch mode
   npm run test:watch

   # Run with coverage
   npm run test:coverage

   # Run E2E tests
   npx playwright test

   # Run E2E tests in UI mode
   npx playwright test --ui
   ```

   ## Test Data

   Test fixtures are located in `tests/fixtures/` and provide:
   - Valid prescription examples
   - Invalid input scenarios
   - Mocked API responses
   - Sample NDC packages

   ## CI/CD Integration

   Tests run automatically on:
   - Every commit (unit tests)
   - Pull requests (full suite)
   - Before deployment (full suite + E2E)

   ## Writing Tests

   Guidelines:
   - Follow AAA pattern (Arrange, Act, Assert)
   - Use descriptive test names
   - Test edge cases
   - Mock external dependencies
   - Maintain test fixtures
   ```

**Acceptance Criteria:**
- Testing documentation complete
- Commands documented
- Guidelines provided
- Examples included

**Files Created:**
- `_docs/testing.md`

**Reference:** [architecture.md - Testing Strategy](../architecture.md#testing-strategy)

---

## Phase Completion Criteria

All tasks (5.1 - 5.8) completed and verified:
- [ ] Unit test coverage above 80%
- [ ] E2E test suite implemented
- [ ] Test fixtures created
- [ ] API mocking configured
- [ ] Code quality checks pass
- [ ] Performance tested
- [ ] Accessibility validated
- [ ] Testing documentation complete

**Next Phase:** [Phase 6: Deployment & DevOps](phase-6-deployment.md)
