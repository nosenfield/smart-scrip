/**
 * Integration tests for service modules
 * 
 * Tests the integration of OpenAI, RxNorm, and FDA NDC services
 * with proper mocking of external APIs and error handling verification.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExternalAPIError, ValidationError } from '$lib/server/utils/error-handler';
import type { ParsedSIG } from '$lib/types';
import type {
	RxNormAPIResponse,
	RxNormPropertiesResponse,
	FDANDCAPIResponse
} from '$lib/types/external-api.types';

// Set up environment variable BEFORE module imports
process.env.OPENAI_API_KEY = 'test-api-key';

// Mock OpenAI
vi.mock('openai', () => {
	const mockCreate = vi.fn();

	class MockOpenAI {
		chat = {
			completions: {
				create: mockCreate
			}
		};

		constructor(_config: unknown) {
			// Constructor for compatibility
		}
	}

	return {
		default: MockOpenAI,
		__mockCreate: mockCreate
	};
});

// Mock API client - use vi.hoisted to create mock accessible in both mock factory and tests
const { mockFetch } = vi.hoisted(() => {
	const mockFetch = vi.fn();
	return { mockFetch };
});

vi.mock('$lib/server/utils/api-client', () => ({
	apiClient: {
		fetch: mockFetch
	}
}));

// Mock logger
vi.mock('$lib/server/utils/logger', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	}
}));

// Mock retry logic - pass through by default
vi.mock('$lib/server/utils/retry', () => ({
	retryWithBackoff: vi.fn(async (fn) => await fn())
}));

// Import services after mocks are set up
import { parseSIG, selectOptimalNDC, type NDCSelectionInput } from '$lib/server/services/openai.service';
import { normalizeToRxCUI } from '$lib/server/services/rxnorm.service';
import { searchNDCsByRxCUI, validateNDC } from '$lib/server/services/fda-ndc.service';
import openaiModule from 'openai';

// Helper to get OpenAI mock
const getOpenAIMock = () => {
	const instance = new openaiModule({ apiKey: 'test' });
	return instance.chat.completions.create as ReturnType<typeof vi.fn>;
};

// Helper to get API client mock
const getAPIClientMock = () => {
	return mockFetch;
};

describe('Service Integration Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('OpenAI Service', () => {
		describe('parseSIG', () => {
			it('should parse SIG text correctly', async () => {
				const mockResponse: ParsedSIG = {
					dose: 2,
					unit: 'tablet',
					frequency: 3,
					route: 'oral',
					specialInstructions: 'Take with meals'
				};

				const mockCreate = getOpenAIMock();
				mockCreate.mockResolvedValueOnce({
					choices: [
						{
							message: {
								content: JSON.stringify(mockResponse)
							}
						}
					],
					usage: {
						prompt_tokens: 20,
						completion_tokens: 10,
						total_tokens: 30
					}
				});

				const result = await parseSIG('Take 2 tablets by mouth three times daily with meals');

				expect(result).toEqual(mockResponse);
				expect(mockCreate).toHaveBeenCalledTimes(1);
				expect(mockCreate).toHaveBeenCalledWith(
					expect.objectContaining({
						model: expect.any(String),
						messages: expect.arrayContaining([
							expect.objectContaining({
								role: 'user',
								content: expect.stringContaining('Take 2 tablets')
							})
						]),
						response_format: { type: 'json_object' },
						temperature: 0.1
					})
				);
			});

			it('should reject empty or whitespace-only SIG input', async () => {
				await expect(parseSIG('')).rejects.toThrow(ValidationError);
				await expect(parseSIG('   ')).rejects.toThrow(ValidationError);
			});

			it('should truncate SIG input exceeding max length', async () => {
				// Long string gets truncated to INPUT_CONSTRAINTS.SIG_MAX_LENGTH (500 chars)
				const longSig = 'a'.repeat(501);
				const mockCreate = getOpenAIMock();
				mockCreate.mockResolvedValueOnce({
					choices: [
						{
							message: {
								content: JSON.stringify({
									dose: 1,
									unit: 'tablet',
									frequency: 1,
									route: 'oral',
									specialInstructions: ''
								})
							}
						}
					],
					usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
				});

				const result = await parseSIG(longSig);
				expect(result).toBeDefined();
				// Verify OpenAI was called with truncated input (500 chars)
				expect(mockCreate).toHaveBeenCalledWith(
					expect.objectContaining({
						messages: expect.arrayContaining([
							expect.objectContaining({
								content: expect.stringMatching(/^.{0,500}$/m)
							})
						])
					})
				);
			});

			it('should handle OpenAI API errors', async () => {
				const mockCreate = getOpenAIMock();
				mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

				await expect(parseSIG('Take 1 tablet daily')).rejects.toThrow(ExternalAPIError);
			});

			it('should handle malformed JSON response', async () => {
				const mockCreate = getOpenAIMock();
				mockCreate.mockResolvedValueOnce({
					choices: [
						{
							message: {
								content: 'Invalid JSON {'
							}
						}
					]
				});

				await expect(parseSIG('Take 1 tablet daily')).rejects.toThrow();
			});
		});

		describe('selectOptimalNDC', () => {
			it('should select optimal NDC correctly', async () => {
				const input: NDCSelectionInput = {
					requiredQuantity: 100,
					unit: 'tablet',
					availableNDCs: [
						{ ndc: '12345-678-90', packageSize: 100, status: 'active' },
						{ ndc: '12345-678-91', packageSize: 50, status: 'active' },
						{ ndc: '12345-678-92', packageSize: 200, status: 'active' }
					]
				};

				const mockResponse = {
					selectedNDCs: [
						{
							ndc: '12345-678-90',
							packageCount: 1,
							totalQuantity: 100
						}
					],
					reasoning: 'Exact match found',
					warnings: []
				};

				const mockCreate = getOpenAIMock();
				mockCreate.mockResolvedValueOnce({
					choices: [
						{
							message: {
								content: JSON.stringify(mockResponse)
							}
						}
					],
					usage: {
						prompt_tokens: 50,
						completion_tokens: 20,
						total_tokens: 70
					}
				});

				const result = await selectOptimalNDC(input);

				expect(result).toEqual(mockResponse);
				expect(mockCreate).toHaveBeenCalledTimes(1);
				expect(mockCreate).toHaveBeenCalledWith(
					expect.objectContaining({
						temperature: 0.3,
						response_format: { type: 'json_object' }
					})
				);
			});

			it('should handle empty availableNDCs array', async () => {
				const input: NDCSelectionInput = {
					requiredQuantity: 100,
					unit: 'tablet',
					availableNDCs: []
				};

				await expect(selectOptimalNDC(input)).rejects.toThrow(ValidationError);
			});

			it('should handle invalid input quantities', async () => {
				const input: NDCSelectionInput = {
					requiredQuantity: -1,
					unit: 'tablet',
					availableNDCs: [{ ndc: '12345-678-90', packageSize: 100, status: 'active' }]
				};

				await expect(selectOptimalNDC(input)).rejects.toThrow(ValidationError);
			});
		});
	});

	describe('RxNorm Service', () => {
		describe('normalizeToRxCUI', () => {
			it('should normalize drug name to RxCUI', async () => {
				const mockRxNormResponse: RxNormAPIResponse = {
					idGroup: {
						rxnormId: ['1191']
					}
				};

				const mockPropertiesResponse: RxNormPropertiesResponse = {
					properties: {
						name: 'Aspirin',
						synonym: 'Acetylsalicylic Acid',
						tty: 'SBD'
					}
				};

				const mockFetch = getAPIClientMock();
				mockFetch
					.mockResolvedValueOnce(mockRxNormResponse)
					.mockResolvedValueOnce(mockPropertiesResponse);

				const result = await normalizeToRxCUI('aspirin');

				expect(result).toEqual({
					rxcui: '1191',
					name: 'Aspirin',
					synonym: 'Acetylsalicylic Acid',
					tty: 'SBD'
				});

				expect(mockFetch).toHaveBeenCalledTimes(2);
				expect(mockFetch).toHaveBeenNthCalledWith(
					1,
					expect.stringContaining('rxcui.json?name=aspirin'),
					expect.any(Object)
				);
			});

			it('should handle unknown drugs gracefully', async () => {
				const mockResponse: RxNormAPIResponse = {
					idGroup: {
						rxnormId: []
					}
				};

				const mockFetch = getAPIClientMock();
				mockFetch.mockResolvedValueOnce(mockResponse);

				await expect(normalizeToRxCUI('nonexistent-drug-xyz')).rejects.toThrow(ExternalAPIError);
			});

			it('should handle invalid drug name input', async () => {
				await expect(normalizeToRxCUI('')).rejects.toThrow(ValidationError);
				await expect(normalizeToRxCUI('   ')).rejects.toThrow(ValidationError);
			});

			it('should handle API errors', async () => {
				const mockFetch = getAPIClientMock();
				mockFetch.mockRejectedValueOnce(new Error('Network error'));

				await expect(normalizeToRxCUI('aspirin')).rejects.toThrow(ExternalAPIError);
			});

			it('should sanitize drug name input', async () => {
				const mockResponse: RxNormAPIResponse = {
					idGroup: {
						rxnormId: ['1191']
					}
				};

				const mockPropertiesResponse: RxNormPropertiesResponse = {
					properties: {
						name: 'Aspirin'
					}
				};

				const mockFetch = getAPIClientMock();
				mockFetch
					.mockResolvedValueOnce(mockResponse)
					.mockResolvedValueOnce(mockPropertiesResponse);

				// Drug name with potentially dangerous characters
				await normalizeToRxCUI('<script>aspirin</script>');

				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining('scriptaspirin'),
					expect.any(Object)
				);
			});
		});
	});

	describe('FDA NDC Service', () => {
		describe('searchNDCsByRxCUI', () => {
			it('should search NDCs by RxCUI', async () => {
				const mockResponse: FDANDCAPIResponse = {
					results: [
						{
							product_ndc: '12345-678',
							generic_name: 'Aspirin',
							brand_name: 'Aspirin',
							product_type: 'HUMAN PRESCRIPTION DRUG',
							marketing_category: 'NDA',
							labeler_name: 'Test Manufacturer',
							active_ingredients: [{ name: 'Aspirin', strength: '81MG' }],
							marketing_status: 'Active',
							packaging: [
								{
									package_ndc: '12345-678-90',
									description: '100 TABLET in 1 BOTTLE'
								},
								{
									package_ndc: '12345-678-91',
									description: '50 TABLET in 1 BOTTLE'
								}
							]
						}
					]
				};

				const mockFetch = getAPIClientMock();
				mockFetch.mockResolvedValueOnce(mockResponse);

				const result = await searchNDCsByRxCUI('1191');

				expect(result).toHaveLength(2);
				expect(result[0]).toMatchObject({
					ndc: '12345-678-90',
					packageSize: 100,
					packageUnit: 'tablet',
					status: 'active'
				});
				expect(result[1]).toMatchObject({
					ndc: '12345-678-91',
					packageSize: 50,
					packageUnit: 'tablet',
					status: 'active'
				});

				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining('search=rxcui:1191'),
					expect.any(Object)
				);
			});

			it('should return empty array when no NDCs found', async () => {
				const mockResponse: FDANDCAPIResponse = {
					results: []
				};

				const mockFetch = getAPIClientMock();
				mockFetch.mockResolvedValueOnce(mockResponse);

				const result = await searchNDCsByRxCUI('99999');

				expect(result).toEqual([]);
			});

			it('should handle inactive NDCs', async () => {
				const mockResponse: FDANDCAPIResponse = {
					results: [
						{
							product_ndc: '12345-678',
							generic_name: 'Aspirin',
							product_type: 'HUMAN PRESCRIPTION DRUG',
							marketing_category: 'NDA',
							labeler_name: 'Test Manufacturer',
							active_ingredients: [{ name: 'Aspirin', strength: '81MG' }],
							marketing_status: 'Discontinued',
							packaging: [
								{
									package_ndc: '12345-678-90',
									description: '100 TABLET in 1 BOTTLE'
								}
							]
						}
					]
				};

				const mockFetch = getAPIClientMock();
				mockFetch.mockResolvedValueOnce(mockResponse);

				const result = await searchNDCsByRxCUI('1191');

				expect(result[0].status).toBe('inactive');
			});

			it('should handle invalid RxCUI input', async () => {
				await expect(searchNDCsByRxCUI('')).rejects.toThrow(ValidationError);
				await expect(searchNDCsByRxCUI('   ')).rejects.toThrow(ValidationError);
			});

			it('should handle API errors', async () => {
				const mockFetch = getAPIClientMock();
				mockFetch.mockRejectedValueOnce(new Error('FDA API unavailable'));

				await expect(searchNDCsByRxCUI('1191')).rejects.toThrow(ExternalAPIError);
			});
		});

		describe('validateNDC', () => {
			it('should validate NDC and return package info', async () => {
				const mockResponse: FDANDCAPIResponse = {
					results: [
						{
							product_ndc: '12345-678',
							generic_name: 'Aspirin',
							brand_name: 'Aspirin',
							product_type: 'HUMAN PRESCRIPTION DRUG',
							marketing_category: 'NDA',
							labeler_name: 'Test Manufacturer',
							active_ingredients: [{ name: 'Aspirin', strength: '81MG' }],
							marketing_status: 'Active',
							packaging: [
								{
									package_ndc: '12345-678-90',
									description: '100 TABLET in 1 BOTTLE'
								}
							]
						}
					]
				};

				const mockFetch = getAPIClientMock();
				mockFetch.mockResolvedValueOnce(mockResponse);

				const result = await validateNDC('12345-678-90');

				expect(result).not.toBeNull();
				expect(result?.package).toMatchObject({
					ndc: '12345-678-90',
					packageSize: 100,
					packageUnit: 'tablet',
					status: 'active'
				});
				expect(result?.genericName).toBe('Aspirin');
			});

			it('should return null for invalid NDC', async () => {
				const mockResponse: FDANDCAPIResponse = {
					results: []
				};

				const mockFetch = getAPIClientMock();
				mockFetch.mockResolvedValueOnce(mockResponse);

				const result = await validateNDC('00000-000-00');

				expect(result).toBeNull();
			});

			it('should reject empty or whitespace-only NDC', async () => {
				await expect(validateNDC('')).rejects.toThrow(ValidationError);
				await expect(validateNDC('   ')).rejects.toThrow(ValidationError);
			});

			it('should handle API errors when validating NDC format', async () => {
				// Non-empty string passes initial validation but may fail at API call
				const mockFetch = getAPIClientMock();
				mockFetch.mockRejectedValueOnce(new Error('FDA API error'));

				await expect(validateNDC('invalid-format')).rejects.toThrow(ExternalAPIError);
				expect(mockFetch).toHaveBeenCalledTimes(1);
			});

			it('should handle API errors during validation', async () => {
				const mockFetch = getAPIClientMock();
				mockFetch.mockRejectedValueOnce(new Error('FDA API error'));

				await expect(validateNDC('12345-678-90')).rejects.toThrow(ExternalAPIError);
			});
		});
	});

	describe('End-to-End Service Integration', () => {
		it('should integrate all services for complete workflow', async () => {
			// Step 1: Parse SIG with OpenAI
			const mockSIGResponse: ParsedSIG = {
				dose: 1,
				unit: 'tablet',
				frequency: 2,
				route: 'oral',
				specialInstructions: 'Take with food'
			};

			const mockCreate = getOpenAIMock();
			mockCreate.mockResolvedValueOnce({
				choices: [
					{
						message: {
							content: JSON.stringify(mockSIGResponse)
						}
					}
				],
				usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
			});

			const parsedSIG = await parseSIG('Take 1 tablet twice daily with food');
			expect(parsedSIG).toEqual(mockSIGResponse);

			// Step 2: Normalize drug name with RxNorm
			const mockRxNormResponse: RxNormAPIResponse = {
				idGroup: { rxnormId: ['1191'] }
			};
			const mockPropertiesResponse: RxNormPropertiesResponse = {
				properties: { name: 'Aspirin', tty: 'SBD' }
			};

			const mockFetch = getAPIClientMock();
			mockFetch
				.mockResolvedValueOnce(mockRxNormResponse)
				.mockResolvedValueOnce(mockPropertiesResponse);

			const drugInfo = await normalizeToRxCUI('aspirin');
			expect(drugInfo.rxcui).toBe('1191');

			// Step 3: Search NDCs with FDA
			const mockFDAResponse: FDANDCAPIResponse = {
				results: [
					{
						product_ndc: '12345-678',
						generic_name: 'Aspirin',
						product_type: 'HUMAN PRESCRIPTION DRUG',
						marketing_category: 'NDA',
						labeler_name: 'Test Manufacturer',
						active_ingredients: [{ name: 'Aspirin', strength: '81MG' }],
						marketing_status: 'Active',
						packaging: [
							{
								package_ndc: '12345-678-90',
								description: '100 TABLET in 1 BOTTLE'
							}
						]
					}
				]
			};

			mockFetch.mockResolvedValueOnce(mockFDAResponse);

			const ndcPackages = await searchNDCsByRxCUI(drugInfo.rxcui);
			expect(ndcPackages.length).toBeGreaterThan(0);

			// Step 4: Select optimal NDC with OpenAI
			const mockSelectionResponse = {
				selectedNDCs: [
					{
						ndc: '12345-678-90',
						packageCount: 1,
						totalQuantity: 100
					}
				],
				reasoning: 'Exact match',
				warnings: []
			};

			mockCreate.mockResolvedValueOnce({
				choices: [
					{
						message: {
							content: JSON.stringify(mockSelectionResponse)
						}
					}
				],
				usage: { prompt_tokens: 30, completion_tokens: 15, total_tokens: 45 }
			});

			const selectionInput: NDCSelectionInput = {
				requiredQuantity: parsedSIG.dose * parsedSIG.frequency * 30, // 30 days
				unit: parsedSIG.unit,
				availableNDCs: ndcPackages.map((pkg) => ({
					ndc: pkg.ndc,
					packageSize: pkg.packageSize,
					status: pkg.status
				}))
			};

			const selection = await selectOptimalNDC(selectionInput);
			expect(selection.selectedNDCs.length).toBeGreaterThan(0);
		});

		it('should handle errors gracefully in end-to-end flow', async () => {
			// Simulate RxNorm API failure
			const mockFetch = getAPIClientMock();
			mockFetch.mockRejectedValueOnce(new Error('RxNorm API unavailable'));

			await expect(normalizeToRxCUI('aspirin')).rejects.toThrow(ExternalAPIError);

			// Verify error doesn't propagate incorrectly
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});
	});
});

