/**
 * API endpoint for prescription calculation
 * 
 * POST /api/calculate
 * 
 * Processes prescription requests and returns optimal NDC package selections.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { processCalculation } from '$lib/server/orchestrator/calculation-orchestrator';
import type { CalculationRequest } from '$lib/types';
import { logger } from '$lib/server/utils/logger';
import { checkRateLimit } from '$lib/server/middleware/rate-limiter';

/**
 * POST handler for calculation requests
 * 
 * Accepts JSON request body with prescription details and returns
 * calculation result with selected NDCs and metadata.
 * 
 * Includes rate limiting: 100 requests per 60 seconds per IP address.
 * 
 * @param event - SvelteKit request event
 * @returns JSON response with calculation result or error
 */
export const POST: RequestHandler = async ({ request, getClientAddress, setHeaders }) => {
	// Rate limiting FIRST (before any parsing/processing) - fail fast principle
	// Extract client IP with proper proxy handling
	// For Cloud Run behind Cloud Load Balancer, use X-Forwarded-For header
	// NOTE: In production, ensure Cloud Load Balancer is configured to set
	// X-Forwarded-For header correctly. See architecture.md for deployment details.
	let clientIP: string;
	const forwardedFor = request.headers.get('x-forwarded-for');
	if (forwardedFor) {
		// Take first IP in chain (actual client IP)
		const firstIP = forwardedFor.split(',')[0].trim();
		// Basic validation: must look like an IP address (IPv4 or IPv6)
		// NOTE: This is basic validation for MVP. For production, use a proper
		// IP validation library (e.g., 'ip-address' npm package) for RFC-compliant
		// validation. Current implementation may accept some invalid formats.
		// IPv4: 7-15 chars, must contain dots (e.g., "1.1.1.1" to "255.255.255.255")
		// IPv6: up to 45 chars, must contain colons
		// Reject strings that are all dots or all colons
		const hasValidStructure =
			(firstIP.includes('.') && !firstIP.startsWith('.') && !firstIP.endsWith('.')) ||
			(firstIP.includes(':') && !firstIP.startsWith(':') && !firstIP.endsWith(':'));
		const isValidIPFormat =
			/^[\d.:a-fA-F]+$/.test(firstIP) &&
			firstIP.length >= 7 &&
			firstIP.length <= 45 &&
			hasValidStructure;
		if (isValidIPFormat) {
			clientIP = firstIP;
		} else {
			clientIP = getClientAddress() || 'unknown';
			logger.warn('Invalid X-Forwarded-For header, using fallback', { forwardedFor });
		}
	} else {
		clientIP = getClientAddress() || 'unknown';
	}

	// In production, reject requests without valid IP (prevents rate limit bypass)
	if (clientIP === 'unknown' && process.env.NODE_ENV === 'production') {
		logger.error('Unable to determine client IP in production', {
			forwardedFor: request.headers.get('x-forwarded-for'),
			userAgent: request.headers.get('user-agent')
		});
		return json(
			{
				success: false,
				error: 'Unable to identify client. Please contact support.',
				code: 'VALIDATION_ERROR'
			},
			{ status: 400 }
		);
	}

	if (clientIP === 'unknown') {
		logger.warn('Unable to determine client IP for rate limiting (development mode)');
	}
	const rateLimitResult = checkRateLimit(clientIP, {
		maxRequests: 100,
		windowMs: 60000
	});

	// Add rate limit headers to response
	setHeaders({
		'X-RateLimit-Limit': '100',
		'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
		'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
	});

	if (!rateLimitResult.allowed) {
		logger.warn('Rate limit exceeded', {
			clientIP,
			endpoint: '/api/calculate',
			userAgent: request.headers.get('user-agent')
		});

		return json(
			{
				success: false,
				error: 'Rate limit exceeded. Please try again later.',
				code: 'RATE_LIMIT_ERROR'
			},
			{ status: 429 }
		);
	}

	// Parse and validate request body after rate limit check
	let body: CalculationRequest;
	try {
		body = (await request.json()) as CalculationRequest;
	} catch (error) {
		logger.error('API request failed - invalid JSON', { error });

		return json(
			{
				success: false,
				error: 'Invalid request format',
				code: 'VALIDATION_ERROR'
			},
			{ status: 400 }
		);
	}

	try {

		// Sanitize inputs before logging to prevent log injection
		logger.info('API request received', {
			drugName: body.drugName ? body.drugName.substring(0, 100) : undefined,
			ndc: body.ndc,
			daysSupply: body.daysSupply
			// Note: SIG text intentionally not logged to avoid sensitive data exposure
		});

		const result = await processCalculation(body);

		const statusCode = result.success ? 200 : 400;

		return json(result, { status: statusCode });
	} catch (error) {
		// This catch block should only handle unexpected errors from processCalculation
		// Normal errors are returned as structured responses (not thrown)
		logger.error('API request failed - unexpected error', { error });

		return json(
			{
				success: false,
				error: 'An unexpected error occurred. Please try again.',
				code: 'INTERNAL_ERROR'
			},
			{ status: 500 }
		);
	}
};

