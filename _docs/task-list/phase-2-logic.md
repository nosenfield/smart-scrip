# Phase 2: Business Logic & Calculations

**Document Version:** 1.0
**Last Updated:** 2025-11-11

---

## Overview

This phase implements the core business logic for prescription quantity calculation, NDC matching, package optimization, and input validation. These modules form the calculation engine of the application.

**Dependencies:** [Phase 1: Core Services & API Integration](phase-1-services.md)

**Estimated Effort:** Business logic implementation

---

## Tasks

### 2.1 - Implement Input Validation Logic

**Description:** Create validation functions for all user inputs

**Implementation Steps:**
1. Create `src/lib/server/logic/validation.ts`:
   ```typescript
   import { INPUT_CONSTRAINTS } from '$lib/config/constants';
   import type { PrescriptionInput } from '$lib/types';
   import { ValidationError } from '$lib/server/utils/error-handler';

   export function validatePrescriptionInput(input: PrescriptionInput): void {
     // Validate that either drugName or NDC is provided
     if (!input.drugName && !input.ndc) {
       throw new ValidationError('Either drug name or NDC must be provided');
     }

     // Validate drug name length
     if (input.drugName && input.drugName.length > INPUT_CONSTRAINTS.DRUG_NAME_MAX_LENGTH) {
       throw new ValidationError(
         `Drug name must be ${INPUT_CONSTRAINTS.DRUG_NAME_MAX_LENGTH} characters or less`
       );
     }

     // Validate NDC format (XXXXX-XXXX-XX or XXXXX-XXX-XX)
     if (input.ndc && !isValidNDCFormat(input.ndc)) {
       throw new ValidationError(
         'NDC must be in format XXXXX-XXXX-XX or XXXXX-XXX-XX'
       );
     }

     // Validate SIG
     if (!input.sig || input.sig.trim().length === 0) {
       throw new ValidationError('SIG (prescription directions) is required');
     }

     if (input.sig.length > INPUT_CONSTRAINTS.SIG_MAX_LENGTH) {
       throw new ValidationError(
         `SIG must be ${INPUT_CONSTRAINTS.SIG_MAX_LENGTH} characters or less`
       );
     }

     // Validate days supply
     if (!Number.isInteger(input.daysSupply)) {
       throw new ValidationError('Days supply must be a whole number');
     }

     if (
       input.daysSupply < INPUT_CONSTRAINTS.DAYS_SUPPLY_MIN ||
       input.daysSupply > INPUT_CONSTRAINTS.DAYS_SUPPLY_MAX
     ) {
       throw new ValidationError(
         `Days supply must be between ${INPUT_CONSTRAINTS.DAYS_SUPPLY_MIN} and ${INPUT_CONSTRAINTS.DAYS_SUPPLY_MAX}`
       );
     }
   }

   export function isValidNDCFormat(ndc: string): boolean {
     const patterns = [
       /^\d{5}-\d{4}-\d{2}$/, // 11-digit (5-4-2)
       /^\d{5}-\d{3}-\d{2}$/  // 10-digit (5-3-2)
     ];

     return patterns.some((pattern) => pattern.test(ndc));
   }

   export function sanitizeInput(input: string): string {
     return input.trim().replace(/[<>]/g, '');
   }
   ```
2. Create unit test `tests/unit/validation.test.ts`
3. Test all validation rules
4. Verify error messages

**Acceptance Criteria:**
- All inputs validated according to constraints
- NDC format validation working
- Appropriate error messages
- Input sanitization prevents injection
- Unit tests pass

**Files Created:**
- `src/lib/server/logic/validation.ts`
- `tests/unit/validation.test.ts`

