/**
 * NDC matching logic for prescription processing
 * 
 * Matches required prescription quantities with available NDC packages,
 * finding optimal combinations and generating appropriate warnings.
 */

import type { NDCPackage, SelectedNDC, Warning } from '$lib/types';
import { WARNING_TYPES } from '$lib/config/constants';
import { logger } from '$lib/server/utils/logger';

/**
 * Result of NDC matching operation
 */
export interface MatchResult {
	matches: SelectedNDC[];
	warnings: Warning[];
}

/**
 * Finds the best NDC package matches for a required quantity
 * 
 * Matching strategy:
 * 1. Filters to active NDCs only
 * 2. Filters by matching unit
 * 3. Tries to find exact match
 * 4. Falls back to closest match or optimal combination
 * 
 * @param requiredQuantity - Required quantity to match
 * @param requiredUnit - Required unit (e.g., 'tablet', 'ml')
 * @param availableNDCs - Available NDC packages to choose from
 * @returns Match result with selected NDCs and warnings
 * 
 * @example
 * ```typescript
 * const result = findBestNDCMatches(30, 'tablet', [
 *   { ndc: '12345-678-90', packageSize: 30, packageUnit: 'tablet', status: 'active' }
 * ]);
 * ```
 */
export function findBestNDCMatches(
	requiredQuantity: number,
	requiredUnit: string,
	availableNDCs: NDCPackage[]
): MatchResult {
	logger.info('Finding best NDC matches', { requiredQuantity, requiredUnit, count: availableNDCs.length });

	const warnings: Warning[] = [];

	// Handle zero or negative quantity requirement
	if (requiredQuantity <= 0) {
		return { matches: [], warnings };
	}

	// Filter to active NDCs only
	const activeNDCs = availableNDCs.filter((ndc) => ndc.status === 'active');

	if (activeNDCs.length === 0 && availableNDCs.length > 0) {
		warnings.push({
			type: WARNING_TYPES.INACTIVE_NDC,
			message: 'Only inactive NDCs found. Contact prescriber for alternatives.',
			severity: 'error'
		});
		return { matches: [], warnings };
	}

	if (activeNDCs.length === 0) {
		warnings.push({
			type: WARNING_TYPES.NO_EXACT_MATCH,
			message: 'No matching NDCs found for this medication.',
			severity: 'error'
		});
		return { matches: [], warnings };
	}

	// Filter by matching unit
	const matchingUnitNDCs = activeNDCs.filter(
		(ndc) => ndc.packageUnit.toLowerCase() === requiredUnit.toLowerCase()
	);

	if (matchingUnitNDCs.length === 0) {
		warnings.push({
			type: WARNING_TYPES.NO_EXACT_MATCH,
			message: `No packages found with unit: ${requiredUnit}`,
			severity: 'warning'
		});
		// Fallback to all active NDCs
		return findClosestMatch(requiredQuantity, activeNDCs, warnings);
	}

	// Try to find exact match
	const exactMatch = matchingUnitNDCs.find(
		(ndc) => ndc.packageSize === requiredQuantity
	);

	if (exactMatch) {
		logger.info('Exact NDC match found', { ndc: exactMatch.ndc });
		return {
			matches: [
				{
					ndc: exactMatch.ndc,
					quantity: requiredQuantity,
					packageCount: 1,
					overfill: 0,
					underfill: 0
				}
			],
			warnings
		};
	}

	// Try to find closest single package match first
	const closestMatch = findClosestMatch(requiredQuantity, matchingUnitNDCs, warnings);
	if (closestMatch.matches.length === 1 && closestMatch.matches[0].packageCount === 1) {
		return closestMatch;
	}

	// Need multiple packages
	if (requiredQuantity > 0) {
		warnings.push({
			type: WARNING_TYPES.MULTIPLE_PACKAGES,
			message: 'Multiple packages required to meet quantity',
			severity: 'info'
		});
	}
	return findOptimalCombination(requiredQuantity, matchingUnitNDCs, warnings);
}

