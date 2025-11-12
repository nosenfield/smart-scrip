/**
 * External API Response Types
 * 
 * TypeScript interfaces for external API responses (RxNorm, FDA NDC, OpenAI).
 * These types match the actual API response structures.
 */

// RxNorm API Response Types
export interface RxNormAPIResponse {
	idGroup?: {
		rxnormId?: string[];
	};
}

export interface RxNormPropertiesResponse {
	properties?: {
		name?: string;
		synonym?: string;
		tty?: string;
		language?: string;
		suppress?: string;
		umlscui?: string;
	};
}

// FDA NDC API Response Types
export interface FDANDCAPIResponse {
	meta?: {
		disclaimer: string;
		terms: string;
		license: string;
		last_updated: string;
	};
	results?: Array<{
		product_ndc: string;
		generic_name: string;
		brand_name?: string;
		brand_name_base?: string;
		brand_name_suffix?: string;
		product_type: string;
		route?: string[];
		marketing_start_date?: string;
		marketing_end_date?: string;
		marketing_category: string;
		application_number?: string;
		labeler_name: string;
		substance_name?: string;
		active_ingredients: Array<{
			name: string;
			strength: string;
		}>;
		finished?: boolean;
		packaging?: Array<{
			package_ndc: string;
			description: string;
			marketing_start_date?: string;
			sample?: boolean;
		}>;
		listing_expiration_date?: string;
		marketing_status: string;
	}>;
}

// OpenAI API Response Types (for structured outputs)
export interface OpenAIParsedSIG {
	dose: number;
	unit: string;
	frequency: number;
	route: string;
	duration?: number;
	specialInstructions?: string;
}

export interface OpenAINDCSelection {
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

