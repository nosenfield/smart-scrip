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
				const url = `${BASE_URL}/rxcui.json?name=${encodeURIComponent(sanitized)}`;
				const response = await apiClient.fetch<RxNormAPIResponse>(url, {
					timeout: API_TIMEOUTS.RXNORM
				});

				const rxcuiId = response.idGroup?.rxnormId?.[0];
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

