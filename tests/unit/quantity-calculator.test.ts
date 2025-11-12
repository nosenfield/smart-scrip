/**
 * Unit tests for quantity calculator logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	calculateTotalQuantity,
	convertUnits,
	roundToDispensableQuantity,
	type QuantityResult
} from '$lib/server/logic/quantity-calculator';
import type { ParsedSIG } from '$lib/types';

// Mock logger
vi.mock('$lib/server/utils/logger', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

describe('calculateTotalQuantity', () => {
	it('should calculate total quantity correctly for simple case', () => {
		const sig: ParsedSIG = {
			dose: 1,
			unit: 'tablet',
			frequency: 2,
			route: 'oral'
		};

		const result = calculateTotalQuantity(sig, 30);

		expect(result.totalQuantity).toBe(60);
		expect(result.unit).toBe('tablet');
		expect(result.calculation).toEqual({
			dosePerAdministration: 1,
			administrationsPerDay: 2,
			daysSupply: 30
		});
	});

	it('should calculate total quantity for multiple doses per administration', () => {
		const sig: ParsedSIG = {
			dose: 2,
			unit: 'capsule',
			frequency: 3,
			route: 'oral'
		};

		const result = calculateTotalQuantity(sig, 7);

		expect(result.totalQuantity).toBe(42); // 2 × 3 × 7
		expect(result.unit).toBe('capsule');
	});

	it('should calculate total quantity for liquid medication', () => {
		const sig: ParsedSIG = {
			dose: 5,
			unit: 'ml',
			frequency: 4,
			route: 'oral'
		};

		const result = calculateTotalQuantity(sig, 10);

		expect(result.totalQuantity).toBe(200); // 5 × 4 × 10
		expect(result.unit).toBe('ml');
	});

	it('should handle single daily administration', () => {
		const sig: ParsedSIG = {
			dose: 1,
			unit: 'tablet',
			frequency: 1,
			route: 'oral'
		};

		const result = calculateTotalQuantity(sig, 30);

		expect(result.totalQuantity).toBe(30);
	});

	it('should handle minimum days supply', () => {
		const sig: ParsedSIG = {
			dose: 1,
			unit: 'tablet',
			frequency: 2,
			route: 'oral'
		};

		const result = calculateTotalQuantity(sig, 1);

		expect(result.totalQuantity).toBe(2);
		expect(result.calculation.daysSupply).toBe(1);
	});

	it('should handle maximum days supply', () => {
		const sig: ParsedSIG = {
			dose: 1,
			unit: 'tablet',
			frequency: 1,
			route: 'oral'
		};

		const result = calculateTotalQuantity(sig, 365);

		expect(result.totalQuantity).toBe(365);
	});

	it('should preserve special instructions in calculation metadata', () => {
		const sig: ParsedSIG = {
			dose: 1,
			unit: 'tablet',
			frequency: 2,
			route: 'oral',
			specialInstructions: 'Take with food'
		};

		const result = calculateTotalQuantity(sig, 30);

		expect(result.totalQuantity).toBe(60);
		expect(result.unit).toBe('tablet');
	});
});

describe('convertUnits', () => {
	it('should return same quantity when units are identical', () => {
		expect(convertUnits(100, 'tablet', 'tablet')).toBe(100);
		expect(convertUnits(50, 'ml', 'ml')).toBe(50);
	});

	it('should convert tablet to capsule (1:1)', () => {
		expect(convertUnits(30, 'tablet', 'capsule')).toBe(30);
		expect(convertUnits(30, 'capsule', 'tablet')).toBe(30);
	});

	it('should convert ml to liters', () => {
		expect(convertUnits(1000, 'ml', 'l')).toBe(1);
		expect(convertUnits(500, 'ml', 'l')).toBe(0.5);
	});

	it('should convert liters to ml', () => {
		expect(convertUnits(1, 'l', 'ml')).toBe(1000);
		expect(convertUnits(0.5, 'l', 'ml')).toBe(500);
	});

	it('should convert ml to ounces', () => {
		const result = convertUnits(30, 'ml', 'oz');
		expect(result).toBeCloseTo(1.01442, 5); // 30 × 0.033814
	});

	it('should convert liters to ounces', () => {
		const result = convertUnits(1, 'l', 'oz');
		expect(result).toBeCloseTo(33.814, 3);
	});

	it('should handle case-insensitive unit names', () => {
		expect(convertUnits(100, 'TABLET', 'tablet')).toBe(100);
		expect(convertUnits(100, 'ML', 'ml')).toBe(100);
	});

	it('should return original quantity for unsupported conversion', () => {
		const result = convertUnits(100, 'tablet', 'mg');
		expect(result).toBe(100); // No conversion available
	});

	it('should handle zero quantity', () => {
		expect(convertUnits(0, 'tablet', 'capsule')).toBe(0);
		expect(convertUnits(0, 'ml', 'l')).toBe(0);
	});
});

describe('roundToDispensableQuantity', () => {
	describe('solid dose forms', () => {
		it('should round up tablets to whole number', () => {
			expect(roundToDispensableQuantity(30.1, 'tablet')).toBe(31);
			expect(roundToDispensableQuantity(30.9, 'tablet')).toBe(31);
			expect(roundToDispensableQuantity(30.0, 'tablet')).toBe(30);
		});

		it('should round up capsules to whole number', () => {
			expect(roundToDispensableQuantity(25.3, 'capsule')).toBe(26);
			expect(roundToDispensableQuantity(25.0, 'capsule')).toBe(25);
		});

		it('should round up pills to whole number', () => {
			expect(roundToDispensableQuantity(10.5, 'pill')).toBe(11);
		});

		it('should round up softgels to whole number', () => {
			expect(roundToDispensableQuantity(20.2, 'softgel')).toBe(21);
		});

		it('should handle case-insensitive unit names', () => {
			expect(roundToDispensableQuantity(30.1, 'TABLET')).toBe(31);
			expect(roundToDispensableQuantity(30.1, 'Capsule')).toBe(31);
		});
	});

	describe('liquid dose forms', () => {
		it('should round ml to 1 decimal place', () => {
			expect(roundToDispensableQuantity(100.56, 'ml')).toBe(100.6);
			expect(roundToDispensableQuantity(100.54, 'ml')).toBe(100.5);
			expect(roundToDispensableQuantity(100.0, 'ml')).toBe(100.0);
		});

		it('should round liters to 1 decimal place', () => {
			expect(roundToDispensableQuantity(1.56, 'l')).toBe(1.6);
			expect(roundToDispensableQuantity(1.54, 'l')).toBe(1.5);
		});

		it('should round ounces to 1 decimal place', () => {
			expect(roundToDispensableQuantity(2.56, 'oz')).toBe(2.6);
			expect(roundToDispensableQuantity(2.54, 'oz')).toBe(2.5);
		});

		it('should handle case-insensitive unit names', () => {
			expect(roundToDispensableQuantity(100.56, 'ML')).toBe(100.6);
			expect(roundToDispensableQuantity(1.56, 'L')).toBe(1.6);
		});
	});

	describe('default rounding', () => {
		it('should round to 2 decimal places for unknown units', () => {
			expect(roundToDispensableQuantity(10.567, 'mg')).toBe(10.57);
			expect(roundToDispensableQuantity(10.564, 'mg')).toBe(10.56);
			expect(roundToDispensableQuantity(10.0, 'mg')).toBe(10.0);
		});

		it('should handle zero quantity', () => {
			expect(roundToDispensableQuantity(0, 'tablet')).toBe(0);
			expect(roundToDispensableQuantity(0, 'ml')).toBe(0);
			expect(roundToDispensableQuantity(0, 'mg')).toBe(0);
		});
	});
});

