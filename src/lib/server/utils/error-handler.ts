/**
 * Error Handling Utility
 * 
 * Provides custom error classes and error handling functions for
 * consistent error management across the application.
 */

import { ERROR_CODES } from '$lib/config/constants';

/**
 * Base application error class
 * 
 * All custom errors extend this class to provide consistent
 * error handling and formatting.
 */
export class AppError extends Error {
	constructor(
		public code: string,
		public message: string,
		public statusCode: number = 500,
		public retryable: boolean = false
	) {
		super(message);
		this.name = 'AppError';
		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, AppError);
		}
	}
}

/**
 * Validation error for input validation failures
 * 
 * Used when user input fails validation checks.
 * Status code: 400 (Bad Request)
 * Retryable: false
 */
export class ValidationError extends AppError {
	constructor(message: string) {
		super(ERROR_CODES.VALIDATION_ERROR, message, 400, false);
		this.name = 'ValidationError';
	}
}

/**
 * External API error for failures from external services
 * 
 * Used when external API calls fail (OpenAI, RxNorm, FDA NDC).
 * Status code: 502 (Bad Gateway)
 * Retryable: true by default (can be overridden)
 */
export class ExternalAPIError extends AppError {
	constructor(message: string, retryable: boolean = true) {
		super(ERROR_CODES.EXTERNAL_API_ERROR, message, 502, retryable);
		this.name = 'ExternalAPIError';
	}
}

/**
 * Business logic error for domain-specific failures
 * 
 * Used when business rules are violated (e.g., invalid NDC selection).
 * Status code: 422 (Unprocessable Entity)
 * Retryable: false
 */
export class BusinessLogicError extends AppError {
	constructor(message: string) {
		super(ERROR_CODES.BUSINESS_LOGIC_ERROR, message, 422, false);
		this.name = 'BusinessLogicError';
	}
}

/**
 * Error response format for API endpoints
 */
export interface ErrorResponse {
	success: false;
	error: string;
	code: string;
	retryable?: boolean;
}

/**
 * Handles errors and formats them for API responses
 * 
 * @param error - The error to handle (can be any type)
 * @returns Formatted error response object
 * 
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   return handleAPIError(error);
 * }
 * ```
 */
export function handleAPIError(error: unknown): ErrorResponse {
	if (error instanceof AppError) {
		return {
			success: false,
			error: error.message,
			code: error.code,
			retryable: error.retryable
		};
	}

	// Log unexpected errors for debugging
	console.error('Unexpected error:', error);

	// Return generic error response for unknown errors
	return {
		success: false,
		error: 'An unexpected error occurred',
		code: ERROR_CODES.INTERNAL_ERROR
	};
}

