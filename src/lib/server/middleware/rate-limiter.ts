/**
 * Rate limiting middleware for API endpoints
 * 
 * Provides in-memory rate limiting to prevent API abuse.
 * Uses a sliding window approach with configurable limits.
 * 
 * **⚠️ PRODUCTION DEPLOYMENT WARNING:**
 * 
 * **DO NOT USE IN PRODUCTION MULTI-INSTANCE DEPLOYMENTS**
 * 
 * This implementation has critical limitations:
 * 1. In-memory storage: Each instance has separate rate limit store,
 *    allowing users to bypass limits by hitting different instances
 * 2. Race conditions: Concurrent requests can exceed limits temporarily
 *    (burst attacks can bypass rate limiting)
 * 3. No persistence: Rate limits reset on instance restart
 * 
 * **For production deployment:**
 * - MUST use Redis or Memorystore for distributed rate limiting
 * - MUST implement atomic operations (e.g., Redis INCR command)
 * - MUST use proper locking/mutex for concurrent request handling
 * 
 * **This implementation is acceptable for:**
 * - Local development
 * - Single-instance staging environments
 * - MVP testing with single-instance Cloud Run
 * 
 * See architecture.md for production deployment recommendations.
 */

interface RateLimitStore {
	[key: string]: {
		count: number;
		resetTime: number;
	};
}

const store: RateLimitStore = {};

export interface RateLimitOptions {
	maxRequests: number;
	windowMs: number;
}

/**
 * Checks if a request should be allowed based on rate limit
 * 
 * Uses a sliding window approach: each identifier has a time window
 * during which a maximum number of requests are allowed.
 * 
 * @param identifier - Unique identifier for rate limiting (e.g., IP address, user ID)
 * @param options - Rate limit configuration (default: 100 requests per 60 seconds)
 * @returns Object with allowed status and remaining requests count
 * 
 * @example
 * ```typescript
 * const result = checkRateLimit('192.168.1.1', {
 *   maxRequests: 100,
 *   windowMs: 60000
 * });
 * 
 * if (!result.allowed) {
 *   return json({ error: 'Rate limit exceeded' }, { status: 429 });
 * }
 * ```
 */
export function checkRateLimit(
	identifier: string,
	options: RateLimitOptions = { maxRequests: 100, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetTime: number } {
	const now = Date.now();
	const record = store[identifier];

	if (!record || now > record.resetTime) {
		// Create new window
		const resetTime = now + options.windowMs;
		store[identifier] = {
			count: 1,
			resetTime
		};
		return { allowed: true, remaining: options.maxRequests - 1, resetTime };
	}

	// Check limit BEFORE incrementing (simpler implementation)
	// NOTE: This implementation has a known race condition limitation:
	// - Concurrent requests can pass the check before any increment, allowing
	//   burst attacks to exceed the limit temporarily (e.g., 100 concurrent
	//   requests could all pass before any counter increments)
	// - This is a known limitation accepted for MVP single-instance deployment
	// - For production multi-instance deployments, MUST use Redis or similar
	//   distributed store with atomic operations (INCR command)
	// - See architecture.md for production deployment recommendations
	if (record.count >= options.maxRequests) {
		return { allowed: false, remaining: 0, resetTime: record.resetTime };
	}

	record.count++;
	
	// Cap at max to prevent overflow in edge cases (defense in depth)
	if (record.count > options.maxRequests) {
		record.count = options.maxRequests;
	}

	return {
		allowed: true,
		remaining: options.maxRequests - record.count,
		resetTime: record.resetTime
	};
}

/**
 * Resets rate limit for a specific identifier
 * 
 * Useful for testing or manual rate limit resets.
 * 
 * @param identifier - Identifier to reset
 * 
 * @example
 * ```typescript
 * resetRateLimit('192.168.1.1');
 * ```
 */
export function resetRateLimit(identifier: string): void {
	delete store[identifier];
}

/**
 * Clears all rate limit data
 * 
 * Useful for testing. Should not be used in production.
 */
export function clearAllRateLimits(): void {
	Object.keys(store).forEach((key) => delete store[key]);
}

