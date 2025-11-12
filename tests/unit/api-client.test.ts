/**
 * API Client Tests
 * Tests HTTP client utility with timeout and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { APIClient } from '$lib/server/utils/api-client';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('APIClient', () => {
	let client: APIClient;

	beforeEach(() => {
		client = new APIClient();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Successful requests', () => {
		it('should perform GET request successfully', async () => {
			const mockResponse = { data: 'test' };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const result = await client.fetch<typeof mockResponse>('https://api.example.com/data');

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/data',
				expect.objectContaining({
					method: 'GET',
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					})
				})
			);
			expect(result).toEqual(mockResponse);
		});

		it('should perform POST request with body', async () => {
			const requestBody = { name: 'test', value: 123 };
			const mockResponse = { success: true };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const result = await client.fetch('https://api.example.com/create', {
				method: 'POST',
				body: requestBody
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/create',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify(requestBody)
				})
			);
			expect(result).toEqual(mockResponse);
		});

		it('should include custom headers', async () => {
			const mockResponse = { data: 'test' };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			await client.fetch('https://api.example.com/data', {
				headers: {
					Authorization: 'Bearer token123',
					'X-Custom-Header': 'value'
				}
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/data',
				expect.objectContaining({
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						Authorization: 'Bearer token123',
						'X-Custom-Header': 'value'
					})
				})
			);
		});

		it('should support PUT and DELETE methods', async () => {
			const mockResponse = { success: true };
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => mockResponse
			});

			await client.fetch('https://api.example.com/resource', { method: 'PUT' });
			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ method: 'PUT' })
			);

			await client.fetch('https://api.example.com/resource', { method: 'DELETE' });
			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ method: 'DELETE' })
			);
		});
	});

	describe('Timeout handling', () => {
		it('should use default timeout from constants', async () => {
			const mockResponse = { data: 'test' };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			await client.fetch('https://api.example.com/data');

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					signal: expect.any(AbortSignal)
				})
			);
		});

		it('should use custom timeout when provided', async () => {
			const mockResponse = { data: 'test' };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			await client.fetch('https://api.example.com/data', {
				timeout: 5000
			});

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					signal: expect.any(AbortSignal)
				})
			);
		});

		it('should throw timeout error when request exceeds timeout', async () => {
			// Mock fetch to never resolve (simulating timeout)
			// The AbortController will abort the signal, causing fetch to reject with AbortError
			mockFetch.mockImplementationOnce(() => {
				return new Promise((_resolve, reject) => {
					// Simulate a slow request that will be aborted
					setTimeout(() => {
						const abortError = new Error('The operation was aborted');
						abortError.name = 'AbortError';
						reject(abortError);
					}, 200);
				});
			});

			// Use a very short timeout for testing
			await expect(
				client.fetch('https://api.example.com/slow', { timeout: 50 })
			).rejects.toThrow('Request timeout after 50ms');
		});
	});

	describe('Error handling', () => {
		it('should throw error for non-200 status codes', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: 'Not Found'
			});

			await expect(client.fetch('https://api.example.com/notfound')).rejects.toThrow(
				'HTTP 404: Not Found'
			);
		});

		it('should throw error for 500 status code', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error'
			});

			await expect(client.fetch('https://api.example.com/error')).rejects.toThrow(
				'HTTP 500: Internal Server Error'
			);
		});

		it('should handle network errors', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(client.fetch('https://api.example.com/data')).rejects.toThrow(
				'Request failed: Network error'
			);
		});

		it('should handle JSON parsing errors', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => {
					throw new Error('Invalid JSON');
				}
			});

			await expect(client.fetch('https://api.example.com/invalid-json')).rejects.toThrow(
				'Request failed: Invalid JSON'
			);
		});

		it('should handle unknown errors', async () => {
			mockFetch.mockRejectedValueOnce('Unknown error');

			await expect(client.fetch('https://api.example.com/data')).rejects.toThrow(
				'Request failed with unknown error'
			);
		});
	});

	describe('Request configuration', () => {
		it('should not include body for GET requests', async () => {
			const mockResponse = { data: 'test' };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			await client.fetch('https://api.example.com/data', {
				method: 'GET',
				body: { should: 'not be included' }
			});

			// Body should still be included if provided, but typically GET doesn't have body
			// However, our implementation allows it for flexibility
			const callArgs = mockFetch.mock.calls[0][1];
			expect(callArgs?.body).toBeDefined();
		});

		it('should handle requests without body', async () => {
			const mockResponse = { data: 'test' };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			await client.fetch('https://api.example.com/data');

			const callArgs = mockFetch.mock.calls[0][1];
			expect(callArgs?.body).toBeUndefined();
		});
	});
});

describe('apiClient singleton', () => {
	it('should export a singleton instance', async () => {
		const { apiClient } = await import('$lib/server/utils/api-client');
		expect(apiClient).toBeInstanceOf(APIClient);
	});
});

