/**
 * Retry Logic Utility
 * 
 * Provides retry functionality with exponential backoff for handling
 * transient failures in external API calls and other async operations.
 */

import { RETRY_CONFIG } from '$lib/config/constants';

export interface RetryOptions {
	/**
	 * Maximum number of retry attempts (default: RETRY_CONFIG.MAX_RETRIES)
	 */
	maxRetries?: number;
	/**
	 * Base delay in milliseconds before first retry (default: RETRY_CONFIG.BASE_DELAY)
	 */
	baseDelay?: number;
	/**
	 * Maximum delay in milliseconds between retries (default: RETRY_CONFIG.MAX_DELAY)
	 */
	maxDelay?: number;
	/**
	 * Custom function to determine if an error should trigger a retry
	 * @param error - The error that occurred
	 * @returns true if retry should be attempted, false otherwise
	 */
	shouldRetry?: (_error: Error) => boolean;
}

/**
 * Retries a function with exponential backoff
 * 
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise resolving to the function's return value
 * @throws The last error encountered if all retries are exhausted
 * 
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => apiClient.fetch('/endpoint'),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {}
): Promise<T> {
	const {
		maxRetries = RETRY_CONFIG.MAX_RETRIES,
		baseDelay = RETRY_CONFIG.BASE_DELAY,
		maxDelay = RETRY_CONFIG.MAX_DELAY,
		shouldRetry = () => true
	} = options;

	let lastError: Error | undefined;

	// Handle edge case: if maxRetries is 0, attempt once and throw if it fails
	if (maxRetries === 0) {
		return await fn();
	}

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;

			// Don't retry if this is the last attempt or shouldRetry returns false
			if (attempt === maxRetries - 1 || !shouldRetry(lastError)) {
				throw lastError;
			}

			// Calculate exponential backoff delay: baseDelay * 2^attempt, capped at maxDelay
			const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	// This should never be reached if maxRetries > 0, but TypeScript requires it
	throw lastError ?? new Error('Retry failed with no error captured');
}

