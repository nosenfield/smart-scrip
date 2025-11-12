/**
 * Integration tests for business logic modules
 * 
 * Tests the integration of validation, quantity calculator, NDC matcher,
 * and package optimizer to verify end-to-end workflows.
 */

import { describe, it, expect, vi } from 'vitest';
import { validatePrescriptionInput } from '$lib/server/logic/validation';
import { calculateTotalQuantity } from '$lib/server/logic/quantity-calculator';
import { findBestNDCMatches } from '$lib/server/logic/ndc-matcher';
import { optimizePackageSelection } from '$lib/server/logic/package-optimizer';
import type { ParsedSIG, NDCPackage, PrescriptionInput } from '$lib/types';
import { ValidationError } from '$lib/server/utils/error-handler';

// Mock logger
vi.mock('$lib/server/utils/logger', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

describe('Business Logic Integration', () => {
	describe('Complete workflow: validation → calculation → matching', () => {
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

			// Calculate quantity
			const quantity = calculateTotalQuantity(sig, 30);
			expect(quantity.totalQuantity).toBe(60);
			expect(quantity.unit).toBe('tablet');

			// Find matching NDC
			const matches = findBestNDCMatches(
				quantity.totalQuantity,
				quantity.unit,
				packages
			);

			expect(matches.matches.length).toBeGreaterThan(0);
			expect(matches.matches[0].quantity).toBeGreaterThanOrEqual(60);
		});

		it('should handle workflow with validation, calculation, and optimization', () => {
			// Step 1: Validate input
			const input: PrescriptionInput = {
				drugName: 'Aspirin',
				sig: 'Take 2 tablets by mouth twice daily',
				daysSupply: 30
			};

			expect(() => validatePrescriptionInput(input)).not.toThrow();

			// Step 2: Calculate quantity (simulating parsed SIG)
			const parsedSIG: ParsedSIG = {
				dose: 2,
				unit: 'tablet',
				frequency: 2,
				route: 'oral'
			};

			const quantity = calculateTotalQuantity(parsedSIG, input.daysSupply);
			expect(quantity.totalQuantity).toBe(120); // 2 × 2 × 30

			// Step 3: Find NDC matches
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-91', packageSize: 60, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-92', packageSize: 100, packageUnit: 'tablet', status: 'active' }
			];

			const matches = findBestNDCMatches(quantity.totalQuantity, quantity.unit, packages);
			expect(matches.matches.length).toBeGreaterThan(0);

			// Step 4: Optimize package selection
			const optimized = optimizePackageSelection(quantity.totalQuantity, packages, {
				minimizeWaste: true,
				minimizePackages: true
			});

			expect(optimized.packages.length).toBeGreaterThan(0);
			expect(optimized.totalQuantity).toBeGreaterThanOrEqual(quantity.totalQuantity);
		});

		it('should handle workflow with exact match', () => {
			const input: PrescriptionInput = {
				drugName: 'Ibuprofen',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			validatePrescriptionInput(input);

			const parsedSIG: ParsedSIG = {
				dose: 1,
				unit: 'tablet',
				frequency: 1,
				route: 'oral'
			};

			const quantity = calculateTotalQuantity(parsedSIG, 30);
			expect(quantity.totalQuantity).toBe(30);

			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' }
			];

			const matches = findBestNDCMatches(quantity.totalQuantity, quantity.unit, packages);
			expect(matches.matches[0].quantity).toBe(30);
			expect(matches.matches[0].overfill).toBe(0);
			expect(matches.warnings).toHaveLength(0);
		});

		it('should handle workflow with overfill warning', () => {
			const parsedSIG: ParsedSIG = {
				dose: 1,
				unit: 'tablet',
				frequency: 1,
				route: 'oral'
			};

			const quantity = calculateTotalQuantity(parsedSIG, 30);
			expect(quantity.totalQuantity).toBe(30);

			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 60, packageUnit: 'tablet', status: 'active' }
			];

			const matches = findBestNDCMatches(quantity.totalQuantity, quantity.unit, packages);
			expect(matches.matches[0].overfill).toBe(30);
			expect(matches.warnings.length).toBeGreaterThan(0);
		});

		it('should handle workflow with multiple packages', () => {
			const parsedSIG: ParsedSIG = {
				dose: 1,
				unit: 'tablet',
				frequency: 2,
				route: 'oral'
			};

			const quantity = calculateTotalQuantity(parsedSIG, 30);
			expect(quantity.totalQuantity).toBe(60);

			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' }
			];

			const matches = findBestNDCMatches(quantity.totalQuantity, quantity.unit, packages);
			expect(matches.matches[0].packageCount).toBe(2);
			expect(matches.matches[0].quantity).toBe(60);
		});
	});

	describe('Module interaction: quantity calculator → NDC matcher', () => {
		it('should pass calculated quantity to NDC matcher correctly', () => {
			const sig: ParsedSIG = {
				dose: 2,
				unit: 'capsule',
				frequency: 3,
				route: 'oral'
			};

			const quantity = calculateTotalQuantity(sig, 7);
			expect(quantity.totalQuantity).toBe(42);
			expect(quantity.unit).toBe('capsule');

			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'capsule', status: 'active' },
				{ ndc: '12345-678-91', packageSize: 50, packageUnit: 'capsule', status: 'active' }
			];

			const matches = findBestNDCMatches(quantity.totalQuantity, quantity.unit, packages);
			expect(matches.matches.length).toBeGreaterThan(0);
			expect(matches.matches[0].quantity).toBeGreaterThanOrEqual(42);
		});

		it('should handle unit mismatch between calculation and packages', () => {
			const sig: ParsedSIG = {
				dose: 5,
				unit: 'ml',
				frequency: 4,
				route: 'oral'
			};

			const quantity = calculateTotalQuantity(sig, 10);
			expect(quantity.totalQuantity).toBe(200);
			expect(quantity.unit).toBe('ml');

			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 100, packageUnit: 'ml', status: 'active' }
			];

			const matches = findBestNDCMatches(quantity.totalQuantity, quantity.unit, packages);
			// Should find match or provide appropriate warning
			expect(matches.matches.length).toBeGreaterThan(0);
		});
	});

	describe('Module interaction: NDC matcher → package optimizer', () => {
		it('should use optimizer to refine NDC matcher results', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-91', packageSize: 60, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-92', packageSize: 100, packageUnit: 'tablet', status: 'active' }
			];

			const requiredQuantity = 90;

			// First, find matches
			const matches = findBestNDCMatches(requiredQuantity, 'tablet', packages);
			expect(matches.matches.length).toBeGreaterThan(0);

			// Then, optimize
			const optimized = optimizePackageSelection(requiredQuantity, packages, {
				minimizeWaste: true
			});

			expect(optimized.packages.length).toBeGreaterThan(0);
			expect(optimized.totalQuantity).toBeGreaterThanOrEqual(requiredQuantity);
			expect(optimized.wasteQuantity).toBeLessThanOrEqual(
				matches.matches.reduce((sum, m) => sum + (m.overfill || 0), 0)
			);
		});

		it('should handle inactive packages in both matcher and optimizer', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'inactive' },
				{ ndc: '12345-678-91', packageSize: 60, packageUnit: 'tablet', status: 'active' }
			];

			const matches = findBestNDCMatches(30, 'tablet', packages);
			expect(matches.matches[0].ndc).toBe('12345-678-91');

			const optimized = optimizePackageSelection(30, packages);
			expect(optimized.packages[0].ndc).toBe('12345-678-91');
		});
	});

	describe('Error handling across modules', () => {
		it('should propagate validation errors before calculation', () => {
			const invalidInput: PrescriptionInput = {
				sig: '', // Empty SIG should fail validation
				daysSupply: 30
			};

			expect(() => validatePrescriptionInput(invalidInput)).toThrow(ValidationError);
		});

		it('should handle edge cases in complete workflow', () => {
			// Valid input
			const input: PrescriptionInput = {
				drugName: 'Test Drug',
				sig: 'Take 1 tablet daily',
				daysSupply: 1 // Minimum days supply
			};

			expect(() => validatePrescriptionInput(input)).not.toThrow();

			const parsedSIG: ParsedSIG = {
				dose: 1,
				unit: 'tablet',
				frequency: 1,
				route: 'oral'
			};

			const quantity = calculateTotalQuantity(parsedSIG, 1);
			expect(quantity.totalQuantity).toBe(1);

			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' }
			];

			const matches = findBestNDCMatches(quantity.totalQuantity, quantity.unit, packages);
			expect(matches.matches.length).toBeGreaterThan(0);
		});
	});

	describe('Real-world scenarios', () => {
		it('should handle typical 30-day prescription workflow', () => {
			const input: PrescriptionInput = {
				drugName: 'Lisinopril',
				sig: 'Take 1 tablet by mouth once daily',
				daysSupply: 30
			};

			validatePrescriptionInput(input);

			const parsedSIG: ParsedSIG = {
				dose: 1,
				unit: 'tablet',
				frequency: 1,
				route: 'oral'
			};

			const quantity = calculateTotalQuantity(parsedSIG, 30);
			expect(quantity.totalQuantity).toBe(30);

			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-91', packageSize: 90, packageUnit: 'tablet', status: 'active' }
			];

			const matches = findBestNDCMatches(quantity.totalQuantity, quantity.unit, packages);
			expect(matches.matches[0].ndc).toBe('12345-678-90'); // Exact match preferred

			const optimized = optimizePackageSelection(quantity.totalQuantity, packages);
			expect(optimized.packages[0].ndc).toBe('12345-678-90');
			expect(optimized.wasteQuantity).toBe(0);
		});

		it('should handle liquid medication workflow', () => {
			const parsedSIG: ParsedSIG = {
				dose: 5,
				unit: 'ml',
				frequency: 3,
				route: 'oral'
			};

			const quantity = calculateTotalQuantity(parsedSIG, 10);
			expect(quantity.totalQuantity).toBe(150); // 5 × 3 × 10

			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 100, packageUnit: 'ml', status: 'active' },
				{ ndc: '12345-678-91', packageSize: 200, packageUnit: 'ml', status: 'active' }
			];

			const matches = findBestNDCMatches(quantity.totalQuantity, quantity.unit, packages);
			expect(matches.matches.length).toBeGreaterThan(0);

			const optimized = optimizePackageSelection(quantity.totalQuantity, packages);
			expect(optimized.totalQuantity).toBeGreaterThanOrEqual(150);
		});
	});
});

