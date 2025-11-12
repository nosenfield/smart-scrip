/**
 * Unit tests for FDA NDC service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExternalAPIError, ValidationError } from '$lib/server/utils/error-handler';
import type { NDCPackage } from '$lib/types';

// Mock API client - create mock function in factory and export for test access
vi.mock('$lib/server/utils/api-client', () => {
	const mockFetch = vi.fn();
	return {
		apiClient: {
			fetch: mockFetch
		},
		__mockFetch: mockFetch // Export for test access
	};
});

// Import mock after setup
import { __mockFetch as mockFetch } from '$lib/server/utils/api-client';

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
import { searchNDCsByRxCUI, validateNDC } from '$lib/server/services/fda-ndc.service';

describe('FDA NDC Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('searchNDCsByRxCUI', () => {
		it('should search NDCs by RxCUI successfully', async () => {
			mockFetch.mockResolvedValueOnce({
				results: [
					{
						product_ndc: '12345-678-90',
						generic_name: 'Aspirin',
						brand_name: 'Aspirin',
						active_ingredients: [{ name: 'Aspirin', strength: '81mg' }],
						packaging: [
							{
								package_ndc: '12345-678-90',
								description: '100 TABLET in 1 BOTTLE'
							}
						],
						marketing_status: 'Active'
					}
				]
			});

			const result = await searchNDCsByRxCUI('1191');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				ndc: '12345-678-90',
				packageSize: 100,
				packageUnit: 'tablet',
				status: 'active',
				manufacturer: 'Aspirin'
			});
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('search=rxcui:1191'),
				expect.any(Object)
			);
		});

		it('should handle multiple packaging options', async () => {
			mockFetch.mockResolvedValueOnce({
				results: [
					{
						product_ndc: '12345-678-90',
						generic_name: 'Aspirin',
						brand_name: 'Aspirin',
						active_ingredients: [],
						packaging: [
							{
								package_ndc: '12345-678-90',
								description: '100 TABLET in 1 BOTTLE'
							},
							{
								package_ndc: '12345-678-91',
								description: '200 TABLET in 1 BOTTLE'
							}
						],
						marketing_status: 'Active'
					}
				]
			});

			const result = await searchNDCsByRxCUI('1191');

			expect(result).toHaveLength(2);
			expect(result[0].packageSize).toBe(100);
			expect(result[1].packageSize).toBe(200);
		});

		it('should handle products without packaging info', async () => {
			mockFetch.mockResolvedValueOnce({
				results: [
					{
						product_ndc: '12345-678-90',
						generic_name: 'Aspirin',
						brand_name: 'Aspirin',
						active_ingredients: [],
						marketing_status: 'Active'
					}
				]
			});

			const result = await searchNDCsByRxCUI('1191');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				ndc: '12345-678-90',
				packageSize: 1,
				packageUnit: 'unit',
				status: 'active',
				manufacturer: 'Aspirin'
			});
		});

		it('should return empty array when no results found', async () => {
			mockFetch.mockResolvedValueOnce({
				results: []
			});

			const result = await searchNDCsByRxCUI('99999');

			expect(result).toEqual([]);
		});

		it('should return empty array when results is undefined', async () => {
			mockFetch.mockResolvedValueOnce({});

			const result = await searchNDCsByRxCUI('1191');

			expect(result).toEqual([]);
		});

		it('should detect inactive status', async () => {
			mockFetch.mockResolvedValueOnce({
				results: [
					{
						product_ndc: '12345-678-90',
						generic_name: 'Aspirin',
						active_ingredients: [],
						packaging: [
							{
								package_ndc: '12345-678-90',
								description: '100 TABLET in 1 BOTTLE'
							}
						],
						marketing_status: 'Discontinued'
					}
				]
			});

			const result = await searchNDCsByRxCUI('1191');

			expect(result[0].status).toBe('inactive');
		});

		it('should throw ValidationError for empty RxCUI', async () => {
			await expect(searchNDCsByRxCUI('')).rejects.toThrow(ValidationError);
			await expect(searchNDCsByRxCUI('   ')).rejects.toThrow(ValidationError);
		});

		it('should throw ValidationError for null/undefined RxCUI', async () => {
			await expect(searchNDCsByRxCUI(null as unknown as string)).rejects.toThrow(ValidationError);
			await expect(searchNDCsByRxCUI(undefined as unknown as string)).rejects.toThrow(ValidationError);
		});

		it('should throw ExternalAPIError when API call fails', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(searchNDCsByRxCUI('1191')).rejects.toThrow(ExternalAPIError);
		});

		it('should preserve ValidationError when thrown', async () => {
			await expect(searchNDCsByRxCUI('')).rejects.toThrow(ValidationError);
		});
	});

	describe('validateNDC', () => {
		it('should validate NDC successfully', async () => {
			mockFetch.mockResolvedValueOnce({
				results: [
					{
						product_ndc: '12345-678-90',
						generic_name: 'Aspirin',
						brand_name: 'Aspirin',
						active_ingredients: [],
						packaging: [
							{
								package_ndc: '12345-678-90',
								description: '100 TABLET in 1 BOTTLE'
							}
						],
						marketing_status: 'Active'
					}
				]
			});

			const result = await validateNDC('12345-678-90');

			expect(result).not.toBeNull();
			expect(result?.ndc).toBe('12345-678-90');
			expect(result?.packageSize).toBe(100);
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('product_ndc:"12345-678-90"'),
				expect.any(Object)
			);
		});

		it('should return null when NDC not found', async () => {
			mockFetch.mockResolvedValueOnce({
				results: []
			});

			const result = await validateNDC('99999-999-99');

			expect(result).toBeNull();
		});

		it('should return null when results is undefined', async () => {
			mockFetch.mockResolvedValueOnce({});

			const result = await validateNDC('12345-678-90');

			expect(result).toBeNull();
		});

		it('should throw ValidationError for empty NDC', async () => {
			await expect(validateNDC('')).rejects.toThrow(ValidationError);
			await expect(validateNDC('   ')).rejects.toThrow(ValidationError);
		});

		it('should throw ValidationError for null/undefined NDC', async () => {
			await expect(validateNDC(null as unknown as string)).rejects.toThrow(ValidationError);
			await expect(validateNDC(undefined as unknown as string)).rejects.toThrow(ValidationError);
		});

		it('should throw ExternalAPIError when API call fails', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(validateNDC('12345-678-90')).rejects.toThrow(ExternalAPIError);
		});

		it('should preserve ValidationError when thrown', async () => {
			await expect(validateNDC('')).rejects.toThrow(ValidationError);
		});
	});

	describe('Package parsing', () => {
		it('should parse package size correctly', async () => {
			mockFetch.mockResolvedValueOnce({
				results: [
					{
						product_ndc: '12345-678-90',
						generic_name: 'Test',
						active_ingredients: [],
						packaging: [
							{
								package_ndc: '12345-678-90',
								description: '50 CAPSULE in 1 BOTTLE'
							}
						],
						marketing_status: 'Active'
					}
				]
			});

			const result = await searchNDCsByRxCUI('1191');

			expect(result[0].packageSize).toBe(50);
			expect(result[0].packageUnit).toBe('capsule');
		});

		it('should handle package descriptions without numbers', async () => {
			mockFetch.mockResolvedValueOnce({
				results: [
					{
						product_ndc: '12345-678-90',
						generic_name: 'Test',
						active_ingredients: [],
						packaging: [
							{
								package_ndc: '12345-678-90',
								description: 'BOTTLE'
							}
						],
						marketing_status: 'Active'
					}
				]
			});

			const result = await searchNDCsByRxCUI('1191');

			expect(result[0].packageSize).toBe(1);
			expect(result[0].packageUnit).toBe('unit');
		});
	});
});

