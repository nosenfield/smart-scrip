/**
 * Unit tests for input validation logic
 */

import { describe, it, expect } from 'vitest';
import { ValidationError } from '$lib/server/utils/error-handler';
import { validatePrescriptionInput, isValidNDCFormat, sanitizeInput } from '$lib/server/logic/validation';
import type { PrescriptionInput } from '$lib/types';

describe('validatePrescriptionInput', () => {
	it('should accept valid input with drug name', () => {
		const input: PrescriptionInput = {
			drugName: 'Aspirin',
			sig: 'Take 1 tablet by mouth twice daily',
			daysSupply: 30
		};

		expect(() => validatePrescriptionInput(input)).not.toThrow();
	});

	it('should accept valid input with NDC', () => {
		const input: PrescriptionInput = {
			ndc: '12345-678-90',
			sig: 'Take 1 tablet by mouth twice daily',
			daysSupply: 30
		};

		expect(() => validatePrescriptionInput(input)).not.toThrow();
	});

	it('should throw ValidationError when neither drugName nor NDC is provided', () => {
		const input: PrescriptionInput = {
			sig: 'Take 1 tablet by mouth twice daily',
			daysSupply: 30
		};

		expect(() => validatePrescriptionInput(input)).toThrow(ValidationError);
		expect(() => validatePrescriptionInput(input)).toThrow('Either drug name or NDC must be provided');
	});

	it('should throw ValidationError when drug name exceeds max length', () => {
		const input: PrescriptionInput = {
			drugName: 'a'.repeat(201), // 201 chars, max is 200
			sig: 'Take 1 tablet by mouth twice daily',
			daysSupply: 30
		};

		expect(() => validatePrescriptionInput(input)).toThrow(ValidationError);
		expect(() => validatePrescriptionInput(input)).toThrow('Drug name must be 200 characters or less');
	});

	it('should throw ValidationError when NDC format is invalid', () => {
		const input: PrescriptionInput = {
			ndc: 'invalid-ndc',
			sig: 'Take 1 tablet by mouth twice daily',
			daysSupply: 30
		};

		expect(() => validatePrescriptionInput(input)).toThrow(ValidationError);
		expect(() => validatePrescriptionInput(input)).toThrow('NDC must be in format');
	});

	it('should throw ValidationError when SIG is empty', () => {
		const input: PrescriptionInput = {
			drugName: 'Aspirin',
			sig: '',
			daysSupply: 30
		};

		expect(() => validatePrescriptionInput(input)).toThrow(ValidationError);
		expect(() => validatePrescriptionInput(input)).toThrow('SIG (prescription directions) is required');
	});

	it('should throw ValidationError when SIG is only whitespace', () => {
		const input: PrescriptionInput = {
			drugName: 'Aspirin',
			sig: '   ',
			daysSupply: 30
		};

		expect(() => validatePrescriptionInput(input)).toThrow(ValidationError);
		expect(() => validatePrescriptionInput(input)).toThrow('SIG (prescription directions) is required');
	});

	it('should throw ValidationError when SIG exceeds max length', () => {
		const input: PrescriptionInput = {
			drugName: 'Aspirin',
			sig: 'a'.repeat(501), // 501 chars, max is 500
			daysSupply: 30
		};

		expect(() => validatePrescriptionInput(input)).toThrow(ValidationError);
		expect(() => validatePrescriptionInput(input)).toThrow('SIG must be 500 characters or less');
	});

	it('should throw ValidationError when days supply is not an integer', () => {
		const input1: PrescriptionInput = {
			drugName: 'Aspirin',
			sig: 'Take 1 tablet daily',
			daysSupply: 30.5
		};

		expect(() => validatePrescriptionInput(input1)).toThrow(ValidationError);
		expect(() => validatePrescriptionInput(input1)).toThrow('Days supply must be a whole number');
	});

	it('should throw ValidationError when days supply is below minimum', () => {
		const input: PrescriptionInput = {
			drugName: 'Aspirin',
			sig: 'Take 1 tablet daily',
			daysSupply: 0
		};

		expect(() => validatePrescriptionInput(input)).toThrow(ValidationError);
		expect(() => validatePrescriptionInput(input)).toThrow('Days supply must be between 1 and 365');
	});

	it('should throw ValidationError when days supply exceeds maximum', () => {
		const input: PrescriptionInput = {
			drugName: 'Aspirin',
			sig: 'Take 1 tablet daily',
			daysSupply: 366
		};

		expect(() => validatePrescriptionInput(input)).toThrow(ValidationError);
		expect(() => validatePrescriptionInput(input)).toThrow('Days supply must be between 1 and 365');
	});

	it('should accept days supply at minimum boundary', () => {
		const input: PrescriptionInput = {
			drugName: 'Aspirin',
			sig: 'Take 1 tablet daily',
			daysSupply: 1
		};

		expect(() => validatePrescriptionInput(input)).not.toThrow();
	});

	it('should accept days supply at maximum boundary', () => {
		const input: PrescriptionInput = {
			drugName: 'Aspirin',
			sig: 'Take 1 tablet daily',
			daysSupply: 365
		};

		expect(() => validatePrescriptionInput(input)).not.toThrow();
	});
});

describe('isValidNDCFormat', () => {
	it('should accept valid 11-digit NDC format (5-4-2)', () => {
		expect(isValidNDCFormat('12345-6789-01')).toBe(true);
	});

	it('should accept valid 10-digit NDC format (5-3-2)', () => {
		expect(isValidNDCFormat('12345-678-90')).toBe(true);
	});

	it('should reject NDC without dashes', () => {
		expect(isValidNDCFormat('12345678901')).toBe(false);
	});

	it('should reject NDC with wrong dash positions', () => {
		expect(isValidNDCFormat('123-45678-901')).toBe(false);
	});

	it('should reject NDC with non-numeric characters', () => {
		expect(isValidNDCFormat('12345-678-9a')).toBe(false);
	});

	it('should reject NDC with too few digits', () => {
		expect(isValidNDCFormat('1234-567-89')).toBe(false);
	});

	it('should reject NDC with too many digits', () => {
		expect(isValidNDCFormat('123456-7890-12')).toBe(false);
	});

	it('should reject empty string', () => {
		expect(isValidNDCFormat('')).toBe(false);
	});

	it('should reject NDC with leading/trailing spaces', () => {
		expect(isValidNDCFormat(' 12345-678-90 ')).toBe(false);
	});
});

describe('sanitizeInput', () => {
	it('should trim whitespace', () => {
		expect(sanitizeInput('  hello  ')).toBe('hello');
	});

	it('should remove angle brackets', () => {
		expect(sanitizeInput('hello<script>alert("xss")</script>world')).toBe('helloscriptalert("xss")/scriptworld');
	});

	it('should remove both < and > characters', () => {
		expect(sanitizeInput('test<>value')).toBe('testvalue');
	});

	it('should handle empty string', () => {
		expect(sanitizeInput('')).toBe('');
	});

	it('should handle string with only whitespace', () => {
		expect(sanitizeInput('   ')).toBe('');
	});

	it('should preserve valid content', () => {
		expect(sanitizeInput('Take 1 tablet by mouth twice daily')).toBe('Take 1 tablet by mouth twice daily');
	});

	it('should handle multiple angle brackets', () => {
		expect(sanitizeInput('test<tag1>middle<tag2>end')).toBe('testtag1middletag2end');
	});
});