/**
 * Finds the closest single package match when exact match not available
 * 
 * @param requiredQuantity - Required quantity
 * @param availableNDCs - Available NDC packages
 * @param warnings - Warnings array to append to
 * @returns Match result
 */
function findClosestMatch(
	requiredQuantity: number,
	availableNDCs: NDCPackage[],
	warnings: Warning[]
): MatchResult {
	// Sort by package size (smallest first)
	const sorted = [...availableNDCs].sort((a, b) => a.packageSize - b.packageSize);

	// Find smallest package that meets or exceeds requirement
	const bestMatch = sorted.find((ndc) => ndc.packageSize >= requiredQuantity);

	if (bestMatch) {
		const overfill = bestMatch.packageSize - requiredQuantity;
		if (overfill > 0) {
			warnings.push({
				type: WARNING_TYPES.OVERFILL,
				message: `Overfill of ${overfill} ${bestMatch.packageUnit}`,
				severity: 'warning'
			});
		}

		return {
			matches: [
				{
					ndc: bestMatch.ndc,
					quantity: bestMatch.packageSize,
					packageCount: 1,
					overfill
				}
			],
			warnings
		};
	}

	// No single package large enough, need multiple packages
	// Try to find optimal combination that minimizes waste
	if (requiredQuantity > 0) {
		warnings.push({
			type: WARNING_TYPES.MULTIPLE_PACKAGES,
			message: 'Multiple packages required to meet quantity',
			severity: 'info'
		});
	}

	return findOptimalCombination(requiredQuantity, availableNDCs, warnings);
}

/**
 * Finds optimal combination of packages to meet required quantity
 * 
 * Uses a greedy algorithm: selects largest packages first to minimize package count.
 * This prioritizes fewer packages over minimal waste. For true waste minimization,
 * a more complex algorithm (e.g., dynamic programming) would be needed.
 * 
 * Handles remaining quantity by adding smallest package (causes overfill).
 * 
 * @param requiredQuantity - Required quantity
 * @param availableNDCs - Available NDC packages
 * @param warnings - Warnings array to append to
 * @returns Match result with multiple packages if needed
 */
function findOptimalCombination(
	requiredQuantity: number,
	availableNDCs: NDCPackage[],
	warnings: Warning[]
): MatchResult {
	// Sort by package size (largest first)
	const sorted = [...availableNDCs].sort((a, b) => b.packageSize - a.packageSize);

	const selected: SelectedNDC[] = [];
	let remainingQuantity = requiredQuantity;

	for (const ndc of sorted) {
		if (remainingQuantity <= 0) break;

		const packagesNeeded = Math.floor(remainingQuantity / ndc.packageSize);
		if (packagesNeeded > 0) {
			selected.push({
				ndc: ndc.ndc,
				quantity: ndc.packageSize * packagesNeeded,
				packageCount: packagesNeeded
			});
			remainingQuantity -= ndc.packageSize * packagesNeeded;
		}
	}

	// Handle any remaining quantity (underfill)
	if (remainingQuantity > 0) {
		// Find smallest package that can cover the remainder (not just the absolute smallest)
		const sortedAsc = [...availableNDCs].sort((a, b) => a.packageSize - b.packageSize);
		const bestRemainderPackage = sortedAsc.find((ndc) => ndc.packageSize >= remainingQuantity) || sortedAsc[sortedAsc.length - 1];
		const existingIndex = selected.findIndex((s) => s.ndc === bestRemainderPackage.ndc);

		const overfill = bestRemainderPackage.packageSize - remainingQuantity;

		if (existingIndex >= 0) {
			selected[existingIndex].packageCount += 1;
			selected[existingIndex].quantity += bestRemainderPackage.packageSize;
			selected[existingIndex].overfill = overfill;
		} else {
			selected.push({
				ndc: bestRemainderPackage.ndc,
				quantity: bestRemainderPackage.packageSize,
				packageCount: 1,
				overfill
			});
		}

		warnings.push({
			type: WARNING_TYPES.OVERFILL,
			message: `Overfill of ${overfill} ${bestRemainderPackage.packageUnit}`,
			severity: 'info'
		});
	}

	return { matches: selected, warnings };
}

