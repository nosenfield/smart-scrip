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
		error: vi.fn()
	}
}));

describe('POST /api/calculate', () => {
	const mockRequest = {
		json: vi.fn()
	} as unknown as Request;

	const mockEvent = {
		request: mockRequest
	} as RequestEvent;

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

	beforeEach(() => {
		vi.clearAllMocks();
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
});

