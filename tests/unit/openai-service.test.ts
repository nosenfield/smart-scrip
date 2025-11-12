/**
 * Unit tests for OpenAI service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExternalAPIError, ValidationError } from '$lib/server/utils/error-handler';
import type { ParsedSIG } from '$lib/types';

// Set up environment variable BEFORE module imports (to avoid validation error)
process.env.OPENAI_API_KEY = 'test-api-key';

// Mock OpenAI - create mock function in factory so it's shared
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

// Mock logger
vi.mock('$lib/server/utils/logger', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn()
	}
}));

// Mock retry logic - properly handle async functions
vi.mock('$lib/server/utils/retry', () => ({
	retryWithBackoff: vi.fn(async (fn) => await fn())
}));

// Import after mocks are set up
import { parseSIG, selectOptimalNDC, type NDCSelectionInput } from '$lib/server/services/openai.service';
import openaiModule from 'openai';

// Helper to get OpenAI mock - create fresh instance to get mock reference
const getMockCreate = () => {
	const instance = new openaiModule({ apiKey: 'test' });
	return instance.chat.completions.create as ReturnType<typeof vi.fn>;
};

describe('parseSIG', () => {
	let mockCreate: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockCreate = getMockCreate();
	});

	it('should parse SIG text successfully', async () => {
		const mockResponse: ParsedSIG = {
			dose: 1,
			unit: 'tablet',
			frequency: 2,
			route: 'oral',
			specialInstructions: 'Take with food'
		};

		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify(mockResponse)
					}
				}
			],
			usage: {
				prompt_tokens: 10,
				completion_tokens: 5,
				total_tokens: 15
			}
		});

		const result = await parseSIG('Take 1 tablet by mouth twice daily with food');

		expect(result).toEqual(mockResponse);
		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				model: expect.any(String),
				messages: expect.arrayContaining([
					expect.objectContaining({
						role: 'user',
						content: expect.stringContaining('Take 1 tablet by mouth twice daily with food')
					})
				]),
				response_format: { type: 'json_object' },
				temperature: 0.1
			})
		);
	});

	it('should handle SIG with duration', async () => {
		const mockResponse: ParsedSIG = {
			dose: 2,
			unit: 'capsule',
			frequency: 3,
			route: 'oral',
			duration: 7,
			specialInstructions: 'For 7 days'
		};

		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify(mockResponse)
					}
				}
			],
			usage: {
				prompt_tokens: 10,
				completion_tokens: 5,
				total_tokens: 15
			}
		});

		const result = await parseSIG('Take 2 capsules three times daily for 7 days');

		expect(result).toEqual(mockResponse);
	});

	it('should throw ExternalAPIError when OpenAI returns no content', async () => {
		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: null
					}
				}
			]
		});

		await expect(parseSIG('Take 1 tablet daily')).rejects.toThrow(ExternalAPIError);
		await expect(parseSIG('Take 1 tablet daily')).rejects.toThrow('Failed to parse prescription directions');
	});

	it('should throw ExternalAPIError when OpenAI API call fails', async () => {
		mockCreate.mockRejectedValueOnce(new Error('API Error'));

		await expect(parseSIG('Take 1 tablet daily')).rejects.toThrow(ExternalAPIError);
	});

	it('should throw ExternalAPIError when response is invalid JSON', async () => {
		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: 'Invalid JSON response'
					}
				}
			]
		});

		await expect(parseSIG('Take 1 tablet daily')).rejects.toThrow(ExternalAPIError);
	});

	it('should throw ValidationError for empty SIG text', async () => {
		await expect(parseSIG('')).rejects.toThrow(ValidationError);
		await expect(parseSIG('   ')).rejects.toThrow(ValidationError);
	});

	it('should throw ValidationError for null SIG text', async () => {
		await expect(parseSIG(null as any)).rejects.toThrow(ValidationError);
	});

	it('should throw ValidationError for undefined SIG text', async () => {
		await expect(parseSIG(undefined as any)).rejects.toThrow(ValidationError);
	});

	it('should throw ValidationError for non-string SIG text', async () => {
		await expect(parseSIG(123 as any)).rejects.toThrow(ValidationError);
		await expect(parseSIG({} as any)).rejects.toThrow(ValidationError);
		await expect(parseSIG([] as any)).rejects.toThrow(ValidationError);
	});

	it('should sanitize injection characters from SIG text', async () => {
		const mockResponse: ParsedSIG = {
			dose: 1,
			unit: 'tablet',
			frequency: 1,
			route: 'oral',
			specialInstructions: ''
		};

		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify(mockResponse)
					}
				}
			],
			usage: {
				prompt_tokens: 10,
				completion_tokens: 5,
				total_tokens: 15
			}
		});

		// Test that < and > characters are removed
		const result = await parseSIG('Take 1 tablet <script>alert("xss")</script> daily');

		expect(result).toEqual(mockResponse);
		// Verify sanitized text was used in prompt (no script tags)
		const callArgs = mockCreate.mock.calls[0][0];
		const promptContent = callArgs.messages[0].content;
		expect(promptContent).not.toContain('<script>');
		expect(promptContent).not.toContain('</script>');
	});

	it('should validate AI response schema for parseSIG', async () => {
		// Mock invalid response (missing required fields)
		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify({ dose: 1 }) // Missing unit, frequency, route
					}
				}
			],
			usage: {
				prompt_tokens: 10,
				completion_tokens: 5,
				total_tokens: 15
			}
		});

		await expect(parseSIG('Take 1 tablet daily')).rejects.toThrow(ExternalAPIError);
		// Error message should mention schema validation - the service preserves the error message
		const error = await parseSIG('Take 1 tablet daily').catch((e) => e);
		expect(error.message).toContain('Invalid response schema');
	});

	it('should use correct model from environment or default', async () => {
		const mockResponse: ParsedSIG = {
			dose: 1,
			unit: 'tablet',
			frequency: 1,
			route: 'oral',
			specialInstructions: ''
		};

		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify(mockResponse)
					}
				}
			],
			usage: {
				prompt_tokens: 10,
				completion_tokens: 5,
				total_tokens: 15
			}
		});

		await parseSIG('Take 1 tablet daily');

		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				model: expect.any(String)
			})
		);
	});
});

describe('selectOptimalNDC', () => {
	let mockCreate: ReturnType<typeof vi.fn>;
	const mockInput: NDCSelectionInput = {
		requiredQuantity: 30,
		unit: 'tablet',
		availableNDCs: [
			{ ndc: '12345-678-90', packageSize: 30, status: 'active' },
			{ ndc: '12345-678-91', packageSize: 60, status: 'active' },
			{ ndc: '12345-678-92', packageSize: 30, status: 'inactive' }
		]
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockCreate = getMockCreate();
	});

	it('should validate AI response schema for selectOptimalNDC', async () => {
		// Mock invalid response (missing required fields)
		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify({ selectedNDCs: [] }) // Missing reasoning, warnings
					}
				}
			],
			usage: {
				prompt_tokens: 10,
				completion_tokens: 5,
				total_tokens: 15
			}
		});

		await expect(selectOptimalNDC(mockInput)).rejects.toThrow(ExternalAPIError);
		// Error message should mention schema validation - the service preserves the error message
		const error = await selectOptimalNDC(mockInput).catch((e) => e);
		expect(error.message).toContain('Invalid response schema');
	});

	it('should select optimal NDC successfully', async () => {
		const mockResponse = {
			selectedNDCs: [
				{
					ndc: '12345-678-90',
					packageCount: 1,
					totalQuantity: 30
				}
			],
			reasoning: 'Exact match with no waste',
			warnings: []
		};

		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify(mockResponse)
					}
				}
			],
			usage: {
				prompt_tokens: 10,
				completion_tokens: 5,
				total_tokens: 15
			}
		});

		const result = await selectOptimalNDC(mockInput);

		expect(result.selectedNDCs).toEqual(mockResponse.selectedNDCs);
		expect(result.reasoning).toBe(mockResponse.reasoning);
		expect(result.warnings).toEqual(mockResponse.warnings);
		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				model: expect.any(String),
				messages: expect.arrayContaining([
					expect.objectContaining({
						role: 'user',
						content: expect.stringContaining('Required quantity: 30 tablet')
					})
				]),
				response_format: { type: 'json_object' },
				temperature: 0.3
			})
		);
	});

	it('should handle selection with warnings', async () => {
		const mockResponse = {
			selectedNDCs: [
				{
					ndc: '12345-678-91',
					packageCount: 1,
					totalQuantity: 60
				}
			],
			reasoning: 'Only option available, but creates waste',
			warnings: [
				{
					type: 'OVERFILL',
					message: 'Package size creates 30 tablet waste',
					severity: 'warning' as const
				}
			]
		};

		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify(mockResponse)
					}
				}
			],
			usage: {
				prompt_tokens: 10,
				completion_tokens: 5,
				total_tokens: 15
			}
		});

		const result = await selectOptimalNDC(mockInput);

		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0].severity).toBe('warning');
	});

	it('should handle multiple package selection', async () => {
		const mockResponse = {
			selectedNDCs: [
				{
					ndc: '12345-678-90',
					packageCount: 2,
					totalQuantity: 60
				}
			],
			reasoning: 'Two packages needed to meet requirement',
			warnings: [
				{
					type: 'MULTIPLE_PACKAGES',
					message: 'Requires 2 packages',
					severity: 'info' as const
				}
			]
		};

		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify(mockResponse)
					}
				}
			],
			usage: {
				prompt_tokens: 10,
				completion_tokens: 5,
				total_tokens: 15
			}
		});

		const result = await selectOptimalNDC({
			requiredQuantity: 60,
			unit: 'tablet',
			availableNDCs: [{ ndc: '12345-678-90', packageSize: 30, status: 'active' }]
		});

		expect(result.selectedNDCs[0].packageCount).toBe(2);
		expect(result.warnings).toHaveLength(1);
	});

	it('should throw ExternalAPIError when OpenAI returns no content', async () => {
		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: null
					}
				}
			]
		});

		// Need to create a new input for second call since validation passes first time
		const testInput: NDCSelectionInput = {
			requiredQuantity: 30,
			unit: 'tablet',
			availableNDCs: [
				{ ndc: '12345-678-90', packageSize: 30, status: 'active' }
			]
		};

		await expect(selectOptimalNDC(testInput)).rejects.toThrow(ExternalAPIError);
		await expect(selectOptimalNDC(testInput)).rejects.toThrow('Failed to select optimal NDC');
	});

	it('should throw ExternalAPIError when OpenAI API call fails', async () => {
		mockCreate.mockRejectedValueOnce(new Error('API Error'));

		await expect(selectOptimalNDC(mockInput)).rejects.toThrow(ExternalAPIError);
	});

	it('should throw ExternalAPIError when response is invalid JSON', async () => {
		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: 'Invalid JSON response'
					}
				}
			]
		});

		await expect(selectOptimalNDC(mockInput)).rejects.toThrow(ExternalAPIError);
	});

	it('should include available NDCs in prompt', async () => {
		const mockResponse = {
			selectedNDCs: [
				{
					ndc: '12345-678-90',
					packageCount: 1,
					totalQuantity: 30
				}
			],
			reasoning: 'Exact match',
			warnings: []
		};

		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify(mockResponse)
					}
				}
			]
		});

		await selectOptimalNDC(mockInput);

		const callArgs = mockCreate.mock.calls[0][0];
		const promptContent = callArgs.messages[0].content;

		expect(promptContent).toContain('12345-678-90');
		expect(promptContent).toContain('12345-678-91');
		expect(promptContent).toContain('12345-678-92');
	});

	it('should throw ValidationError for empty availableNDCs array', async () => {
		await expect(
			selectOptimalNDC({
				requiredQuantity: 30,
				unit: 'tablet',
				availableNDCs: []
			})
		).rejects.toThrow(ValidationError);
		await expect(
			selectOptimalNDC({
				requiredQuantity: 30,
				unit: 'tablet',
				availableNDCs: []
			})
		).rejects.toThrow('At least one NDC must be available');
	});
});

