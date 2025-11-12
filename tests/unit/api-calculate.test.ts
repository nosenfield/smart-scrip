/**
 * Unit tests for API calculate endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../src/routes/api/calculate/+server';
import type { RequestEvent } from '@sveltejs/kit';
import { processCalculation } from '$lib/server/orchestrator/calculation-orchestrator';
import { ValidationError, ExternalAPIError } from '$lib/server/utils/error-handler';

// Mock dependencies
vi.mock('$lib/server/orchestrator/calculation-orchestrator');
vi.mock('$lib/server/utils/logger', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));
vi.mock('$lib/server/middleware/rate-limiter', async () => {
	const actual = await vi.importActual('$lib/server/middleware/rate-limiter');
	return {
		...actual,
		checkRateLimit: vi.fn()
	};
});

describe('POST /api/calculate', () => {
	const mockRequest = {
		json: vi.fn(),
		headers: {
			get: vi.fn((name: string) => {
				if (name === 'user-agent') return 'test-agent';
				return null;
			})
		}
	} as unknown as Request;

	const mockEvent = {
		request: mockRequest,
		getClientAddress: () => '127.0.0.1',
		setHeaders: vi.fn()
	} as unknown as RequestEvent;

	const mockCalculationRequest = {
		drugName: 'Lisinopril 10mg tablet',
		sig: 'Take 1 tablet by mouth once daily',
		daysSupply: 30
	};

	const mockSuccessResponse = {
		success: true,
		data: {
			rxcui: '314076',
			normalizedDrug: {
				name: 'Lisinopril 10 MG Oral Tablet',
				strength: '1',
				doseForm: 'tablet'
			},
			parsedSIG: {
				dose: 1,
				unit: 'tablet',
				frequency: 1,
				route: 'oral'
			},
			selectedNDCs: [
				{
					ndc: '68180-0104-01',
					quantity: 30,
					packageCount: 1
				}
			],
			totalQuantity: 30,
			warnings: [],
			aiReasoning: 'Optimal selection'
		}
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		// Reset rate limiter mock to allow by default
		const { checkRateLimit } = await import('$lib/server/middleware/rate-limiter');
		vi.mocked(checkRateLimit).mockReturnValue({
			allowed: true,
			remaining: 99,
			resetTime: Date.now() + 60000
		});
	});

	it('should return 200 with success response for valid request', async () => {
		vi.mocked(mockRequest.json).mockResolvedValue(mockCalculationRequest);
		vi.mocked(processCalculation).mockResolvedValue(mockSuccessResponse);

		const response = await POST(mockEvent);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.data).toBeDefined();
		expect(processCalculation).toHaveBeenCalledWith(mockCalculationRequest);
	});

	it('should return 400 with error response when calculation fails', async () => {
		const mockErrorResponse = {
			success: false,
			error: 'No NDCs found for this medication',
			code: 'BUSINESS_LOGIC_ERROR'
		};

		vi.mocked(mockRequest.json).mockResolvedValue(mockCalculationRequest);
		vi.mocked(processCalculation).mockResolvedValue(mockErrorResponse);

		const response = await POST(mockEvent);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
		expect(body.error).toBeDefined();
		expect(body.code).toBe('BUSINESS_LOGIC_ERROR');
	});

	it('should return 400 for invalid JSON request', async () => {
		vi.mocked(mockRequest.json).mockRejectedValue(new Error('Invalid JSON'));

		const response = await POST(mockEvent);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
		expect(body.error).toBe('Invalid request format');
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	it('should handle NDC-only request', async () => {
		const ndcRequest = {
			ndc: '68180-0104-01',
			sig: 'Take 1 tablet twice daily',
			daysSupply: 30
		};

		vi.mocked(mockRequest.json).mockResolvedValue(ndcRequest);
		vi.mocked(processCalculation).mockResolvedValue(mockSuccessResponse);

		const response = await POST(mockEvent);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(processCalculation).toHaveBeenCalledWith(ndcRequest);
	});

	it('should handle request with missing optional fields', async () => {
		const minimalRequest = {
			sig: 'Take 1 tablet daily',
			daysSupply: 30
		};

		vi.mocked(mockRequest.json).mockResolvedValue(minimalRequest);
		vi.mocked(processCalculation).mockResolvedValue(mockSuccessResponse);

		const response = await POST(mockEvent);

		expect(response.status).toBe(200);
		expect(processCalculation).toHaveBeenCalledWith(minimalRequest);
	});

	it('should return proper status code based on result success', async () => {
		vi.mocked(mockRequest.json).mockResolvedValue(mockCalculationRequest);

		// Test success case
		vi.mocked(processCalculation).mockResolvedValue(mockSuccessResponse);
		const successResponse = await POST(mockEvent);
		expect(successResponse.status).toBe(200);

		// Test error case
		const errorResponse = {
			success: false,
			error: 'Validation failed',
			code: 'VALIDATION_ERROR'
		};
		vi.mocked(processCalculation).mockResolvedValue(errorResponse);
		const failResponse = await POST(mockEvent);
		expect(failResponse.status).toBe(400);
	});

	it('should include rate limit headers in response', async () => {
		vi.mocked(mockRequest.json).mockResolvedValue(mockCalculationRequest);
		vi.mocked(processCalculation).mockResolvedValue(mockSuccessResponse);

		const setHeadersSpy = vi.fn();
		const eventWithSpy = {
			...mockEvent,
			setHeaders: setHeadersSpy
		} as unknown as RequestEvent;

		await POST(eventWithSpy);

		expect(setHeadersSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				'X-RateLimit-Limit': '100',
				'X-RateLimit-Remaining': expect.any(String),
				'X-RateLimit-Reset': expect.any(String)
			})
		);
	});

	it('should return 429 when rate limit exceeded', async () => {
		const { checkRateLimit } = await import('$lib/server/middleware/rate-limiter');

		// Mock rate limiter to return rate limit exceeded
		vi.mocked(checkRateLimit).mockReturnValue({
			allowed: false,
			remaining: 0,
			resetTime: Date.now() + 60000
		});

		vi.mocked(mockRequest.json).mockResolvedValue(mockCalculationRequest);
		vi.mocked(processCalculation).mockResolvedValue(mockSuccessResponse);

		// Request should be denied (rate limit exceeded)
		const response = await POST(mockEvent);
		const body = await response.json();

		expect(response.status).toBe(429);
		expect(body.success).toBe(false);
		expect(body.code).toBe('RATE_LIMIT_ERROR');
	});
});