**Reference:** [architecture.md - Input Validation](../architecture.md#input-validation)

---

### 2.2 - Create Quantity Calculator

**Description:** Implement calculation logic for total dispense quantity

**Implementation Steps:**
1. Create `src/lib/server/logic/quantity-calculator.ts`:
   ```typescript
   import type { ParsedSIG } from '$lib/types';
   import { logger } from '$lib/server/utils/logger';

   export interface QuantityResult {
     totalQuantity: number;
     unit: string;
     calculation: {
       dosePerAdministration: number;
       administrationsPerDay: number;
       daysSupply: number;
     };
   }

   export function calculateTotalQuantity(
     sig: ParsedSIG,
     daysSupply: number
   ): QuantityResult {
     logger.info('Calculating total quantity', { sig, daysSupply });

     const dosePerAdministration = sig.dose;
     const administrationsPerDay = sig.frequency;

     // Total quantity = dose × frequency × days
     const totalQuantity = dosePerAdministration * administrationsPerDay * daysSupply;

     logger.info('Quantity calculated', { totalQuantity, unit: sig.unit });

     return {
       totalQuantity,
       unit: sig.unit,
       calculation: {
         dosePerAdministration,
         administrationsPerDay,
         daysSupply
       }
     };
   }

   export function convertUnits(quantity: number, fromUnit: string, toUnit: string): number {
     // Unit conversion matrix
     const conversions: Record<string, Record<string, number>> = {
       tablet: {
         tablet: 1,
         capsule: 1 // Assuming 1:1 for solid dose forms
       },
       capsule: {
         capsule: 1,
         tablet: 1
       },
       ml: {
         ml: 1,
         l: 0.001,
         oz: 0.033814
       },
       l: {
         l: 1,
         ml: 1000,
         oz: 33.814
       },
       // Add more conversions as needed
     };

     const fromLower = fromUnit.toLowerCase();
     const toLower = toUnit.toLowerCase();

     if (fromLower === toLower) {
       return quantity;
     }

     const factor = conversions[fromLower]?.[toLower];
     if (!factor) {
       logger.warn('Unit conversion not supported', { fromUnit, toUnit });
       return quantity; // No conversion available
     }

     return quantity * factor;
   }

   export function roundToDispensableQuantity(quantity: number, unit: string): number {
     // Round to whole units for solid dose forms
     const solidForms = ['tablet', 'capsule', 'pill', 'softgel'];
     if (solidForms.includes(unit.toLowerCase())) {
       return Math.ceil(quantity);
     }

     // Round to 1 decimal place for liquids
     const liquidForms = ['ml', 'l', 'oz'];
     if (liquidForms.includes(unit.toLowerCase())) {
       return Math.round(quantity * 10) / 10;
     }

     // Default: round to 2 decimal places
     return Math.round(quantity * 100) / 100;
   }
   ```
2. Create unit test `tests/unit/quantity-calculator.test.ts`
3. Test various SIG patterns
4. Verify unit conversion logic
5. Test rounding for different unit types

**Acceptance Criteria:**
- Quantity calculation accurate
- Unit conversion working for common units
- Proper rounding for different dose forms
- Calculation details tracked
- Unit tests pass

**Files Created:**
- `src/lib/server/logic/quantity-calculator.ts`
- `tests/unit/quantity-calculator.test.ts`

**Reference:** [architecture.md - Business Logic Layer](../architecture.md#business-logic-layer)

---

### 2.3 - Implement NDC Matcher

**Description:** Create logic to match required quantity with available NDC packages

**Implementation Steps:**
1. Create `src/lib/server/logic/ndc-matcher.ts`:
   ```typescript
   import type { NDCPackage, SelectedNDC, Warning } from '$lib/types';
   import { WARNING_TYPES } from '$lib/config/constants';
   import { logger } from '$lib/server/utils/logger';

   export interface MatchResult {
     matches: SelectedNDC[];
     warnings: Warning[];
   }

   export function findBestNDCMatches(
     requiredQuantity: number,
     requiredUnit: string,
     availableNDCs: NDCPackage[]
   ): MatchResult {
     logger.info('Finding best NDC matches', { requiredQuantity, requiredUnit, count: availableNDCs.length });

     const warnings: Warning[] = [];

     // Filter to active NDCs only
     const activeNDCs = availableNDCs.filter((ndc) => ndc.status === 'active');

     if (activeNDCs.length === 0 && availableNDCs.length > 0) {
       warnings.push({
         type: WARNING_TYPES.INACTIVE_NDC,
         message: 'Only inactive NDCs found. Contact prescriber for alternatives.',
         severity: 'error'
       });
       return { matches: [], warnings };
     }

     if (activeNDCs.length === 0) {
       warnings.push({
         type: WARNING_TYPES.NO_EXACT_MATCH,
         message: 'No matching NDCs found for this medication.',
         severity: 'error'
       });
       return { matches: [], warnings };
     }

     // Filter by matching unit
     const matchingUnitNDCs = activeNDCs.filter(
       (ndc) => ndc.packageUnit.toLowerCase() === requiredUnit.toLowerCase()
     );

     if (matchingUnitNDCs.length === 0) {
       warnings.push({
         type: WARNING_TYPES.NO_EXACT_MATCH,
         message: `No packages found with unit: ${requiredUnit}`,
         severity: 'warning'
       });
       // Fallback to all active NDCs
       return findClosestMatch(requiredQuantity, activeNDCs, warnings);
     }

     // Try to find exact match
     const exactMatch = matchingUnitNDCs.find(
       (ndc) => ndc.packageSize === requiredQuantity
     );

     if (exactMatch) {
       logger.info('Exact NDC match found', { ndc: exactMatch.ndc });
       return {
         matches: [
           {
             ndc: exactMatch.ndc,
             quantity: requiredQuantity,
             packageCount: 1,
             overfill: 0,
             underfill: 0
           }
         ],
         warnings
       };
     }

     // Find best combination
     return findOptimalCombination(requiredQuantity, matchingUnitNDCs, warnings);
   }

   function findClosestMatch(
     requiredQuantity: number,
     availableNDCs: NDCPackage[],
     warnings: Warning[]
   ): MatchResult {
     // Sort by package size
     const sorted = [...availableNDCs].sort((a, b) => a.packageSize - b.packageSize);

     // Find smallest package that meets or exceeds requirement
     const bestMatch = sorted.find((ndc) => ndc.packageSize >= requiredQuantity);

     if (bestMatch) {
       const overfill = bestMatch.packageSize - requiredQuantity;
       if (overfill > 0) {
         warnings.push({
           type: WARNING_TYPES.OVERFILL,
           message: `Overfill of ${overfill} ${bestMatch.packageUnit}`,
           severity: 'warning'
         });
       }

       return {
         matches: [
           {
             ndc: bestMatch.ndc,
             quantity: bestMatch.packageSize,
             packageCount: 1,
             overfill
           }
         ],
         warnings
       };
     }

     // No single package large enough, need multiple
     warnings.push({
       type: WARNING_TYPES.MULTIPLE_PACKAGES,
       message: 'Multiple packages required to meet quantity',
       severity: 'info'
     });

     return findOptimalCombination(requiredQuantity, availableNDCs, warnings);
   }

   function findOptimalCombination(
     requiredQuantity: number,
     availableNDCs: NDCPackage[],
     warnings: Warning[]
   ): MatchResult {
     // Sort by package size (largest first)
     const sorted = [...availableNDCs].sort((a, b) => b.packageSize - a.packageSize);

     const selected: SelectedNDC[] = [];
     let remainingQuantity = requiredQuantity;

     for (const ndc of sorted) {
       if (remainingQuantity <= 0) break;

       const packagesNeeded = Math.floor(remainingQuantity / ndc.packageSize);
       if (packagesNeeded > 0) {
         selected.push({
           ndc: ndc.ndc,
           quantity: ndc.packageSize * packagesNeeded,
           packageCount: packagesNeeded
         });
         remainingQuantity -= ndc.packageSize * packagesNeeded;
       }
     }

     // Handle any remaining quantity (underfill)
     if (remainingQuantity > 0) {
       // Add one more package of smallest size
       const smallest = sorted[sorted.length - 1];
       const existingIndex = selected.findIndex((s) => s.ndc === smallest.ndc);

       if (existingIndex >= 0) {
         selected[existingIndex].packageCount += 1;
         selected[existingIndex].quantity += smallest.packageSize;
       } else {
         selected.push({
           ndc: smallest.ndc,
           quantity: smallest.packageSize,
           packageCount: 1
         });
       }

       const overfill = smallest.packageSize - remainingQuantity;
       warnings.push({
         type: WARNING_TYPES.OVERFILL,
         message: `Overfill of ${overfill} ${smallest.packageUnit}`,
         severity: 'info'
       });
     }

     return { matches: selected, warnings };
   }
   ```
2. Create unit test `tests/unit/ndc-matcher.test.ts`
3. Test exact match scenarios
4. Test multi-package combinations
5. Test warning generation

**Acceptance Criteria:**
- Exact matches prioritized
- Multi-package optimization working
- Overfill/underfill detection
- Appropriate warnings generated
- Unit tests pass

**Files Created:**
- `src/lib/server/logic/ndc-matcher.ts`
- `tests/unit/ndc-matcher.test.ts`

**Reference:** [architecture.md - Business Logic Layer](../architecture.md#business-logic-layer)

---

### 2.4 - Create Package Optimizer

**Description:** Implement advanced package selection optimization

**Implementation Steps:**
1. Create `src/lib/server/logic/package-optimizer.ts`:
   ```typescript
   import type { NDCPackage, SelectedNDC } from '$lib/types';
   import { logger } from '$lib/server/utils/logger';

   export interface OptimizationCriteria {
     minimizePackages?: boolean;
     minimizeWaste?: boolean;
     allowOverfill?: boolean;
     maxOverfillPercent?: number;
   }

   export interface OptimizationResult {
     packages: SelectedNDC[];
     totalQuantity: number;
     wasteQuantity: number;
     packageCount: number;
     score: number; // Lower is better
   }

   export function optimizePackageSelection(
     requiredQuantity: number,
     availablePackages: NDCPackage[],
     criteria: OptimizationCriteria = {}
   ): OptimizationResult {
     const {
       minimizePackages = true,
       minimizeWaste = true,
       allowOverfill = true,
       maxOverfillPercent = 20
     } = criteria;

     logger.info('Optimizing package selection', {
       requiredQuantity,
       criteria
     });

     const activePackages = availablePackages.filter((pkg) => pkg.status === 'active');

     if (activePackages.length === 0) {
       return {
         packages: [],
         totalQuantity: 0,
         wasteQuantity: 0,
         packageCount: 0,
         score: Infinity
       };
     }

     // Generate all possible combinations
     const combinations = generateCombinations(requiredQuantity, activePackages, maxOverfillPercent);

     if (combinations.length === 0) {
       // Fallback to simplest solution
       return selectFallbackPackage(requiredQuantity, activePackages);
     }

     // Score each combination
     const scoredCombinations = combinations.map((combo) => {
       const wasteScore = minimizeWaste ? combo.wasteQuantity : 0;
       const packageScore = minimizePackages ? combo.packageCount * 10 : 0;
       const score = wasteScore + packageScore;

       return { ...combo, score };
     });

     // Sort by score (lower is better)
     scoredCombinations.sort((a, b) => a.score - b.score);

     logger.info('Optimal package selection found', {
       result: scoredCombinations[0]
     });

     return scoredCombinations[0];
   }

   function generateCombinations(
     requiredQuantity: number,
     packages: NDCPackage[],
     maxOverfillPercent: number
   ): OptimizationResult[] {
     const results: OptimizationResult[] = [];
     const maxOverfill = (requiredQuantity * maxOverfillPercent) / 100;

     // Try single package solutions
     for (const pkg of packages) {
       if (pkg.packageSize >= requiredQuantity) {
         const waste = pkg.packageSize - requiredQuantity;
         if (waste <= maxOverfill) {
           results.push({
             packages: [
               {
                 ndc: pkg.ndc,
                 quantity: pkg.packageSize,
                 packageCount: 1,
                 overfill: waste
               }
             ],
             totalQuantity: pkg.packageSize,
             wasteQuantity: waste,
             packageCount: 1,
             score: 0
           });
         }
       }
     }

     // Try two-package combinations
     for (let i = 0; i < packages.length; i++) {
       for (let j = i; j < packages.length; j++) {
         const result = tryTwoPackageCombination(
           packages[i],
           packages[j],
           requiredQuantity,
           maxOverfill
         );
         if (result) {
           results.push(result);
         }
       }
     }

     return results;
   }

   function tryTwoPackageCombination(
     pkg1: NDCPackage,
     pkg2: NDCPackage,
     requiredQuantity: number,
     maxOverfill: number
   ): OptimizationResult | null {
     // Try different counts of each package
     for (let count1 = 0; count1 <= 10; count1++) {
       for (let count2 = 0; count2 <= 10; count2++) {
         if (count1 === 0 && count2 === 0) continue;

         const total = count1 * pkg1.packageSize + count2 * pkg2.packageSize;
         if (total >= requiredQuantity && total - requiredQuantity <= maxOverfill) {
           const packages: SelectedNDC[] = [];

           if (count1 > 0) {
             packages.push({
               ndc: pkg1.ndc,
               quantity: pkg1.packageSize * count1,
               packageCount: count1
             });
           }

           if (count2 > 0) {
             packages.push({
               ndc: pkg2.ndc,
               quantity: pkg2.packageSize * count2,
               packageCount: count2
             });
           }

           return {
             packages,
             totalQuantity: total,
             wasteQuantity: total - requiredQuantity,
             packageCount: count1 + count2,
             score: 0
           };
         }
       }
     }

     return null;
   }

   function selectFallbackPackage(
     requiredQuantity: number,
     packages: NDCPackage[]
   ): OptimizationResult {
     // Select largest package available
     const largest = packages.reduce((max, pkg) =>
       pkg.packageSize > max.packageSize ? pkg : max
     );

     const count = Math.ceil(requiredQuantity / largest.packageSize);
     const total = count * largest.packageSize;

     return {
       packages: [
         {
           ndc: largest.ndc,
           quantity: total,
           packageCount: count,
           overfill: total - requiredQuantity
         }
       ],
       totalQuantity: total,
       wasteQuantity: total - requiredQuantity,
       packageCount: count,
       score: Infinity
     };
   }
   ```
2. Create unit test `tests/unit/package-optimizer.test.ts`
3. Test optimization algorithms
4. Verify scoring logic

**Acceptance Criteria:**
- Optimization considers multiple criteria
- Single and multi-package solutions explored
- Scoring algorithm prioritizes efficiently
- Fallback logic handles edge cases
- Unit tests pass

**Files Created:**
- `src/lib/server/logic/package-optimizer.ts`
- `tests/unit/package-optimizer.test.ts`

**Reference:** [architecture.md - Business Logic Layer](../architecture.md#business-logic-layer)

---

### 2.5 - Create Business Logic Integration Tests

**Description:** Implement integration tests for business logic modules

**Implementation Steps:**
1. Create `tests/integration/logic.test.ts`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { calculateTotalQuantity } from '$lib/server/logic/quantity-calculator';
   import { findBestNDCMatches } from '$lib/server/logic/ndc-matcher';
   import { optimizePackageSelection } from '$lib/server/logic/package-optimizer';
   import type { ParsedSIG, NDCPackage } from '$lib/types';

   describe('Business Logic Integration', () => {
     it('should calculate quantity and find matching NDC', () => {
       const sig: ParsedSIG = {
         dose: 1,
         unit: 'tablet',
         frequency: 2,
         route: 'oral'
       };

       const packages: NDCPackage[] = [
         {
           ndc: '12345-678-90',
           packageSize: 30,
           packageUnit: 'tablet',
           status: 'active'
         },
         {
           ndc: '12345-678-91',
           packageSize: 100,
           packageUnit: 'tablet',
           status: 'active'
         }
       ];

       const quantity = calculateTotalQuantity(sig, 30);
       expect(quantity.totalQuantity).toBe(60);

       const matches = findBestNDCMatches(
         quantity.totalQuantity,
         quantity.unit,
         packages
       );

       expect(matches.matches.length).toBeGreaterThan(0);
     });

     // Add more integration tests
   });
   ```
2. Test end-to-end workflows
3. Verify module interactions

**Acceptance Criteria:**
- Integration tests cover complete workflows
- Module interactions tested
- All tests pass

**Files Created:**
- `tests/integration/logic.test.ts`

**Reference:** [architecture.md - Testing Strategy](../architecture.md#testing-strategy)

---

## Phase Completion Criteria

All tasks (2.1 - 2.5) completed and verified:
- [ ] Input validation logic implemented
- [ ] Quantity calculator created
- [ ] NDC matcher implemented
- [ ] Package optimizer created
- [ ] Business logic integration tests passing

**Next Phase:** [Phase 3: API Routes & Orchestration](phase-3-api.md)
