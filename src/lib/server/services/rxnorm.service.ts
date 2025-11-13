/**
 * RxNorm Service
 * 
 * Provides drug name normalization using the RxNorm API.
 * Converts drug names to RxCUI (RxNorm Concept Unique Identifier) for
 * standardized drug identification.
 */

import { apiClient } from '$lib/server/utils/api-client';
import { API_TIMEOUTS, INPUT_CONSTRAINTS } from '$lib/config/constants';
import { ExternalAPIError, ValidationError } from '$lib/server/utils/error-handler';
import { logger } from '$lib/server/utils/logger';
import { retryWithBackoff } from '$lib/server/utils/retry';
import type {
	RxNormAPIResponse,
	RxNormPropertiesResponse
} from '$lib/types/external-api.types';

const BASE_URL = process.env.RXNORM_API_BASE_URL || 'https://rxnav.nlm.nih.gov/REST';

export interface DrugInfo {
	rxcui: string;
	name: string;
	synonym?: string;
	tty?: string;
}

/**
 * Normalizes a drug name to RxCUI (RxNorm Concept Unique Identifier)
 * 
 * **Current Approach:**
 * 1. Tries exact match using `/rxcui.json?name=` endpoint
 * 2. Falls back to approximate match using `/approximateTerm.json?term=` endpoint
 * 3. Fetches properties using `/rxcui/{rxcui}/properties.json`
 * 
 * **Alternative Endpoint (not currently used):**
 * - `/drugs.json?name=` - Returns multiple related drug products
 *   - Better for ingredient/brand name searches (e.g., "Metformin")
 *   - Less effective for specific dosage forms (e.g., "Lisinopril 10mg tablet")
 *   - Returns multiple matches that would require selection logic
 *   - See: https://lhncbc.nlm.nih.gov/RxNav/APIs/api-RxNorm.getDrugs.html
 * 
 * @param drugName - The drug name to normalize (e.g., "aspirin", "ibuprofen 200mg")
 * @returns Drug information including RxCUI, name, and optional synonym/type
 * @throws ValidationError if drug name is invalid
 * @throws ExternalAPIError if API call fails
 * 
 * @example
 * ```typescript
 * const drugInfo = await normalizeToRxCUI("aspirin");
 * // Returns: { rxcui: "1191", name: "Aspirin", tty: "SBD" }
 * ```
 */
export async function normalizeToRxCUI(drugName: string): Promise<DrugInfo> {
	// Validate input
	if (!drugName || typeof drugName !== 'string') {
		throw new ValidationError('Drug name is required');
	}

	// Sanitize and validate drug name
	const sanitized = drugName.trim().replace(/[<>]/g, '').slice(0, INPUT_CONSTRAINTS.DRUG_NAME_MAX_LENGTH);
	if (sanitized.length === 0) {
		throw new ValidationError('Drug name cannot be empty');
	}

	logger.info('Normalizing drug name to RxCUI', { drugName: sanitized });

	try {
		const rxcui = await retryWithBackoff(
			async () => {
				// First try exact match
				const exactUrl = `${BASE_URL}/rxcui.json?name=${encodeURIComponent(sanitized)}`;
				const exactResponse = await apiClient.fetch<RxNormAPIResponse>(exactUrl, {
					timeout: API_TIMEOUTS.RXNORM
				});

				let rxcuiId = exactResponse.idGroup?.rxnormId?.[0];
				
				// If exact match fails, try approximate match
				if (!rxcuiId) {
					logger.info('Exact match failed, trying approximate match', { drugName: sanitized });
					const approxUrl = `${BASE_URL}/approximateTerm.json?term=${encodeURIComponent(sanitized)}&maxEntries=1`;
					const approxResponse = await apiClient.fetch<{
						approximateGroup?: {
							candidate?: Array<{ rxcui: string }>;
						};
					}>(approxUrl, {
						timeout: API_TIMEOUTS.RXNORM
					});

					rxcuiId = approxResponse.approximateGroup?.candidate?.[0]?.rxcui;
				}

				if (!rxcuiId) {
					throw new Error(`No RxCUI found for drug: ${sanitized}`);
				}

				return rxcuiId;
			},
			{ maxRetries: 3 }
		);

		// Get properties for the RxCUI
		const properties = await getRxCUIProperties(rxcui);

		logger.info('Drug normalized successfully', { drugName: sanitized, rxcui });

		return {
			rxcui,
			name: properties.name || sanitized,
			synonym: properties.synonym,
			tty: properties.tty
		};
	} catch (error) {
		logger.error('Failed to normalize drug name', { error, drugName: sanitized });
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new ExternalAPIError('Failed to normalize drug name with RxNorm');
	}
}

