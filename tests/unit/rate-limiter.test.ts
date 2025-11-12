/**
 * Unit tests for rate limiter middleware
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	checkRateLimit,
	resetRateLimit,
	clearAllRateLimits,
	type RateLimitOptions
} from '$lib/server/middleware/rate-limiter';

describe('Rate Limiter', () => {
	const defaultOptions: RateLimitOptions = {
		maxRequests: 100,
		windowMs: 60000
	};

	beforeEach(() => {
		clearAllRateLimits();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		clearAllRateLimits();
	});

	it('should allow first request', () => {
		const result = checkRateLimit('test-identifier', defaultOptions);

		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(99);
		expect(result.resetTime).toBeGreaterThan(Date.now());
	});

	it('should track multiple requests from same identifier', () => {
		const identifier = 'test-identifier';

		// First request
		const result1 = checkRateLimit(identifier, defaultOptions);
		expect(result1.allowed).toBe(true);
		expect(result1.remaining).toBe(99);

		// Second request
		const result2 = checkRateLimit(identifier, defaultOptions);
		expect(result2.allowed).toBe(true);
		expect(result2.remaining).toBe(98);

		// Third request
		const result3 = checkRateLimit(identifier, defaultOptions);
		expect(result3.allowed).toBe(true);
		expect(result3.remaining).toBe(97);
	});

	it('should deny requests when limit exceeded', () => {
		const identifier = 'test-identifier';
		const options: RateLimitOptions = {
			maxRequests: 2,
			windowMs: 60000
		};

		// First request - allowed
		const result1 = checkRateLimit(identifier, options);
		expect(result1.allowed).toBe(true);
		expect(result1.remaining).toBe(1);

		// Second request - allowed
		const result2 = checkRateLimit(identifier, options);
		expect(result2.allowed).toBe(true);
		expect(result2.remaining).toBe(0);

		// Third request - denied
		const result3 = checkRateLimit(identifier, options);
		expect(result3.allowed).toBe(false);
		expect(result3.remaining).toBe(0);
	});

	it('should reset window after time expires', () => {
		const identifier = 'test-identifier';
		const options: RateLimitOptions = {
			maxRequests: 2,
			windowMs: 1000
		};

		// Make 2 requests (limit reached)
		checkRateLimit(identifier, options);
		checkRateLimit(identifier, options);

		// Third request should be denied
		const result1 = checkRateLimit(identifier, options);
		expect(result1.allowed).toBe(false);

		// Advance time past window
		vi.advanceTimersByTime(1001);

		// Request should now be allowed (new window)
		const result2 = checkRateLimit(identifier, options);
		expect(result2.allowed).toBe(true);
		expect(result2.remaining).toBe(1);
	});

	it('should track different identifiers independently', () => {
		const options: RateLimitOptions = {
			maxRequests: 2,
			windowMs: 60000
		};

		// Identifier 1 - use up limit
		checkRateLimit('id1', options);
		checkRateLimit('id1', options);
		const result1 = checkRateLimit('id1', options);
		expect(result1.allowed).toBe(false);

		// Identifier 2 - should still have limit
		const result2 = checkRateLimit('id2', options);
		expect(result2.allowed).toBe(true);
		expect(result2.remaining).toBe(1);
	});

	it('should use default options when not provided', () => {
		const result = checkRateLimit('test-identifier');

		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(99); // Default is 100 maxRequests
	});

	it('should reset rate limit for identifier', () => {
		const identifier = 'test-identifier';
		const options: RateLimitOptions = {
			maxRequests: 2,
			windowMs: 60000
		};

		// Use up limit
		checkRateLimit(identifier, options);
		checkRateLimit(identifier, options);
		const result1 = checkRateLimit(identifier, options);
		expect(result1.allowed).toBe(false);

		// Reset
		resetRateLimit(identifier);

		// Should be allowed again
		const result2 = checkRateLimit(identifier, options);
		expect(result2.allowed).toBe(true);
		expect(result2.remaining).toBe(1);
	});

	it('should handle custom max requests', () => {
		const options: RateLimitOptions = {
			maxRequests: 10,
			windowMs: 60000
		};

		const result = checkRateLimit('test-identifier', options);

		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(9);
	});

	it('should handle custom window duration', () => {
		const identifier = 'test-identifier';
		const options: RateLimitOptions = {
			maxRequests: 2,
			windowMs: 500
		};

		// Use up limit
		checkRateLimit(identifier, options);
		checkRateLimit(identifier, options);

		// Advance time by less than window
		vi.advanceTimersByTime(400);
		const result1 = checkRateLimit(identifier, options);
		expect(result1.allowed).toBe(false);

		// Advance time past window
		vi.advanceTimersByTime(101);
		const result2 = checkRateLimit(identifier, options);
		expect(result2.allowed).toBe(true);
	});
});

