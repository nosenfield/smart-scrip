/**
 * FDA NDC Service
 * 
 * Provides NDC (National Drug Code) lookup and validation using the FDA NDC Directory API.
 * Supports searching NDCs by RxCUI and validating individual NDC codes.
 */

import { apiClient } from '$lib/server/utils/api-client';
import { API_TIMEOUTS } from '$lib/config/constants';
import type { NDCPackage } from '$lib/types';
import type { FDANDCAPIResponse } from '$lib/types/external-api.types';
import { ExternalAPIError, ValidationError } from '$lib/server/utils/error-handler';
import { logger } from '$lib/server/utils/logger';
import { retryWithBackoff } from '$lib/server/utils/retry';

const BASE_URL = process.env.FDA_NDC_API_BASE_URL || 'https://api.fda.gov/drug/ndc.json';

/**
 * Searches for NDC packages by RxCUI (RxNorm Concept Unique Identifier)
 * 
 * @param rxcui - The RxCUI identifier to search for
 * @returns Array of NDC packages matching the RxCUI
 * @throws ValidationError if rxcui is invalid
 * @throws ExternalAPIError if API call fails
 * 
 * @example
 * ```typescript
 * const packages = await searchNDCsByRxCUI("1191");
 * // Returns: [{ ndc: "12345-678-90", packageSize: 100, packageUnit: "tablet", status: "active", ... }]
 * ```
 */
export async function searchNDCsByRxCUI(rxcui: string): Promise<NDCPackage[]> {
	// Validate input
	if (!rxcui || typeof rxcui !== 'string' || rxcui.trim().length === 0) {
		throw new ValidationError('RxCUI is required');
	}

	const sanitized = rxcui.trim();
	logger.info('Searching NDCs by RxCUI', { rxcui: sanitized });

	try {
		const result = await retryWithBackoff(
			async () => {
				// Use openfda.rxcui field for RxCUI search (FDA API structure)
				const url = `${BASE_URL}?search=openfda.rxcui:${sanitized}&limit=100`;
				const response = await apiClient.fetch<FDANDCAPIResponse>(url, {
					timeout: API_TIMEOUTS.FDA_NDC
				});

				if (!response.results || response.results.length === 0) {
					return [];
				}

				return parseNDCPackages(response.results);
			},
			{
				maxRetries: 3,
				shouldRetry: (error) => {
					// Don't retry if no results found (not an error condition)
					return !(error instanceof Error && error.message.includes('No results'));
				}
			}
		);

		logger.info('NDCs found', { rxcui: sanitized, count: result.length });
		return result;
	} catch (error) {
		logger.error('Failed to search NDCs', { error, rxcui: sanitized });
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new ExternalAPIError('Failed to retrieve NDC data from FDA');
	}
}

/**
 * Searches for NDC packages by generic name
 * 
 * @param genericName - The generic drug name to search for (e.g., "Lisinopril")
 * @returns Array of NDC packages matching the generic name
 * @throws ValidationError if genericName is invalid
 * @throws ExternalAPIError if API call fails
 * 
 * @example
 * ```typescript
 * const packages = await searchNDCsByGenericName("Lisinopril");
 * // Returns: [{ ndc: "12345-678-90", packageSize: 100, packageUnit: "tablet", status: "active", ... }]
 * ```
 */
export async function searchNDCsByGenericName(genericName: string): Promise<NDCPackage[]> {
	// Validate input
	if (!genericName || typeof genericName !== 'string' || genericName.trim().length === 0) {
		throw new ValidationError('Generic name is required');
	}

	const sanitized = genericName.trim();
	logger.info('Searching NDCs by generic name', { genericName: sanitized });

	try {
		const result = await retryWithBackoff(
			async () => {
				// Extract base generic name (remove dosage info like "10mg" or "10 MG")
				// Match patterns like "10mg", "10 MG", "10mg/ml", etc.
				const baseName = sanitized.split(/\s+\d+\s*(mg|ml|g|mcg|iu|unit)/i)[0].trim();
				const url = `${BASE_URL}?search=generic_name:"${baseName}"&limit=100`;
				const response = await apiClient.fetch<FDANDCAPIResponse>(url, {
					timeout: API_TIMEOUTS.FDA_NDC
				});

				if (!response.results || response.results.length === 0) {
					return [];
				}

				return parseNDCPackages(response.results);
			},
			{
				maxRetries: 3,
				shouldRetry: (error) => {
					// Don't retry if no results found (not an error condition)
					return !(error instanceof Error && error.message.includes('No results'));
				}
			}
		);

		logger.info('NDCs found by generic name', { genericName: sanitized, count: result.length });
		return result;
	} catch (error) {
		logger.error('Failed to search NDCs by generic name', { error, genericName: sanitized });
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new ExternalAPIError('Failed to retrieve NDC data from FDA');
	}
}