/**
 * Gets RxCUI from an NDC code
 * 
 * **NDC Format Notes:**
 * - RxNorm accepts NDCs WITH dashes for lookup (e.g., "65862-045-00")
 * - RxNorm does NOT accept NDCs without dashes (e.g., "6586204500" returns null)
 * - RxNorm's `getNDCs` API returns NDCs WITHOUT dashes (CMS 11-digit format)
 * - FDA API uses dashes, which matches our input format
 * 
 * @param ndc - The NDC code (e.g., "12345-678-90")
 * @returns RxCUI string if found, null if not found
 * @throws ValidationError if ndc is invalid
 * @throws ExternalAPIError if API call fails
 * 
 * @example
 * ```typescript
 * const rxcui = await getRxCUIFromNDC("12345-678-90");
 * // Returns: "314076" or null
 * ```
 * 
 * @see https://lhncbc.nlm.nih.gov/RxNav/APIs/api-RxNorm.getNDCs.html
 */
export async function getRxCUIFromNDC(ndc: string): Promise<string | null> {
	// Validate input
	if (!ndc || typeof ndc !== 'string') {
		throw new ValidationError('NDC is required');
	}

	const sanitized = ndc.trim();
	logger.info('Getting RxCUI from NDC', { ndc: sanitized });

	try {
		const rxcui = await retryWithBackoff(
			async () => {
				// RxNorm API endpoint for NDC to RxCUI conversion
				// Note: RxNorm accepts NDCs WITH dashes (e.g., "65862-045-00")
				// but returns NDCs WITHOUT dashes from getNDCs API
				// Try full NDC first (package NDC format: XXXXX-XXXX-XX)
				let url = `${BASE_URL}/rxcui.json?idtype=NDC&id=${encodeURIComponent(sanitized)}`;
				let response = await apiClient.fetch<RxNormAPIResponse>(url, {
					timeout: API_TIMEOUTS.RXNORM
				});

				let rxcuiId = response.idGroup?.rxnormId?.[0];

				// If full NDC doesn't work, try product NDC (without package code)
				// NDC format: XXXXX-XXXX-XX, product NDC is XXXXX-XXXX
				if (!rxcuiId && sanitized.includes('-')) {
					const parts = sanitized.split('-');
					if (parts.length === 3) {
						const productNDC = `${parts[0]}-${parts[1]}`;
						logger.info('Trying product NDC format', { productNDC, originalNDC: sanitized });
						url = `${BASE_URL}/rxcui.json?idtype=NDC&id=${encodeURIComponent(productNDC)}`;
						response = await apiClient.fetch<RxNormAPIResponse>(url, {
							timeout: API_TIMEOUTS.RXNORM
						});
						rxcuiId = response.idGroup?.rxnormId?.[0];
					}
				}

				return rxcuiId || null;
			},
			{ maxRetries: 3 }
		);

		if (rxcui) {
			logger.info('RxCUI found for NDC', { ndc: sanitized, rxcui });
		} else {
			logger.warn('No RxCUI found for NDC', { ndc: sanitized });
		}

		return rxcui;
	} catch (error) {
		logger.error('Failed to get RxCUI from NDC', { error, ndc: sanitized });
		if (error instanceof ValidationError) {
			throw error;
		}
		// Return null instead of throwing - NDC might not have RxCUI mapping
		return null;
	}
}

/**
 * Fetches properties for a given RxCUI
 * 
 * @param rxcui - The RxCUI identifier
 * @returns Partial drug information (name, synonym, type)
 * @throws ExternalAPIError if API call fails
 * 
 * @example
 * ```typescript
 * const properties = await getRxCUIProperties("1191");
 * // Returns: { name: "Aspirin", synonym: "Aspirin", tty: "SBD" }
 * ```
 */
export async function getRxCUIProperties(rxcui: string): Promise<Partial<DrugInfo>> {
	// Validate RxCUI format (should be non-empty string)
	if (!rxcui || typeof rxcui !== 'string' || rxcui.trim().length === 0) {
		logger.warn('Invalid RxCUI provided', { rxcui });
		return {};
	}

	logger.info('Fetching RxCUI properties', { rxcui });

	try {
		const url = `${BASE_URL}/rxcui/${rxcui}/properties.json`;
		const response = await apiClient.fetch<RxNormPropertiesResponse>(url, {
			timeout: API_TIMEOUTS.RXNORM
		});

		return {
			name: response.properties?.name,
			synonym: response.properties?.synonym,
			tty: response.properties?.tty
		};
	} catch (error) {
		logger.warn('Failed to fetch RxCUI properties', { error, rxcui });
		// Return empty object instead of throwing - properties are optional
		return {};
	}
}

