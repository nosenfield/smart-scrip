/**
 * Unit tests for RxNorm service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExternalAPIError, ValidationError } from '$lib/server/utils/error-handler';

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
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	}
}));

// Mock retry logic
vi.mock('$lib/server/utils/retry', () => ({
	retryWithBackoff: vi.fn(async (fn) => await fn())
}));

// Import after mocks
import { normalizeToRxCUI, getRxCUIProperties } from '$lib/server/services/rxnorm.service';

describe('RxNorm Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('normalizeToRxCUI', () => {
		it('should normalize drug name to RxCUI successfully', async () => {
			mockFetch
				.mockResolvedValueOnce({
					idGroup: {
						rxnormId: ['1191']
					}
				})
				.mockResolvedValueOnce({
					properties: {
						name: 'Aspirin',
						synonym: 'Aspirin',
						tty: 'SBD'
					}
				});

			const result = await normalizeToRxCUI('aspirin');

			expect(result).toEqual({
				rxcui: '1191',
				name: 'Aspirin',
				synonym: 'Aspirin',
				tty: 'SBD'
			});
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should use sanitized drug name if properties not available', async () => {
			mockFetch
				.mockResolvedValueOnce({
					idGroup: {
						rxnormId: ['1191']
					}
				})
				.mockResolvedValueOnce({
					properties: {}
				});

			const result = await normalizeToRxCUI('aspirin');

			expect(result).toEqual({
				rxcui: '1191',
				name: 'aspirin',
				synonym: undefined,
				tty: undefined
			});
		});

		it('should throw ValidationError for empty drug name', async () => {
			await expect(normalizeToRxCUI('')).rejects.toThrow(ValidationError);
			await expect(normalizeToRxCUI('   ')).rejects.toThrow(ValidationError);
		});

		it('should throw ValidationError for null/undefined drug name', async () => {
			await expect(normalizeToRxCUI(null as unknown as string)).rejects.toThrow(ValidationError);
			await expect(normalizeToRxCUI(undefined as unknown as string)).rejects.toThrow(ValidationError);
		});

		it('should throw ValidationError for non-string drug name', async () => {
			await expect(normalizeToRxCUI(123 as unknown as string)).rejects.toThrow(ValidationError);
		});

		it('should sanitize drug name (remove < > characters)', async () => {
			mockFetch
				.mockResolvedValueOnce({
					idGroup: {
						rxnormId: ['1191']
					}
				})
				.mockResolvedValueOnce({
					properties: {
						name: 'Aspirin'
					}
				});

			await normalizeToRxCUI('<script>aspirin</script>');

			// Verify the sanitized name was used in the API call (URL encoded)
			const firstCallUrl = mockFetch.mock.calls[0][0] as string;
			expect(decodeURIComponent(firstCallUrl)).toContain('scriptaspirin');
			expect(firstCallUrl).not.toContain('<');
			expect(firstCallUrl).not.toContain('>');
		});

		it('should truncate drug name to max length', async () => {
			const longName = 'a'.repeat(300);
			mockFetch
				.mockResolvedValueOnce({
					idGroup: {
						rxnormId: ['1191']
					}
				})
				.mockResolvedValueOnce({
					properties: {
						name: 'Aspirin'
					}
				});

			await normalizeToRxCUI(longName);

			// Verify truncated name was used
			const callUrl = mockFetch.mock.calls[0][0];
			expect(callUrl).toContain(encodeURIComponent('a'.repeat(200)));
		});

		it('should throw ExternalAPIError when no RxCUI found', async () => {
			mockFetch.mockResolvedValueOnce({
				idGroup: {}
			});

			await expect(normalizeToRxCUI('unknown-drug')).rejects.toThrow(ExternalAPIError);
		});

		it('should throw ExternalAPIError when API call fails', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(normalizeToRxCUI('aspirin')).rejects.toThrow(ExternalAPIError);
		});

		it('should preserve ValidationError when thrown', async () => {
			await expect(normalizeToRxCUI('')).rejects.toThrow(ValidationError);
		});
	});

	describe('getRxCUIProperties', () => {
		it('should fetch RxCUI properties successfully', async () => {
			mockFetch.mockResolvedValueOnce({
				properties: {
					name: 'Aspirin',
					synonym: 'Aspirin',
					tty: 'SBD'
				}
			});

			const result = await getRxCUIProperties('1191');

			expect(result).toEqual({
				name: 'Aspirin',
				synonym: 'Aspirin',
				tty: 'SBD'
			});
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/rxcui/1191/properties.json'),
				expect.any(Object)
			);
		});

		it('should return empty object when properties not available', async () => {
			mockFetch.mockResolvedValueOnce({
				properties: {}
			});

			const result = await getRxCUIProperties('1191');

			expect(result).toEqual({});
		});

		it('should return empty object for invalid RxCUI', async () => {
			const result = await getRxCUIProperties('');
			expect(result).toEqual({});
		});

		it('should return empty object when API call fails', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			const result = await getRxCUIProperties('1191');

			expect(result).toEqual({});
		});

		it('should handle null RxCUI gracefully', async () => {
			const result = await getRxCUIProperties(null as unknown as string);
			expect(result).toEqual({});
		});
	});
});

