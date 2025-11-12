/**
 * OpenAI Service
 * 
 * Provides AI-powered parsing and selection logic for prescription processing.
 * Uses OpenAI API for:
 * - SIG (prescription directions) parsing
 * - Optimal NDC package selection
 */

import OpenAI from 'openai';
import type { ParsedSIG } from '$lib/types';
import { API_TIMEOUTS, INPUT_CONSTRAINTS } from '$lib/config/constants';
import { ExternalAPIError, ValidationError } from '$lib/server/utils/error-handler';
import { logger } from '$lib/server/utils/logger';
import { retryWithBackoff } from '$lib/server/utils/retry';

// Initialize OpenAI client
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	timeout: API_TIMEOUTS.OPENAI
});

// Model configuration - defaults to gpt-4o-mini for cost efficiency
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Input for NDC selection function
 */
export interface NDCSelectionInput {
	requiredQuantity: number;
	unit: string;
	availableNDCs: Array<{
		ndc: string;
		packageSize: number;
		status: string;
	}>;
}

/**
 * Response from OpenAI NDC selection
 */
export interface NDCSelectionResult {
	selectedNDCs: Array<{
		ndc: string;
		packageCount: number;
		totalQuantity: number;
	}>;
	reasoning: string;
	warnings: Array<{
		type: string;
		message: string;
		severity: 'info' | 'warning' | 'error';
	}>;
}

/**
 * Parses prescription SIG (directions) text into structured data
 * 
 * @param sigText - The prescription directions text (e.g., "Take 1 tablet by mouth twice daily")
 * @returns Parsed SIG with dose, unit, frequency, route, and instructions
 * @throws ExternalAPIError if parsing fails
 * 
 * @example
 * ```typescript
 * const parsed = await parseSIG("Take 1 tablet by mouth twice daily");
 * // Returns: { dose: 1, unit: "tablet", frequency: 2, route: "oral", specialInstructions: "" }
 * ```
 */
export async function parseSIG(sigText: string): Promise<ParsedSIG> {
	// Validate input
	if (!sigText || typeof sigText !== 'string') {
		throw new ValidationError('SIG text is required');
	}

	const sanitized = sigText.trim();
	if (sanitized.length === 0) {
		throw new ValidationError('SIG text cannot be empty');
	}

	if (sanitized.length > INPUT_CONSTRAINTS.SIG_MAX_LENGTH) {
		throw new ValidationError(
			`SIG text exceeds maximum length of ${INPUT_CONSTRAINTS.SIG_MAX_LENGTH} characters`
		);
	}

	logger.info('Parsing SIG with OpenAI', { sigText: sanitized });

	const prompt = `You are a pharmacy AI assistant. Parse the following prescription SIG into structured JSON.

SIG: "${sanitized}"

Return ONLY valid JSON matching this exact schema (no markdown, no explanations):
{
  "dose": number,
  "unit": string,
  "frequency": number,
  "route": string,
  "specialInstructions": string
}`;

	try {
		const result = await retryWithBackoff(
			async () => {
				const completion = await openai.chat.completions.create({
					model: MODEL,
					messages: [{ role: 'user', content: prompt }],
					response_format: { type: 'json_object' },
					temperature: 0.1 // Low temperature for consistent parsing
				});

				const content = completion.choices[0]?.message?.content;
				if (!content) {
					throw new Error('No response from OpenAI');
				}

				return JSON.parse(content) as ParsedSIG;
			},
			{ maxRetries: 2 }
		);

		logger.info('SIG parsed successfully', { result });
		return result;
	} catch (error) {
		logger.error('Failed to parse SIG', { error, sigText: sanitized });
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new ExternalAPIError('Failed to parse prescription directions');
	}
}

/**
 * Selects optimal NDC package(s) for a prescription requirement
 * 
 * Uses AI to analyze available NDC packages and select the best option(s)
 * considering waste minimization, package count, and status warnings.
 * 
 * @param input - Required quantity, unit, and available NDC packages
 * @returns Selection result with chosen NDCs, reasoning, and warnings
 * @throws ExternalAPIError if selection fails
 * 
 * @example
 * ```typescript
 * const result = await selectOptimalNDC({
 *   requiredQuantity: 30,
 *   unit: "tablet",
 *   availableNDCs: [
 *     { ndc: "12345-678-90", packageSize: 30, status: "active" },
 *     { ndc: "12345-678-91", packageSize: 60, status: "active" }
 *   ]
 * });
 * ```
 */
export async function selectOptimalNDC(input: NDCSelectionInput): Promise<NDCSelectionResult> {
	// Validate input
	if (!input || typeof input !== 'object') {
		throw new ValidationError('NDC selection input is required');
	}

	if (typeof input.requiredQuantity !== 'number' || input.requiredQuantity <= 0) {
		throw new ValidationError('Required quantity must be a positive number');
	}

	if (!input.unit || typeof input.unit !== 'string' || input.unit.trim().length === 0) {
		throw new ValidationError('Unit is required');
	}

	if (!Array.isArray(input.availableNDCs)) {
		throw new ValidationError('Available NDCs must be an array');
	}

	if (input.availableNDCs.length === 0) {
		throw new ValidationError('At least one NDC must be available');
	}

	logger.info('Selecting optimal NDC with OpenAI', { input });

	const prompt = `You are a pharmacy AI assistant selecting the optimal NDC package(s) for a prescription.

Required quantity: ${input.requiredQuantity} ${input.unit}
Available NDCs: ${JSON.stringify(input.availableNDCs, null, 2)}

Select the best option(s) considering:
- Minimize waste (prefer exact matches)
- Prefer single packages over multiple
- Flag inactive NDCs with warnings
- Warn about significant overfills/underfills

Return ONLY valid JSON matching this schema:
{
  "selectedNDCs": [
    {
      "ndc": string,
      "packageCount": number,
      "totalQuantity": number
    }
  ],
  "reasoning": string,
  "warnings": [
    {
      "type": string,
      "message": string,
      "severity": "info" | "warning" | "error"
    }
  ]
}`;

	try {
		const result = await retryWithBackoff(
			async () => {
				const completion = await openai.chat.completions.create({
					model: MODEL,
					messages: [{ role: 'user', content: prompt }],
					response_format: { type: 'json_object' },
					temperature: 0.3 // Slightly higher for selection logic
				});

				const content = completion.choices[0]?.message?.content;
				if (!content) {
					throw new Error('No response from OpenAI');
				}

				return JSON.parse(content) as NDCSelectionResult;
			},
			{ maxRetries: 2 }
		);

		logger.info('NDC selection completed', { result });
		return result;
	} catch (error) {
		logger.error('Failed to select NDC', { error, input });
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new ExternalAPIError('Failed to select optimal NDC');
	}
}

