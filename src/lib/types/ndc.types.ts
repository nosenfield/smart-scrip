/**
 * NDC (National Drug Code) related type definitions
 */

export interface NDCPackage {
	ndc: string;
	packageSize: number;
	packageUnit: string;
	status: 'active' | 'inactive';
	manufacturer?: string;
}

export interface SelectedNDC {
	ndc: string;
	quantity: number;
	packageCount: number;
	overfill?: number;
	underfill?: number;
}
