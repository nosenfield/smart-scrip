/**
 * Input validation logic for prescription processing
 * 
 * Provides validation functions for user inputs including:
 * - Prescription input validation (drug name, NDC, SIG, days supply)
 * - NDC format validation
 * - Input sanitization to prevent injection attacks
 */

import { INPUT_CONSTRAINTS } from '$lib/config/constants';
import type { PrescriptionInput } from '$lib/types';
import { ValidationError } from '$lib/server/utils/error-handler';

/**
 * Validates prescription input according to business rules
 * 
 * @param input - Prescription input to validate
 * @throws ValidationError if validation fails
 * 
 * @example
 * ```typescript
 * validatePrescriptionInput({
 *   drugName: 'Aspirin',
 *   sig: 'Take 1 tablet twice daily',
 *   daysSupply: 30
 * });
 * ```
 */
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

/**
 * Validates NDC format
 * 
 * Accepts two formats:
 * - 11-digit: XXXXX-XXXX-XX (5-4-2)
 * - 10-digit: XXXXX-XXX-XX (5-3-2)
 * 
 * @param ndc - NDC string to validate
 * @returns True if NDC format is valid
 * 
 * @example
 * ```typescript
 * isValidNDCFormat('12345-6789-01'); // true (11-digit)
 * isValidNDCFormat('12345-678-90');   // true (10-digit)
 * isValidNDCFormat('invalid');       // false
 * ```
 */
export function isValidNDCFormat(ndc: string): boolean {
	const patterns = [
		/^\d{5}-\d{4}-\d{2}$/, // 11-digit (5-4-2)
		/^\d{5}-\d{3}-\d{2}$/  // 10-digit (5-3-2)
	];

	return patterns.some((pattern) => pattern.test(ndc));
}

/**
 * Sanitizes input string by removing potential injection characters
 * 
 * Removes:
 * - Leading/trailing whitespace
 * - Angle brackets (< and >) to prevent HTML/XML injection
 * 
 * @param input - String to sanitize
 * @returns Sanitized string
 * 
 * @example
 * ```typescript
 * sanitizeInput('  hello<script>alert("xss")</script>world  ');
 * // Returns: 'helloscriptalert("xss")/scriptworld'
 * ```
 */
export function sanitizeInput(input: string): string {
	return input.trim().replace(/[<>]/g, '');
}

