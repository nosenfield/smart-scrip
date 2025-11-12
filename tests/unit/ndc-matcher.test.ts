/**
 * Unit tests for NDC matcher logic
 */

import { describe, it, expect, vi } from 'vitest';
import { findBestNDCMatches } from '$lib/server/logic/ndc-matcher';
import type { NDCPackage } from '$lib/types';
import { WARNING_TYPES } from '$lib/config/constants';

// Mock logger
vi.mock('$lib/server/utils/logger', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

describe('findBestNDCMatches', () => {
	describe('exact match scenarios', () => {
		it('should find exact match for single package', () => {
			const availableNDCs: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-91', packageSize: 60, packageUnit: 'tablet', status: 'active' }
			];

			const result = findBestNDCMatches(30, 'tablet', availableNDCs);

			expect(result.matches).toHaveLength(1);
			expect(result.matches[0]).toEqual({
				ndc: '12345-678-90',
				quantity: 30,
				packageCount: 1,
				overfill: 0,
				underfill: 0
			});
			expect(result.warnings).toHaveLength(0);
		});

		it('should find exact match case-insensitively', () => {
			const availableNDCs: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'TABLET', status: 'active' }
			];

			const result = findBestNDCMatches(30, 'tablet', availableNDCs);

			expect(result.matches).toHaveLength(1);
			expect(result.matches[0].ndc).toBe('12345-678-90');
		});
	});

	describe('inactive NDC handling', () => {
		it('should return error warning when only inactive NDCs available', () => {
			const availableNDCs: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'inactive' }
			];

			const result = findBestNDCMatches(30, 'tablet', availableNDCs);

			expect(result.matches).toHaveLength(0);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].type).toBe(WARNING_TYPES.INACTIVE_NDC);
			expect(result.warnings[0].severity).toBe('error');
		});

		it('should filter out inactive NDCs and use active ones', () => {
			const availableNDCs: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'inactive' },
				{ ndc: '12345-678-91', packageSize: 30, packageUnit: 'tablet', status: 'active' }
			];

			const result = findBestNDCMatches(30, 'tablet', availableNDCs);

			expect(result.matches).toHaveLength(1);
			expect(result.matches[0].ndc).toBe('12345-678-91');
		});
	});

	describe('no match scenarios', () => {
		it('should return error when no NDCs available', () => {
			const result = findBestNDCMatches(30, 'tablet', []);

			expect(result.matches).toHaveLength(0);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].type).toBe(WARNING_TYPES.NO_EXACT_MATCH);
			expect(result.warnings[0].severity).toBe('error');
		});

		it('should return warning when no matching unit found', () => {
			const availableNDCs: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'capsule', status: 'active' }
			];

			const result = findBestNDCMatches(30, 'tablet', availableNDCs);

			expect(result.warnings.some((w) => w.type === WARNING_TYPES.NO_EXACT_MATCH)).toBe(true);
		});
	});

	describe('overfill scenarios', () => {
		it('should select smallest package that meets requirement with overfill warning', () => {
			const availableNDCs: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-91', packageSize: 60, packageUnit: 'tablet', status: 'active' }
			];

			const result = findBestNDCMatches(35, 'tablet', availableNDCs);

			expect(result.matches).toHaveLength(1);
			expect(result.matches[0].ndc).toBe('12345-678-91');
			expect(result.matches[0].overfill).toBe(25); // 60 - 35
			expect(result.warnings.some((w) => w.type === WARNING_TYPES.OVERFILL)).toBe(true);
		});
	});

	describe('multiple package scenarios', () => {
		it('should select multiple packages when needed', () => {
			const availableNDCs: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' }
			];

			const result = findBestNDCMatches(60, 'tablet', availableNDCs);

			expect(result.matches).toHaveLength(1);
			expect(result.matches[0].packageCount).toBe(2);
			expect(result.matches[0].quantity).toBe(60);
			expect(result.warnings.some((w) => w.type === WARNING_TYPES.MULTIPLE_PACKAGES)).toBe(true);
		});

		it('should handle partial quantity with overfill', () => {
			const availableNDCs: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' }
			];

			const result = findBestNDCMatches(65, 'tablet', availableNDCs);

			expect(result.matches).toHaveLength(1);
			expect(result.matches[0].packageCount).toBe(3); // 3 × 30 = 90
			expect(result.matches[0].quantity).toBe(90);
			expect(result.matches[0].overfill).toBe(25); // 90 - 65
		});

		it('should optimize for multiple different package sizes', () => {
			const availableNDCs: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-91', packageSize: 60, packageUnit: 'tablet', status: 'active' },
				{ ndc: '12345-678-92', packageSize: 100, packageUnit: 'tablet', status: 'active' }
			];

			const result = findBestNDCMatches(90, 'tablet', availableNDCs);

			// Should use one 60 and one 30, or one 100 with overfill
			// The algorithm uses largest first, so it will use 100 with overfill
			expect(result.matches.length).toBeGreaterThan(0);
		});
	});

	describe('unit mismatch fallback', () => {
		it('should fallback to closest match when unit does not match', () => {
			const availableNDCs: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'capsule', status: 'active' }
			];

			const result = findBestNDCMatches(30, 'tablet', availableNDCs);

			// Should still find a match but with warning
			expect(result.warnings.some((w) => w.message.includes('No packages found with unit'))).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('should handle zero quantity requirement', () => {
			const availableNDCs: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' }
			];

			const result = findBestNDCMatches(0, 'tablet', availableNDCs);

			expect(result.matches).toHaveLength(0);
		});

		it('should handle very large quantity requirement', () => {
			const availableNDCs: NDCPackage[] = [
				{ ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' }
			];

			const result = findBestNDCMatches(1000, 'tablet', availableNDCs);

			expect(result.matches.length).toBeGreaterThan(0);
			expect(result.matches[0].packageCount).toBeGreaterThan(1);
		});
	});
});

