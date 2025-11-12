/**
 * Unit tests for retry utility with exponential backoff
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff } from '$lib/server/utils/retry';

describe('retryWithBackoff', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe('successful execution', () => {
		it('should return result on first attempt if function succeeds', async () => {
			const fn = vi.fn().mockResolvedValue('success');

			const result = await retryWithBackoff(fn);

			expect(result).toBe('success');
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it('should return result after retries if function eventually succeeds', async () => {
			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error('fail 1'))
				.mockRejectedValueOnce(new Error('fail 2'))
				.mockResolvedValue('success');

			const promise = retryWithBackoff(fn, { maxRetries: 3 });

			// Advance timers for first retry delay (1000ms)
			await vi.advanceTimersByTimeAsync(1000);
			// Advance timers for second retry delay (2000ms)
			await vi.advanceTimersByTimeAsync(2000);

			const result = await promise;

			expect(result).toBe('success');
			expect(fn).toHaveBeenCalledTimes(3);
		});
	});

	describe('exponential backoff timing', () => {
		it('should use exponential backoff delays', async () => {
			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error('fail 1'))
				.mockRejectedValueOnce(new Error('fail 2'))
				.mockResolvedValue('success');

			const delays: number[] = [];

			// Track delays by intercepting setTimeout
			const originalSetTimeout = global.setTimeout;
			try {
				global.setTimeout = ((callback: () => void, delay: number) => {
					delays.push(delay);
					return originalSetTimeout(callback, delay);
				}) as typeof setTimeout;

				const promise = retryWithBackoff(fn, {
					maxRetries: 3,
					baseDelay: 100,
					maxDelay: 10000
				});

				await vi.advanceTimersByTimeAsync(100); // First retry delay
				await vi.advanceTimersByTimeAsync(200); // Second retry delay

				await promise;
			} finally {
				// Restore original setTimeout
				global.setTimeout = originalSetTimeout;
			}

			// First retry should wait baseDelay * 2^0 = 100ms
			// Second retry should wait baseDelay * 2^1 = 200ms
			expect(delays.length).toBeGreaterThanOrEqual(2);
			expect(delays[0]).toBe(100);
			expect(delays[1]).toBe(200);
		});

		it('should cap delay at maxDelay', async () => {
			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error('fail 1'))
				.mockRejectedValueOnce(new Error('fail 2'))
				.mockRejectedValueOnce(new Error('fail 3'))
				.mockRejectedValueOnce(new Error('fail 4'))
				.mockResolvedValue('success');

			const delays: number[] = [];
			const originalSetTimeout = global.setTimeout;
			try {
				global.setTimeout = ((callback: () => void, delay: number) => {
					delays.push(delay);
					return originalSetTimeout(callback, delay);
				}) as typeof setTimeout;

				const promise = retryWithBackoff(fn, {
					maxRetries: 5,
					baseDelay: 1000,
					maxDelay: 2000 // Cap at 2000ms
				});

				// Advance through all retries
				await vi.advanceTimersByTimeAsync(1000); // First retry: 1000ms
				await vi.advanceTimersByTimeAsync(2000); // Second retry: 2000ms (capped)
				await vi.advanceTimersByTimeAsync(2000); // Third retry: 2000ms (capped)
				await vi.advanceTimersByTimeAsync(2000); // Fourth retry: 2000ms (capped)

				await promise;
			} finally {
				global.setTimeout = originalSetTimeout;
			}

			// Verify delays are capped at maxDelay
			expect(delays.every((delay) => delay <= 2000)).toBe(true);
		});
	});

	describe('retry limits', () => {
		it('should respect maxRetries limit', async () => {
			const fn = vi.fn().mockRejectedValue(new Error('always fails'));

			const promise = retryWithBackoff(fn, { maxRetries: 2 });

			// Advance timers for the retry delay and run all pending timers
			await vi.advanceTimersByTimeAsync(1000);
			await vi.runAllTimersAsync();

			// Wait for promise to settle
			await expect(promise).rejects.toThrow('always fails');
			expect(fn).toHaveBeenCalledTimes(2); // Initial attempt + 1 retry
		});

		it('should use default maxRetries from config if not specified', async () => {
			const fn = vi.fn().mockRejectedValue(new Error('always fails'));

			const promise = retryWithBackoff(fn);

			// Advance timers for default 3 retries (attempts 0, 1, 2)
			await vi.advanceTimersByTimeAsync(1000); // First retry
			await vi.advanceTimersByTimeAsync(2000); // Second retry
			await vi.advanceTimersByTimeAsync(4000); // Third retry
			await vi.runAllTimersAsync();

			// Wait for promise to settle
			await expect(promise).rejects.toThrow('always fails');
			expect(fn).toHaveBeenCalledTimes(3); // Default MAX_RETRIES = 3
		});
	});

	describe('custom retry conditions', () => {
		it('should retry when shouldRetry returns true', async () => {
			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error('retryable'))
				.mockResolvedValue('success');

			const shouldRetry = vi.fn((error: Error) => error.message === 'retryable');

			const promise = retryWithBackoff(fn, {
				maxRetries: 3,
				shouldRetry
			});

			await vi.advanceTimersByTimeAsync(1000);

			const result = await promise;

			expect(result).toBe('success');
			expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error));
			expect(fn).toHaveBeenCalledTimes(2);
		});

		it('should not retry when shouldRetry returns false', async () => {
			const fn = vi.fn().mockRejectedValue(new Error('non-retryable'));

			const shouldRetry = vi.fn(() => false);

			const promise = retryWithBackoff(fn, {
				maxRetries: 3,
				shouldRetry
			});

			// Wait for promise to settle (no timers needed since no retry)
			await expect(promise).rejects.toThrow('non-retryable');
			expect(shouldRetry).toHaveBeenCalled();
			expect(fn).toHaveBeenCalledTimes(1); // Only initial attempt, no retries
		});

		it('should use default shouldRetry (always true) if not provided', async () => {
			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error('fail'))
				.mockResolvedValue('success');

			const promise = retryWithBackoff(fn, { maxRetries: 3 });

			await vi.advanceTimersByTimeAsync(1000);

			const result = await promise;

			expect(result).toBe('success');
			expect(fn).toHaveBeenCalledTimes(2);
		});
	});

	describe('error handling', () => {
		it('should throw the last error after all retries exhausted', async () => {
			const lastError = new Error('final failure');
			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error('first failure'))
				.mockRejectedValueOnce(new Error('second failure'))
				.mockRejectedValue(lastError);

			const promise = retryWithBackoff(fn, { maxRetries: 3 });

			// Advance timers for all retry delays and run all pending timers
			await vi.advanceTimersByTimeAsync(1000); // First retry delay
			await vi.advanceTimersByTimeAsync(2000); // Second retry delay
			await vi.runAllTimersAsync();

			// Wait for promise to settle
			await expect(promise).rejects.toThrow('final failure');
			expect(fn).toHaveBeenCalledTimes(3);
		});

		it('should preserve error type and properties', async () => {
			class CustomError extends Error {
				constructor(message: string, public code: string) {
					super(message);
					this.name = 'CustomError';
				}
			}

			const customError = new CustomError('custom error', 'ERR_CODE');
			const fn = vi.fn().mockRejectedValue(customError);

			const promise = retryWithBackoff(fn, { maxRetries: 1 });

			// Advance timers for retry delay
			await vi.advanceTimersByTimeAsync(1000);

			// Wait for promise to settle and verify error
			const rejection = promise.catch((e) => e);
			await vi.runAllTimersAsync();
			const error = (await rejection) as CustomError;

			expect(error).toBeInstanceOf(CustomError);
			expect(error.message).toBe('custom error');
			expect(error.code).toBe('ERR_CODE');
		});
	});

	describe('configuration options', () => {
		it('should use custom baseDelay when provided', async () => {
			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error('fail'))
				.mockResolvedValue('success');

			const delays: number[] = [];
			const originalSetTimeout = global.setTimeout;
			try {
				global.setTimeout = ((callback: () => void, delay: number) => {
					delays.push(delay);
					return originalSetTimeout(callback, delay);
				}) as typeof setTimeout;

				const promise = retryWithBackoff(fn, {
					maxRetries: 2,
					baseDelay: 500
				});

				await vi.advanceTimersByTimeAsync(500);

				await promise;
			} finally {
				global.setTimeout = originalSetTimeout;
			}

			expect(delays[0]).toBe(500); // baseDelay * 2^0 = 500ms
		});

		it('should use custom maxDelay when provided', async () => {
			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error('fail'))
				.mockRejectedValueOnce(new Error('fail'))
				.mockRejectedValueOnce(new Error('fail'))
				.mockResolvedValue('success');

			const delays: number[] = [];
			const originalSetTimeout = global.setTimeout;
			try {
				global.setTimeout = ((callback: () => void, delay: number) => {
					delays.push(delay);
					return originalSetTimeout(callback, delay);
				}) as typeof setTimeout;

				const promise = retryWithBackoff(fn, {
					maxRetries: 4,
					baseDelay: 1000,
					maxDelay: 1500
				});

				await vi.advanceTimersByTimeAsync(1000); // First retry: 1000ms
				await vi.advanceTimersByTimeAsync(1500); // Second retry: 2000ms -> capped at 1500ms
				await vi.advanceTimersByTimeAsync(1500); // Third retry: 4000ms -> capped at 1500ms

				await promise;
			} finally {
				global.setTimeout = originalSetTimeout;
			}

			expect(delays[0]).toBe(1000);
			expect(delays[1]).toBe(1500); // Capped
			expect(delays[2]).toBe(1500); // Capped
		});
	});
});

