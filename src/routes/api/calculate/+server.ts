/**
 * API endpoint for prescription calculation
 * 
 * POST /api/calculate
 * 
 * Processes prescription requests and returns optimal NDC package selections.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { processCalculation } from '$lib/server/orchestrator/calculation-orchestrator';
import type { CalculationRequest } from '$lib/types';
import { logger } from '$lib/server/utils/logger';

/**
 * POST handler for calculation requests
 * 
 * Accepts JSON request body with prescription details and returns
 * calculation result with selected NDCs and metadata.
 * 
 * @param event - SvelteKit request event
 * @returns JSON response with calculation result or error
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as CalculationRequest;

		logger.info('API request received', {
			drugName: body.drugName,
			ndc: body.ndc,
			daysSupply: body.daysSupply
		});

		const result = await processCalculation(body);

		const statusCode = result.success ? 200 : 400;

		return json(result, { status: statusCode });
	} catch (error) {
		logger.error('API request failed', { error });

		return json(
			{
				success: false,
				error: 'Invalid request format',
				code: 'VALIDATION_ERROR'
			},
			{ status: 400 }
		);
	}
};

