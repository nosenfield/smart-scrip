/**
 * API request/response type definitions
 */

import type { SelectedNDC } from './ndc.types';
import type { ParsedSIG } from './prescription.types';

export interface CalculationRequest {
	drugName?: string;
	ndc?: string;
	sig: string;
	daysSupply: number;
}

export interface Warning {
	type: string;
	message: string;
	severity: 'info' | 'warning' | 'error';
}

export interface CalculationResponse {
	success: boolean;
	data?: {
		rxcui: string;
		normalizedDrug: {
			name: string;
			strength: string;
			doseForm: string;
		};
		parsedSIG: ParsedSIG;
		selectedNDCs: SelectedNDC[];
		totalQuantity: number;
		warnings: Warning[];
		aiReasoning?: string;
	};
	error?: string;
	code?: string;
}
