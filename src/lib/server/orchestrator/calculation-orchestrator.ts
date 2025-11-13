/**
 * Calculation orchestrator for prescription processing
 * 
 * Coordinates all services and business logic to process prescription requests
 * and return formatted calculation responses.
 */

import type { CalculationRequest, CalculationResponse, Warning, NDCPackage } from '$lib/types';
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
			// If NDC provided, try to get RxCUI from RxNorm API first (standardized lookup)
			const ndcRxCUI = await rxnormService.getRxCUIFromNDC(request.ndc);
			if (ndcRxCUI) {
				// RxCUI found - use it for standardized lookup (preferred method)
				rxcui = ndcRxCUI;
				logger.info('RxCUI found for NDC, using standardized lookup', { ndc: request.ndc, rxcui });
			} else {
				// No RxCUI found - validate NDC with FDA and extract generic name
				logger.info('No RxCUI found for NDC, validating with FDA', { ndc: request.ndc });
				const validated = await fdaNdcService.validateNDC(request.ndc);
				if (!validated) {
					return {
						success: false,
						error: 'Invalid or inactive NDC provided',
						code: 'VALIDATION_ERROR'
					};
				}
				// Extract generic name from validated NDC for fallback search
				const genericName = validated.genericName;
				if (genericName) {
					// Store generic name for fallback search (will be used if RxCUI search fails)
					normalizedDrug = { rxcui: '', name: genericName, synonym: undefined, tty: undefined };
					logger.info('Extracted generic name from validated NDC', { ndc: request.ndc, genericName });
				}
				// Set empty RxCUI - FDA search will fail, but we'll fall back to generic name search
				rxcui = '';
				logger.warn('No RxCUI mapping found for NDC, will fallback to generic name search', { ndc: request.ndc });
			}
		} else {
			throw new ValidationError('Either drugName or ndc must be provided');
		}

		// Step 4: Calculate total quantity needed
		const quantityResult = calculateTotalQuantity(parsedSIG, request.daysSupply);

		// Step 5: Retrieve available NDCs from FDA
		// Try RxCUI search first (if we have one), fallback to generic name if no results
		let availableNDCs: NDCPackage[] = [];
		if (rxcui) {
			try {
				availableNDCs = await fdaNdcService.searchNDCsByRxCUI(rxcui);
			} catch (error) {
				// FDA API doesn't support RxCUI search - this is expected
				// Log and continue to fallback search
				logger.info('RxCUI search failed (FDA API limitation), using fallback', {
					rxcui,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
				availableNDCs = [];
			}
		}

		// If RxCUI search returns no results, try generic name search as fallback
		if (availableNDCs.length === 0 && normalizedDrug?.name) {
			logger.info('RxCUI search returned no results, trying generic name search', {
				rxcui,
				genericName: normalizedDrug.name
			});
			availableNDCs = await fdaNdcService.searchNDCsByGenericName(normalizedDrug.name);
		}

		// If still no results and we have a drug name, try that as well
		if (availableNDCs.length === 0 && request.drugName) {
			logger.info('Generic name search returned no results, trying original drug name', {
				drugName: request.drugName
			});
			availableNDCs = await fdaNdcService.searchNDCsByGenericName(request.drugName);
		}

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

