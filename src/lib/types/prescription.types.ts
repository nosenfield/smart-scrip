/**
 * Prescription-related type definitions
 */

export interface ParsedSIG {
	dose: number;
	unit: string;
	frequency: number;
	route: string;
	duration?: number;
	specialInstructions?: string;
}

export interface PrescriptionInput {
	drugName?: string;
	ndc?: string;
	sig: string;
	daysSupply: number;
}
