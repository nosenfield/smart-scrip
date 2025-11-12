/**
 * Unit tests for OpenAI service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExternalAPIError, ValidationError } from '$lib/server/utils/error-handler';
import type { ParsedSIG } from '$lib/types';

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
		// Export the mock so we can access it
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

// Mock retry logic
vi.mock('$lib/server/utils/retry', () => ({
	retryWithBackoff: vi.fn((fn) => fn())
}));

// Import after mocks are set up
import { parseSIG, selectOptimalNDC, type NDCSelectionInput } from '$lib/server/services/openai.service';
import openaiModule from 'openai';

// Store mock function reference - all instances share the same mock
let mockCreateFn: ReturnType<typeof vi.fn>;
const getMockCreate = () => {
	if (!mockCreateFn) {
		const instance = new openaiModule({ apiKey: 'test' });
		mockCreateFn = instance.chat.completions.create as ReturnType<typeof vi.fn>;
	}
	return mockCreateFn;
};

describe('parseSIG', () => {
	let mockCreateFn: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateFn = getMockCreate();
	});

	it('should parse SIG text successfully', async () => {
		const mockResponse: ParsedSIG = {
			dose: 1,
			unit: 'tablet',
			frequency: 2,
			route: 'oral',
			specialInstructions: 'Take with food'
		};

		mockCreateFn.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify(mockResponse)
					}
				}
			]
		});

		const result = await parseSIG('Take 1 tablet by mouth twice daily with food');

		expect(result).toEqual(mockResponse);
		expect(mockCreateFn).toHaveBeenCalledWith(
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

		mockCreateFn.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify(mockResponse)
					}
				}
			]
		});

		const result = await parseSIG('Take 2 capsules three times daily for 7 days');

		expect(result).toEqual(mockResponse);
	});

	it('should throw ExternalAPIError when OpenAI returns no content', async () => {
		mockCreateFn.mockResolvedValueOnce({
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
		mockCreateFn.mockRejectedValueOnce(new Error('API Error'));

		await expect(parseSIG('Take 1 tablet daily')).rejects.toThrow(ExternalAPIError);
	});

	it('should throw ExternalAPIError when response is invalid JSON', async () => {
		mockCreateFn.mockResolvedValueOnce({
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

	it('should use correct model from environment or default', async () => {
		const mockResponse: ParsedSIG = {
			dose: 1,
			unit: 'tablet',
			frequency: 1,
			route: 'oral',
			specialInstructions: ''
		};

		mockCreateFn.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify(mockResponse)
					}
				}
			]
		});

		await parseSIG('Take 1 tablet daily');

		expect(mockCreateFn).toHaveBeenCalledWith(
			expect.objectContaining({
				model: expect.any(String)
			})
		);
	});
});

describe('selectOptimalNDC', () => {
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
		mockCreateFn = getMockCreate();
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

		mockCreateFn.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify(mockResponse)
					}
				}
			]
		});

		const result = await selectOptimalNDC(mockInput);

		expect(result).toEqual(mockResponse);
		expect(mockCreateFn).toHaveBeenCalledWith(
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

		mockCreateFn.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify(mockResponse)
					}
				}
			]
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

		mockCreateFn.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify(mockResponse)
					}
				}
			]
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
		mockCreateFn.mockResolvedValueOnce({
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
		mockCreateFn.mockRejectedValueOnce(new Error('API Error'));

		await expect(selectOptimalNDC(mockInput)).rejects.toThrow(ExternalAPIError);
	});

	it('should throw ExternalAPIError when response is invalid JSON', async () => {
		mockCreateFn.mockResolvedValueOnce({
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

		mockCreateFn.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: JSON.stringify(mockResponse)
					}
				}
			]
		});

		await selectOptimalNDC(mockInput);

		const callArgs = mockCreateFn.mock.calls[0][0];
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

