/**
 * Environment variable configuration
 * Centralizes access to environment variables with type safety
 */

import {
	OPENAI_API_KEY,
	OPENAI_MODEL,
	RXNORM_API_BASE_URL,
	FDA_NDC_API_BASE_URL
} from '$env/static/private';

export const config = {
	openai: {
		apiKey: OPENAI_API_KEY || '',
		model: OPENAI_MODEL || 'gpt-4o-mini'
	},
	rxnorm: {
		baseUrl: RXNORM_API_BASE_URL || 'https://rxnav.nlm.nih.gov/REST'
	},
	fda: {
		baseUrl: FDA_NDC_API_BASE_URL || 'https://api.fda.gov/drug/ndc.json'
	}
} as const;

/**
 * Validates that required environment variables are set
 * Should be called on server startup
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
	const missing: string[] = [];

	if (!OPENAI_API_KEY) {
		missing.push('OPENAI_API_KEY');
	}

	return {
		valid: missing.length === 0,
		missing
	};
}
