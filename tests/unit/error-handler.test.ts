/**
 * Unit tests for error handling utility
 */

import { describe, it, expect } from 'vitest';
import {
	AppError,
	ValidationError,
	ExternalAPIError,
	BusinessLogicError,
	handleAPIError
} from '$lib/server/utils/error-handler';
import { ERROR_CODES } from '$lib/config/constants';

describe('AppError', () => {
	it('should create error with all properties', () => {
		const error = new AppError('TEST_CODE', 'Test message', 400, true);

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(AppError);
		expect(error.code).toBe('TEST_CODE');
		expect(error.message).toBe('Test message');
		expect(error.statusCode).toBe(400);
		expect(error.retryable).toBe(true);
		expect(error.name).toBe('AppError');
	});

	it('should use default statusCode and retryable when not provided', () => {
		const error = new AppError('TEST_CODE', 'Test message');

		expect(error.statusCode).toBe(500);
		expect(error.retryable).toBe(false);
	});

	it('should have proper error message', () => {
		const error = new AppError('TEST_CODE', 'Custom error message');

		expect(error.message).toBe('Custom error message');
		expect(String(error)).toContain('Custom error message');
	});
});

describe('ValidationError', () => {
	it('should extend AppError', () => {
		const error = new ValidationError('Invalid input');

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(AppError);
		expect(error).toBeInstanceOf(ValidationError);
	});

	it('should have correct properties', () => {
		const error = new ValidationError('Invalid drug name');

		expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
		expect(error.message).toBe('Invalid drug name');
		expect(error.statusCode).toBe(400);
		expect(error.retryable).toBe(false);
		expect(error.name).toBe('ValidationError');
	});
});

describe('ExternalAPIError', () => {
	it('should extend AppError', () => {
		const error = new ExternalAPIError('API failed');

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(AppError);
		expect(error).toBeInstanceOf(ExternalAPIError);
	});

	it('should default to retryable', () => {
		const error = new ExternalAPIError('API timeout');

		expect(error.code).toBe(ERROR_CODES.EXTERNAL_API_ERROR);
		expect(error.message).toBe('API timeout');
		expect(error.statusCode).toBe(502);
		expect(error.retryable).toBe(true);
		expect(error.name).toBe('ExternalAPIError');
	});

	it('should allow setting retryable to false', () => {
		const error = new ExternalAPIError('API authentication failed', false);

		expect(error.retryable).toBe(false);
	});

	it('should allow setting retryable to true explicitly', () => {
		const error = new ExternalAPIError('API timeout', true);

		expect(error.retryable).toBe(true);
	});
});

describe('BusinessLogicError', () => {
	it('should extend AppError', () => {
		const error = new BusinessLogicError('Invalid operation');

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(AppError);
		expect(error).toBeInstanceOf(BusinessLogicError);
	});

	it('should have correct properties', () => {
		const error = new BusinessLogicError('No matching NDC found');

		expect(error.code).toBe(ERROR_CODES.BUSINESS_LOGIC_ERROR);
		expect(error.message).toBe('No matching NDC found');
		expect(error.statusCode).toBe(422);
		expect(error.retryable).toBe(false);
		expect(error.name).toBe('BusinessLogicError');
	});
});

describe('handleAPIError', () => {
	it('should handle AppError instances', () => {
		const error = new AppError('TEST_CODE', 'Test error', 400, true);
		const response = handleAPIError(error);

		expect(response).toEqual({
			success: false,
			error: 'Test error',
			code: 'TEST_CODE',
			retryable: true
		});
	});

	it('should handle ValidationError instances', () => {
		const error = new ValidationError('Invalid input');
		const response = handleAPIError(error);

		expect(response).toEqual({
			success: false,
			error: 'Invalid input',
			code: ERROR_CODES.VALIDATION_ERROR,
			retryable: false
		});
	});

	it('should handle ExternalAPIError instances', () => {
		const error = new ExternalAPIError('API timeout');
		const response = handleAPIError(error);

		expect(response).toEqual({
			success: false,
			error: 'API timeout',
			code: ERROR_CODES.EXTERNAL_API_ERROR,
			retryable: true
		});
	});

	it('should handle BusinessLogicError instances', () => {
		const error = new BusinessLogicError('Invalid operation');
		const response = handleAPIError(error);

		expect(response).toEqual({
			success: false,
			error: 'Invalid operation',
			code: ERROR_CODES.BUSINESS_LOGIC_ERROR,
			retryable: false
		});
	});

	it('should handle standard Error instances', () => {
		const error = new Error('Standard error');
		const response = handleAPIError(error);

		expect(response).toEqual({
			success: false,
			error: 'An unexpected error occurred',
			code: ERROR_CODES.INTERNAL_ERROR
		});
		expect(response.retryable).toBeUndefined();
	});

	it('should handle string errors', () => {
		const response = handleAPIError('String error');

		expect(response).toEqual({
			success: false,
			error: 'An unexpected error occurred',
			code: ERROR_CODES.INTERNAL_ERROR
		});
	});

	it('should handle null errors', () => {
		const response = handleAPIError(null);

		expect(response).toEqual({
			success: false,
			error: 'An unexpected error occurred',
			code: ERROR_CODES.INTERNAL_ERROR
		});
	});

	it('should handle undefined errors', () => {
		const response = handleAPIError(undefined);

		expect(response).toEqual({
			success: false,
			error: 'An unexpected error occurred',
			code: ERROR_CODES.INTERNAL_ERROR
		});
	});

	it('should handle unknown error types', () => {
		const response = handleAPIError({ custom: 'error' });

		expect(response).toEqual({
			success: false,
			error: 'An unexpected error occurred',
			code: ERROR_CODES.INTERNAL_ERROR
		});
	});

	it('should include retryable flag when AppError has it', () => {
		const retryableError = new ExternalAPIError('Retryable error', true);
		const nonRetryableError = new ValidationError('Non-retryable error');

		const retryableResponse = handleAPIError(retryableError);
		const nonRetryableResponse = handleAPIError(nonRetryableError);

		expect(retryableResponse.retryable).toBe(true);
		expect(nonRetryableResponse.retryable).toBe(false);
	});

	it('should not include retryable flag for unknown errors', () => {
		const response = handleAPIError(new Error('Unknown error'));

		expect(response.retryable).toBeUndefined();
	});
});

describe('Error class hierarchy', () => {
	it('should maintain proper inheritance chain', () => {
		const validationError = new ValidationError('test');
		const externalError = new ExternalAPIError('test');
		const businessError = new BusinessLogicError('test');

		// All should be instances of Error
		expect(validationError).toBeInstanceOf(Error);
		expect(externalError).toBeInstanceOf(Error);
		expect(businessError).toBeInstanceOf(Error);

		// All should be instances of AppError
		expect(validationError).toBeInstanceOf(AppError);
		expect(externalError).toBeInstanceOf(AppError);
		expect(businessError).toBeInstanceOf(AppError);

		// Each should be instance of its own class
		expect(validationError).toBeInstanceOf(ValidationError);
		expect(externalError).toBeInstanceOf(ExternalAPIError);
		expect(businessError).toBeInstanceOf(BusinessLogicError);
	});

	it('should allow instanceof checks in error handling', () => {
		const errors = [
			new ValidationError('validation'),
			new ExternalAPIError('external'),
			new BusinessLogicError('business')
		];

		errors.forEach((error) => {
			expect(error instanceof AppError).toBe(true);
			expect(handleAPIError(error).code).toBeTruthy();
		});
	});
});

