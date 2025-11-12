/**
 * Quantity calculation logic for prescription processing
 * 
 * Provides functions for:
 * - Calculating total dispense quantity from SIG and days supply
 * - Converting between different units
 * - Rounding quantities to dispensable amounts
 */

import type { ParsedSIG } from '$lib/types';
import { logger } from '$lib/server/utils/logger';

/**
 * Result of quantity calculation
 */
export interface QuantityResult {
	totalQuantity: number;
	unit: string;
	calculation: {
		dosePerAdministration: number;
		administrationsPerDay: number;
		daysSupply: number;
	};
}

/**
 * Calculates total dispense quantity from parsed SIG and days supply
 * 
 * Formula: totalQuantity = dose × frequency × daysSupply
 * 
 * @param sig - Parsed prescription SIG (dose, unit, frequency)
 * @param daysSupply - Number of days the prescription should last
 * @returns Quantity result with total quantity, unit, and calculation details
 * 
 * @example
 * ```typescript
 * const sig = { dose: 1, unit: 'tablet', frequency: 2, route: 'oral' };
 * const result = calculateTotalQuantity(sig, 30);
 * // Returns: { totalQuantity: 60, unit: 'tablet', calculation: {...} }
 * ```
 */
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

/**
 * Converts quantity from one unit to another
 * 
 * Supports conversions between:
 * - Solid dose forms: tablet ↔ capsule (1:1)
 * - Liquid units: ml ↔ l ↔ oz
 * 
 * @param quantity - Quantity to convert
 * @param fromUnit - Source unit
 * @param toUnit - Target unit
 * @returns Converted quantity, or original quantity if conversion not supported
 * 
 * @example
 * ```typescript
 * convertUnits(1000, 'ml', 'l'); // Returns: 1
 * convertUnits(30, 'tablet', 'capsule'); // Returns: 30
 * ```
 */
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
		}
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

/**
 * Rounds quantity to a dispensable amount based on unit type
 * 
 * Rounding rules:
 * - Solid dose forms (tablet, capsule, pill, softgel): Round up to whole number
 * - Liquid forms (ml, l, oz): Round to 1 decimal place
 * - Other units: Round to 2 decimal places
 * 
 * @param quantity - Quantity to round
 * @param unit - Unit of measurement
 * @returns Rounded quantity appropriate for dispensing
 * 
 * @example
 * ```typescript
 * roundToDispensableQuantity(30.7, 'tablet'); // Returns: 31
 * roundToDispensableQuantity(100.56, 'ml');   // Returns: 100.6
 * ```
 */
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

