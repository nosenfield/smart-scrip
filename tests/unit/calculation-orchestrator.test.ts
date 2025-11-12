/**
 * Unit tests for calculation orchestrator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processCalculation } from '$lib/server/orchestrator/calculation-orchestrator';
import type { CalculationRequest } from '$lib/types';
import * as openaiService from '$lib/server/services/openai.service';
import * as rxnormService from '$lib/server/services/rxnorm.service';
import * as fdaNdcService from '$lib/server/services/fda-ndc.service';
import { validatePrescriptionInput } from '$lib/server/logic/validation';
import { calculateTotalQuantity } from '$lib/server/logic/quantity-calculator';
import { findBestNDCMatches } from '$lib/server/logic/ndc-matcher';
import { ValidationError, ExternalAPIError } from '$lib/server/utils/error-handler';

// Mock all dependencies
vi.mock('$lib/server/services/openai.service');
vi.mock('$lib/server/services/rxnorm.service');
vi.mock('$lib/server/services/fda-ndc.service');
vi.mock('$lib/server/logic/validation');
vi.mock('$lib/server/logic/quantity-calculator');
vi.mock('$lib/server/logic/ndc-matcher');
vi.mock('$lib/server/utils/logger', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

describe('processCalculation', () => {
	const mockRequest: CalculationRequest = {
		drugName: 'Lisinopril 10mg tablet',
		sig: 'Take 1 tablet by mouth once daily',
		daysSupply: 30
	};

	const mockParsedSIG = {
		dose: 1,
		unit: 'tablet',
		frequency: 1,
		route: 'oral',
		specialInstructions: undefined
	};

	const mockDrugInfo = {
		rxcui: '314076',
		name: 'Lisinopril 10 MG Oral Tablet',
		synonym: 'Lisinopril',
		tty: 'SBD'
	};

	const mockNDCPackages = [
		{
			ndc: '68180-0104-01',
			packageSize: 30,
			packageUnit: 'tablet',
			status: 'active' as const,
			manufacturer: 'Test Manufacturer'
		}
	];

	const mockMatchResult = {
		matches: [
			{
				ndc: '68180-0104-01',
				quantity: 30,
				packageCount: 1
			}
		],
		warnings: []
	};

	const mockQuantityResult = {
		totalQuantity: 30,
		unit: 'tablet',
		calculation: {
			dosePerAdministration: 1,
			administrationsPerDay: 1,
			daysSupply: 30
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should process calculation successfully with drug name', async () => {
		vi.mocked(validatePrescriptionInput).mockReturnValue(undefined);
		vi.mocked(openaiService.parseSIG).mockResolvedValue(mockParsedSIG);
		vi.mocked(rxnormService.normalizeToRxCUI).mockResolvedValue(mockDrugInfo);
		vi.mocked(calculateTotalQuantity).mockReturnValue(mockQuantityResult);
		vi.mocked(fdaNdcService.searchNDCsByRxCUI).mockResolvedValue(mockNDCPackages);
		vi.mocked(findBestNDCMatches).mockReturnValue(mockMatchResult);
		vi.mocked(openaiService.selectOptimalNDC).mockResolvedValue({
			selectedNDCs: [
				{
					ndc: '68180-0104-01',
					packageCount: 1,
					totalQuantity: 30
				}
			],
			reasoning: 'Optimal selection based on package size',
			warnings: []
		});

		const result = await processCalculation(mockRequest);

		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data?.rxcui).toBe('314076');
		expect(result.data?.normalizedDrug.name).toBe('Lisinopril 10 MG Oral Tablet');
		expect(result.data?.selectedNDCs).toHaveLength(1);
		expect(result.data?.totalQuantity).toBe(30);
		expect(result.data?.aiReasoning).toBeDefined();
	});

	it('should process calculation successfully with NDC input', async () => {
		const ndcRequest: CalculationRequest = {
			ndc: '68180-0104-01',
			sig: 'Take 1 tablet twice daily',
			daysSupply: 30
		};

		const mockValidatedNDC = {
			ndc: '68180-0104-01',
			packageSize: 30,
			packageUnit: 'tablet',
			status: 'active' as const
		};

		vi.mocked(validatePrescriptionInput).mockReturnValue(undefined);
		vi.mocked(openaiService.parseSIG).mockResolvedValue({
			...mockParsedSIG,
			frequency: 2
		});
		vi.mocked(fdaNdcService.validateNDC).mockResolvedValue(mockValidatedNDC);
		vi.mocked(calculateTotalQuantity).mockReturnValue({
			...mockQuantityResult,
			totalQuantity: 60
		});
		vi.mocked(fdaNdcService.searchNDCsByRxCUI).mockResolvedValue(mockNDCPackages);
		vi.mocked(findBestNDCMatches).mockReturnValue({
			matches: [
				{
					ndc: '68180-0104-01',
					quantity: 60,
					packageCount: 2
				}
			],
			warnings: []
		});
		vi.mocked(openaiService.selectOptimalNDC).mockResolvedValue({
			selectedNDCs: [
				{
					ndc: '68180-0104-01',
					packageCount: 2,
					totalQuantity: 60
				}
			],
			reasoning: 'Selected based on availability',
			warnings: []
		});

		const result = await processCalculation(ndcRequest);

		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(fdaNdcService.validateNDC).toHaveBeenCalledWith('68180-0104-01');
	});

	it('should return error for invalid NDC', async () => {
		const ndcRequest: CalculationRequest = {
			ndc: 'invalid-ndc',
			sig: 'Take 1 tablet daily',
			daysSupply: 30
		};

		vi.mocked(validatePrescriptionInput).mockReturnValue(undefined);
		vi.mocked(openaiService.parseSIG).mockResolvedValue(mockParsedSIG);
		vi.mocked(fdaNdcService.validateNDC).mockResolvedValue(null);

		const result = await processCalculation(ndcRequest);

		expect(result.success).toBe(false);
		expect(result.error).toBe('Invalid or inactive NDC provided');
		expect(result.code).toBe('VALIDATION_ERROR');
	});

	it('should return error when no drug name or NDC provided', async () => {
		const invalidRequest: CalculationRequest = {
			sig: 'Take 1 tablet daily',
			daysSupply: 30
		};

		vi.mocked(validatePrescriptionInput).mockReturnValue(undefined);
		vi.mocked(openaiService.parseSIG).mockResolvedValue(mockParsedSIG);

		const result = await processCalculation(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should return error when no NDCs found', async () => {
		vi.mocked(validatePrescriptionInput).mockReturnValue(undefined);
		vi.mocked(openaiService.parseSIG).mockResolvedValue(mockParsedSIG);
		vi.mocked(rxnormService.normalizeToRxCUI).mockResolvedValue(mockDrugInfo);
		vi.mocked(calculateTotalQuantity).mockReturnValue(mockQuantityResult);
		vi.mocked(fdaNdcService.searchNDCsByRxCUI).mockResolvedValue([]);

		const result = await processCalculation(mockRequest);

		expect(result.success).toBe(false);
		expect(result.error).toBe('No NDCs found for this medication');
		expect(result.code).toBe('BUSINESS_LOGIC_ERROR');
	});

	it('should handle validation errors', async () => {
		vi.mocked(validatePrescriptionInput).mockImplementation(() => {
			throw new ValidationError('Invalid prescription input');
		});

		const result = await processCalculation(mockRequest);

		expect(result.success).toBe(false);
		expect(result.code).toBe('VALIDATION_ERROR');
	});

	it('should handle external API errors', async () => {
		vi.mocked(validatePrescriptionInput).mockReturnValue(undefined);
		vi.mocked(openaiService.parseSIG).mockRejectedValue(
			new ExternalAPIError('OpenAI API failed', true)
		);

		const result = await processCalculation(mockRequest);

		expect(result.success).toBe(false);
		expect(result.code).toBe('EXTERNAL_API_ERROR');
	});

	it('should continue with deterministic result when AI selection fails', async () => {
		vi.mocked(validatePrescriptionInput).mockReturnValue(undefined);
		vi.mocked(openaiService.parseSIG).mockResolvedValue(mockParsedSIG);
		vi.mocked(rxnormService.normalizeToRxCUI).mockResolvedValue(mockDrugInfo);
		vi.mocked(calculateTotalQuantity).mockReturnValue(mockQuantityResult);
		vi.mocked(fdaNdcService.searchNDCsByRxCUI).mockResolvedValue(mockNDCPackages);
		vi.mocked(findBestNDCMatches).mockReturnValue(mockMatchResult);
		vi.mocked(openaiService.selectOptimalNDC).mockRejectedValue(
			new Error('AI service unavailable')
		);

		const result = await processCalculation(mockRequest);

		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data?.selectedNDCs).toHaveLength(1);
		expect(result.data?.aiReasoning).toBeUndefined();
	});

	it('should include warnings from matching and AI selection', async () => {
		const warnings = [
			{
				type: 'OVERFILL',
				message: 'Package provides more than required',
				severity: 'warning' as const
			}
		];

		vi.mocked(validatePrescriptionInput).mockReturnValue(undefined);
		vi.mocked(openaiService.parseSIG).mockResolvedValue(mockParsedSIG);
		vi.mocked(rxnormService.normalizeToRxCUI).mockResolvedValue(mockDrugInfo);
		vi.mocked(calculateTotalQuantity).mockReturnValue(mockQuantityResult);
		vi.mocked(fdaNdcService.searchNDCsByRxCUI).mockResolvedValue(mockNDCPackages);
		vi.mocked(findBestNDCMatches).mockReturnValue({
			...mockMatchResult,
			warnings
		});
		vi.mocked(openaiService.selectOptimalNDC).mockResolvedValue({
			selectedNDCs: [
				{
					ndc: '68180-0104-01',
					packageCount: 1,
					totalQuantity: 30
				}
			],
			reasoning: 'Test reasoning',
			warnings: [
				{
					type: 'UNDERFILL',
					message: 'May need additional packages',
					severity: 'info' as const
				}
			]
		});

		const result = await processCalculation(mockRequest);

		expect(result.success).toBe(true);
		expect(result.data?.warnings).toHaveLength(2);
	});

	it('should use AI-selected NDCs when available', async () => {
		const aiSelectedNDCs = [
			{
				ndc: '68180-0104-02',
				packageCount: 2,
				totalQuantity: 60
			}
		];

		vi.mocked(validatePrescriptionInput).mockReturnValue(undefined);
		vi.mocked(openaiService.parseSIG).mockResolvedValue(mockParsedSIG);
		vi.mocked(rxnormService.normalizeToRxCUI).mockResolvedValue(mockDrugInfo);
		vi.mocked(calculateTotalQuantity).mockReturnValue(mockQuantityResult);
		vi.mocked(fdaNdcService.searchNDCsByRxCUI).mockResolvedValue(mockNDCPackages);
		vi.mocked(findBestNDCMatches).mockReturnValue(mockMatchResult);
		vi.mocked(openaiService.selectOptimalNDC).mockResolvedValue({
			selectedNDCs: aiSelectedNDCs,
			reasoning: 'AI selected different NDC',
			warnings: []
		});

		const result = await processCalculation(mockRequest);

		expect(result.success).toBe(true);
		expect(result.data?.selectedNDCs).toHaveLength(1);
		expect(result.data?.selectedNDCs[0].ndc).toBe('68180-0104-02');
		expect(result.data?.selectedNDCs[0].packageCount).toBe(2);
		expect(result.data?.selectedNDCs[0].quantity).toBe(60);
	});
});

