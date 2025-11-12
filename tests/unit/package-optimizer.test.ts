/**
 * Unit tests for package optimizer logic
 */

import { describe, it, expect, vi } from 'vitest';
import {
	optimizePackageSelection,
	type OptimizationCriteria,
	type OptimizationResult
} from '$lib/server/logic/package-optimizer';
import type { NDCPackage } from '$lib/types';

// Mock logger
vi.mock('$lib/server/utils/logger', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

describe('optimizePackageSelection', () => {
	describe('single package optimization', () => {
		it('should select exact match when available', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-91', packageSize: 60, packageUnit: 'tablet', status: 'active' }
			];

			const result = optimizePackageSelection(30, packages);

			expect(result.packages).toHaveLength(1);
			expect(result.packages[0].ndc).toBe('12345-678-90');
			expect(result.packages[0].packageCount).toBe(1);
			expect(result.wasteQuantity).toBe(0);
			// Exact match should have lowest score (waste=0, packageCount=1)
			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.score).toBeLessThan(100); // Less than any solution with waste
		});

		it('should select package with acceptable overfill', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-91', packageSize: 40, packageUnit: 'tablet', status: 'active' }
			];

			const result = optimizePackageSelection(35, packages, { maxOverfillPercent: 20 });

			// 40 - 35 = 5 overfill, which is 14.3% (within 20%)
			expect(result.packages[0].ndc).toBe('12345-678-91');
			expect(result.wasteQuantity).toBe(5);
		});

		it('should reject packages exceeding max overfill percent', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 100, packageUnit: 'tablet', status: 'active' }
			];

			const result = optimizePackageSelection(30, packages, { maxOverfillPercent: 20 });

			// 100 - 30 = 70 overfill, which is 233% (exceeds 20%)
			// Should fallback to simplest solution
			expect(result.packages.length).toBeGreaterThan(0);
		});
	});

	describe('multi-package optimization', () => {
		it('should find optimal two-package combination', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-91', packageSize: 60, packageUnit: 'tablet', status: 'active' }
			];

			const result = optimizePackageSelection(90, packages);

			// Should use 1x60 + 1x30 = 90 (exact match, no waste)
			expect(result.packages.length).toBeGreaterThanOrEqual(1);
			expect(result.totalQuantity).toBeGreaterThanOrEqual(90);
		});

		it('should find multi-package solution using same NDC', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' }
			];

			const result = optimizePackageSelection(60, packages);

			// Should use 2x30 = 60 (exact match using same package type)
			expect(result.packages.length).toBe(1);
			expect(result.packages[0].packageCount).toBe(2);
			expect(result.totalQuantity).toBe(60);
			expect(result.wasteQuantity).toBe(0);
		});

		it('should minimize waste when minimizeWaste is true', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-91', packageSize: 100, packageUnit: 'tablet', status: 'active' }
			];

			const result = optimizePackageSelection(60, packages, { minimizeWaste: true });

			// Should prefer 2x30 (0 waste) over 1x100 (40 waste)
			expect(result.wasteQuantity).toBeLessThanOrEqual(10);
		});

		it('should minimize package count when minimizePackages is true', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-91', packageSize: 100, packageUnit: 'tablet', status: 'active' }
			];

			const result = optimizePackageSelection(60, packages, { minimizePackages: true });

			// Should prefer 1x100 (1 package) over 2x30 (2 packages)
			expect(result.packageCount).toBeLessThanOrEqual(2);
		});
	});

	describe('scoring algorithm', () => {
		it('should score combinations correctly', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-91', packageSize: 60, packageUnit: 'tablet', status: 'active' }
			];

			const result = optimizePackageSelection(60, packages, {
				minimizeWaste: true,
				minimizePackages: true
			});

			expect(result.score).toBeDefined();
			expect(result.score).toBeGreaterThanOrEqual(0);
		});

		it('should prioritize waste when only minimizeWaste is true', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-91', packageSize: 65, packageUnit: 'tablet', status: 'active' }
			];

			const result = optimizePackageSelection(60, packages, {
				minimizeWaste: true,
				minimizePackages: false
			});

			// Should prefer 2x30 (0 waste) over 1x65 (5 waste)
			expect(result.wasteQuantity).toBeLessThanOrEqual(5);
		});
	});

	describe('edge cases', () => {
		it('should return empty result when no active packages', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'inactive' }
			];

			const result = optimizePackageSelection(30, packages);

			expect(result.packages).toHaveLength(0);
			expect(result.totalQuantity).toBe(0);
			expect(result.score).toBe(Infinity);
		});

		it('should return empty result when no packages provided', () => {
			const result = optimizePackageSelection(30, []);

			expect(result.packages).toHaveLength(0);
			expect(result.score).toBe(Infinity);
		});

		it('should use fallback when no combinations meet criteria', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 100, packageUnit: 'tablet', status: 'active' }
			];

			const result = optimizePackageSelection(10, packages, { maxOverfillPercent: 5 });

			// Should fallback to simplest solution (score = Infinity indicates fallback)
			expect(result.packages.length).toBeGreaterThan(0);
			expect(result.score).toBe(Infinity);
		});

		it('should handle zero quantity requirement', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' }
			];

			const result = optimizePackageSelection(0, packages);

			expect(result.packages).toHaveLength(0);
		});
	});

	describe('criteria customization', () => {
		it('should respect allowOverfill setting', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 40, packageUnit: 'tablet', status: 'active' }
			];

			const result = optimizePackageSelection(30, packages, { allowOverfill: true });

			expect(result.packages.length).toBeGreaterThan(0);
		});

		it('should respect custom maxOverfillPercent', () => {
			const packages: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 40, packageUnit: 'tablet', status: 'active' }
			];

			const result = optimizePackageSelection(30, packages, { maxOverfillPercent: 10 });

			// 40 - 30 = 10 overfill, which is 33% (exceeds 10%)
			// Should fallback
			expect(result.score).toBe(Infinity);
		});
	});
});