/**
 * Validates an NDC code and returns package information if found
 * 
 * @param ndc - The NDC code to validate (e.g., "12345-678-90")
 * @returns Object with package and generic name if found, null if not found
 * @throws ValidationError if ndc is invalid
 * @throws ExternalAPIError if API call fails
 * 
 * @example
 * ```typescript
 * const result = await validateNDC("12345-678-90");
 * // Returns: { package: { ndc: "12345-678-90", ... }, genericName: "Lisinopril" } or null
 * ```
 */
export async function validateNDC(ndc: string): Promise<{ package: NDCPackage; genericName: string } | null> {
	// Validate input
	if (!ndc || typeof ndc !== 'string' || ndc.trim().length === 0) {
		throw new ValidationError('NDC is required');
	}

	const sanitized = ndc.trim();
	logger.info('Validating NDC', { ndc: sanitized });

	try {
		const result = await retryWithBackoff(
			async () => {
				// Try package_ndc first (more specific), then product_ndc as fallback
				let url = `${BASE_URL}?search=package_ndc:"${sanitized}"&limit=1`;
				let response = await apiClient.fetch<FDANDCAPIResponse>(url, {
					timeout: API_TIMEOUTS.FDA_NDC
				});

				// If package_ndc search returns no results, try product_ndc
				// Extract product NDC (first two parts: XXXXX-XXXX) from package NDC (XXXXX-XXXX-XX)
				if (!response.results || response.results.length === 0) {
					logger.info('Package NDC search returned no results, trying product NDC', { ndc: sanitized });
					let productNDC = sanitized;
					if (sanitized.includes('-')) {
						const parts = sanitized.split('-');
						if (parts.length === 3) {
							productNDC = `${parts[0]}-${parts[1]}`;
							logger.info('Extracted product NDC from package NDC', { packageNDC: sanitized, productNDC });
						}
					}
					url = `${BASE_URL}?search=product_ndc:"${productNDC}"&limit=10`;
					response = await apiClient.fetch<FDANDCAPIResponse>(url, {
						timeout: API_TIMEOUTS.FDA_NDC
					});
				}

				if (!response.results || response.results.length === 0) {
					return null;
				}

				const packages = parseNDCPackages(response.results);
				// Find the exact NDC match in the results
				const exactMatch = packages.find(pkg => pkg.ndc === sanitized) || packages[0];
				
				if (!exactMatch) {
					return null;
				}

				// Extract generic name from the first result
				const genericName = response.results[0]?.generic_name || '';
				
				return {
					package: exactMatch,
					genericName
				};
			},
			{
				maxRetries: 3,
				shouldRetry: (error) => {
					// Don't retry if no results found (not an error condition)
					return !(error instanceof Error && error.message.includes('No results'));
				}
			}
		);

		return result;
	} catch (error) {
		logger.error('Failed to validate NDC', { error, ndc: sanitized });
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new ExternalAPIError('Failed to validate NDC with FDA');
	}
}

/**
 * Parses FDA API response into NDCPackage array
 * 
 * @param results - FDA API response results array
 * @returns Array of NDCPackage objects
 */
function parseNDCPackages(results: FDANDCAPIResponse['results']): NDCPackage[] {
	if (!results) return [];

	const packages: NDCPackage[] = [];

	for (const result of results) {
		// Treat null/undefined marketing_status as 'active' (FDA API often omits this field)
		// Only mark as 'inactive' if explicitly set to a non-active value
		const status = result.marketing_status == null || result.marketing_status?.toLowerCase().includes('active')
			? 'active'
			: 'inactive';

		if (result.packaging && result.packaging.length > 0) {
			// Multiple packaging options available
			for (const pkg of result.packaging) {
				packages.push({
					ndc: pkg.package_ndc,
					packageSize: extractPackageSize(pkg.description),
					packageUnit: extractPackageUnit(pkg.description),
					status,
					manufacturer: result.brand_name
				});
			}
		} else {
			// No specific packaging info, use product NDC
			packages.push({
				ndc: result.product_ndc,
				packageSize: 1,
				packageUnit: 'unit',
				status,
				manufacturer: result.brand_name
			});
		}
	}

	return packages;
}

/**
 * Extracts package size from description string
 * 
 * @param description - Package description (e.g., "100 TABLET in 1 BOTTLE")
 * @returns Package size as number (defaults to 1 if not found)
 */
function extractPackageSize(description: string): number {
	if (!description || typeof description !== 'string') {
		return 1;
	}

	const match = description.match(/^(\d+)/);
	return match ? parseInt(match[1], 10) : 1;
}

/**
 * Extracts package unit from description string
 * 
 * @param description - Package description (e.g., "100 TABLET in 1 BOTTLE")
 * @returns Package unit as lowercase string (defaults to "unit" if not found)
 */
function extractPackageUnit(description: string): string {
	if (!description || typeof description !== 'string') {
		return 'unit';
	}

	const match = description.match(/^\d+\s+(\w+)/);
	return match ? match[1].toLowerCase() : 'unit';
}

