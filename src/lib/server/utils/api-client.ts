/**
 * HTTP Client Utility
 * 
 * Provides a reusable HTTP client with timeout handling and error management
 * for external API integrations.
 */

import { API_TIMEOUTS } from '$lib/config/constants';

export interface FetchOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	headers?: Record<string, string>;
	body?: unknown;
	timeout?: number;
}

export class APIClient {
	/**
	 * Performs an HTTP request with timeout and error handling
	 * @param url - The URL to fetch
	 * @param options - Request options (method, headers, body, timeout)
	 * @returns Promise resolving to the parsed JSON response
	 * @throws Error if request fails, times out, or response is not OK
	 */
	async fetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
		const controller = new AbortController();
		const timeout = options.timeout ?? API_TIMEOUTS.RXNORM;

		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			const response = await fetch(url, {
				method: options.method ?? 'GET',
				headers: {
					'Content-Type': 'application/json',
					...options.headers
				},
				body: options.body ? JSON.stringify(options.body) : undefined,
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return (await response.json()) as T;
		} catch (error) {
			clearTimeout(timeoutId);

			// Handle abort (timeout) errors
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error(`Request timeout after ${timeout}ms`);
			}

			// Re-throw HTTP errors
			if (error instanceof Error && error.message.startsWith('HTTP')) {
				throw error;
			}

			// Handle network errors and JSON parsing errors
			if (error instanceof Error) {
				throw new Error(`Request failed: ${error.message}`);
			}

			throw new Error('Request failed with unknown error');
		}
	}
}

export const apiClient = new APIClient();

