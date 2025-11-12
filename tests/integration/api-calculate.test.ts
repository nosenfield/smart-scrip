/**
 * Integration tests for API calculate endpoint
 * 
 * Tests the complete API endpoint with mocked external services
 * to verify end-to-end request/response handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../src/routes/api/calculate/+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { CalculationRequest, CalculationResponse } from '$lib/types';
import { processCalculation } from '$lib/server/orchestrator/calculation-orchestrator';

// Mock the orchestrator
vi.mock('$lib/server/orchestrator/calculation-orchestrator');
vi.mock('$lib/server/utils/logger', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

describe('POST /api/calculate - Integration Tests', () => {
	const createMockRequest = (body: CalculationRequest): Request => {
		return {
			json: async () => body
		} as unknown as Request;
	};

	const createMockEvent = (request: Request): RequestEvent => {
		return {
			request
		} as RequestEvent;
	};

	const mockSuccessResponse: CalculationResponse = {
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
			aiReasoning: 'Optimal selection based on package size'
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should calculate NDC for valid prescription with drug name', async () => {
		const request: CalculationRequest = {
			drugName: 'Lisinopril 10mg tablet',
			sig: 'Take 1 tablet by mouth once daily',
			daysSupply: 30
		};

		vi.mocked(processCalculation).mockResolvedValue(mockSuccessResponse);

		const mockRequest = createMockRequest(request);
		const mockEvent = createMockEvent(mockRequest);

		const response = await POST(mockEvent);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.data).toBeDefined();
		expect(data.data.totalQuantity).toBe(30);
		expect(data.data.selectedNDCs).toHaveLength(1);
		expect(data.data.selectedNDCs[0].ndc).toBe('68180-0104-01');
		expect(processCalculation).toHaveBeenCalledWith(request);
	});

	it('should return error for invalid input', async () => {
		const request = {
			sig: 'Take 1 tablet daily',
			daysSupply: -5 // Invalid
		};

		const errorResponse: CalculationResponse = {
			success: false,
			error: 'Days supply must be between 1 and 365',
			code: 'VALIDATION_ERROR'
		};

		vi.mocked(processCalculation).mockResolvedValue(errorResponse);

		const mockRequest = createMockRequest(request as CalculationRequest);
		const mockEvent = createMockEvent(mockRequest);

		const response = await POST(mockEvent);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.code).toBe('VALIDATION_ERROR');
		expect(data.error).toBeDefined();
	});

	it('should handle NDC input directly', async () => {
		const request: CalculationRequest = {
			ndc: '00071-0304-23',
			sig: 'Take 1 tablet twice daily',
			daysSupply: 30
		};

		const ndcResponse: CalculationResponse = {
			...mockSuccessResponse,
			data: {
				...mockSuccessResponse.data!,
				rxcui: '00071-0304-23',
				totalQuantity: 60,
				selectedNDCs: [
					{
						ndc: '00071-0304-23',
						quantity: 60,
						packageCount: 1
					}
				]
			}
		};

		vi.mocked(processCalculation).mockResolvedValue(ndcResponse);

		const mockRequest = createMockRequest(request);
		const mockEvent = createMockEvent(mockRequest);

		const response = await POST(mockEvent);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.data?.selectedNDCs[0].ndc).toBe('00071-0304-23');
		expect(processCalculation).toHaveBeenCalledWith(request);
	});

	it('should return error when no NDCs found', async () => {
		const request: CalculationRequest = {
			drugName: 'NonExistent Drug',
			sig: 'Take 1 tablet daily',
			daysSupply: 30
		};

		const errorResponse: CalculationResponse = {
			success: false,
			error: 'No NDCs found for this medication',
			code: 'BUSINESS_LOGIC_ERROR'
		};

		vi.mocked(processCalculation).mockResolvedValue(errorResponse);

		const mockRequest = createMockRequest(request);
		const mockEvent = createMockEvent(mockRequest);

		const response = await POST(mockEvent);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.code).toBe('BUSINESS_LOGIC_ERROR');
		expect(data.error).toBe('No NDCs found for this medication');
	});

	it('should handle invalid JSON request', async () => {
		const mockRequest = {
			json: async () => {
				throw new SyntaxError('Unexpected token');
			}
		} as unknown as Request;

		const mockEvent = createMockEvent(mockRequest);

		const response = await POST(mockEvent);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Invalid request format');
		expect(data.code).toBe('VALIDATION_ERROR');
	});

	it('should handle request with missing required fields', async () => {
		const request = {
			sig: 'Take 1 tablet daily'
			// Missing daysSupply
		};

		const errorResponse: CalculationResponse = {
			success: false,
			error: 'Days supply is required',
			code: 'VALIDATION_ERROR'
		};

		vi.mocked(processCalculation).mockResolvedValue(errorResponse);

		const mockRequest = createMockRequest(request as CalculationRequest);
		const mockEvent = createMockEvent(mockRequest);

		const response = await POST(mockEvent);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.code).toBe('VALIDATION_ERROR');
	});

	it('should include warnings in successful response', async () => {
		const request: CalculationRequest = {
			drugName: 'Lisinopril 10mg tablet',
			sig: 'Take 1 tablet by mouth once daily',
			daysSupply: 30
		};

		const responseWithWarnings: CalculationResponse = {
			...mockSuccessResponse,
			data: {
				...mockSuccessResponse.data!,
				warnings: [
					{
						type: 'OVERFILL',
						message: 'Package provides more than required quantity',
						severity: 'warning'
					}
				]
			}
		};

		vi.mocked(processCalculation).mockResolvedValue(responseWithWarnings);

		const mockRequest = createMockRequest(request);
		const mockEvent = createMockEvent(mockRequest);

		const response = await POST(mockEvent);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.data?.warnings).toHaveLength(1);
		expect(data.data?.warnings[0].type).toBe('OVERFILL');
	});

	it('should include AI reasoning when available', async () => {
		const request: CalculationRequest = {
			drugName: 'Lisinopril 10mg tablet',
			sig: 'Take 1 tablet by mouth once daily',
			daysSupply: 30
		};

		vi.mocked(processCalculation).mockResolvedValue(mockSuccessResponse);

		const mockRequest = createMockRequest(request);
		const mockEvent = createMockEvent(mockRequest);

		const response = await POST(mockEvent);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.data?.aiReasoning).toBe('Optimal selection based on package size');
	});
});

