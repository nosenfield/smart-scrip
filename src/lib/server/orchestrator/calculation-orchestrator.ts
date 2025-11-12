/**
 * Calculation orchestrator for prescription processing
 * 
 * Coordinates all services and business logic to process prescription requests
 * and return formatted calculation responses.
 */

import type { CalculationRequest, CalculationResponse, Warning } from '$lib/types';
import * as openaiService from '$lib/server/services/openai.service';
import * as rxnormService from '$lib/server/services/rxnorm.service';
import type { DrugInfo } from '$lib/server/services/rxnorm.service';
import * as fdaNdcService from '$lib/server/services/fda-ndc.service';
import { calculateTotalQuantity } from '$lib/server/logic/quantity-calculator';
import { findBestNDCMatches } from '$lib/server/logic/ndc-matcher';
import { validatePrescriptionInput } from '$lib/server/logic/validation';
import { logger } from '$lib/server/utils/logger';
import { handleAPIError, ValidationError } from '$lib/server/utils/error-handler';

/**
 * Processes a prescription calculation request
 * 
 * Orchestrates the complete workflow:
 * 1. Validates input
 * 2. Parses SIG with OpenAI
 * 3. Normalizes drug name to RxCUI (or validates NDC)
 * 4. Calculates total quantity needed
 * 5. Retrieves available NDCs from FDA
 * 6. Finds best matching NDCs (deterministic)
 * 7. Uses AI for intelligent selection and reasoning
 * 
 * @param request - Calculation request with prescription details
 * @returns Calculation response with selected NDCs and metadata
 * 
 * @example
 * ```typescript
 * const result = await processCalculation({
 *   drugName: 'Lisinopril 10mg tablet',
 *   sig: 'Take 1 tablet by mouth once daily',
 *   daysSupply: 30
 * });
 * ```
 */
export async function processCalculation(
	request: CalculationRequest
): Promise<CalculationResponse> {
	const startTime = Date.now();

	try {
		logger.info('Processing calculation request', { request });

		// Step 1: Validate input
		validatePrescriptionInput(request);

		// Step 2: Parse SIG with OpenAI
		const parsedSIG = await openaiService.parseSIG(request.sig);
		logger.info('SIG parsed', { parsedSIG });

		// Step 3: Normalize drug name to RxCUI (if provided)
		let rxcui: string;
		let normalizedDrug: DrugInfo | undefined;

		if (request.drugName) {
			normalizedDrug = await rxnormService.normalizeToRxCUI(request.drugName);
			rxcui = normalizedDrug.rxcui;
		} else if (request.ndc) {
			// If NDC provided, validate it directly
			const validated = await fdaNdcService.validateNDC(request.ndc);
			if (!validated) {
				return {
					success: false,
					error: 'Invalid or inactive NDC provided',
					code: 'VALIDATION_ERROR'
				};
			}
			// NOTE: Using NDC as RxCUI is a limitation of the current implementation.
			// The FDA API searchNDCsByRxCUI may accept NDC format, but ideally we would
			// extract RxCUI from the validated NDC package or use a different search method.
			// For MVP, this allows NDC-only workflows to proceed, but may need enhancement
			// for production use cases that require proper RxCUI resolution.
			rxcui = request.ndc;
		} else {
			throw new ValidationError('Either drugName or ndc must be provided');
		}

		// Step 4: Calculate total quantity needed
		const quantityResult = calculateTotalQuantity(parsedSIG, request.daysSupply);

		// Step 5: Retrieve available NDCs from FDA
		const availableNDCs = await fdaNdcService.searchNDCsByRxCUI(rxcui);

		if (availableNDCs.length === 0) {
			return {
				success: false,
				error: 'No NDCs found for this medication',
				code: 'BUSINESS_LOGIC_ERROR'
			};
		}

		// Step 6: Find best matching NDCs (deterministic)
		const matchResult = findBestNDCMatches(
			quantityResult.totalQuantity,
			quantityResult.unit,
			availableNDCs
		);

		// Step 7: Use AI for intelligent selection and reasoning
		let aiReasoning: string | undefined;
		let finalWarnings: Warning[] = [...matchResult.warnings];
		let finalSelectedNDCs = matchResult.matches;

		if (matchResult.matches.length > 0) {
			try {
				const aiSelection = await openaiService.selectOptimalNDC({
					requiredQuantity: quantityResult.totalQuantity,
					unit: quantityResult.unit,
					availableNDCs: availableNDCs.map((ndc) => ({
						ndc: ndc.ndc,
						packageSize: ndc.packageSize,
						status: ndc.status
					}))
				});

				aiReasoning = aiSelection.reasoning;
				if (aiSelection.warnings) {
					finalWarnings = [...finalWarnings, ...aiSelection.warnings];
				}

				// Use AI-selected NDCs if provided, otherwise fall back to deterministic matches
				if (aiSelection.selectedNDCs && aiSelection.selectedNDCs.length > 0) {
					// Convert AI selection format to SelectedNDC format
					finalSelectedNDCs = aiSelection.selectedNDCs.map((ai) => ({
						ndc: ai.ndc,
						quantity: ai.totalQuantity,
						packageCount: ai.packageCount
					}));
					logger.info('Using AI-selected NDCs', {
						count: finalSelectedNDCs.length,
						rxcui
					});
				}
			} catch (error) {
				// Graceful degradation: If AI selection fails, continue with deterministic
				// matching result. This ensures the calculation completes even if OpenAI
				// service is unavailable, though without AI reasoning.
				logger.warn('AI selection failed, using deterministic result', {
					error,
					rxcui,
					matchCount: matchResult.matches.length
				});
				// Continue with deterministic result (already set as default)
			}
		}

		const duration = Date.now() - startTime;
		logger.info('Calculation completed', { duration, rxcui });

		return {
			success: true,
			data: {
				rxcui,
				normalizedDrug: {
					name: normalizedDrug?.name || 'Unknown',
					strength: parsedSIG.dose.toString(),
					doseForm: parsedSIG.unit
				},
				parsedSIG,
				selectedNDCs: finalSelectedNDCs,
				totalQuantity: quantityResult.totalQuantity,
				warnings: finalWarnings,
				aiReasoning
			}
		};
	} catch (error) {
		const duration = Date.now() - startTime;
		logger.error('Calculation failed', { error, duration });

		return handleAPIError(error);
	}
}

