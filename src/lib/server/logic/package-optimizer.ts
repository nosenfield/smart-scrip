/**
 * Package optimization logic for prescription processing
 * 
 * Provides advanced package selection optimization with configurable criteria:
 * - Minimize package count
 * - Minimize waste
 * - Control overfill tolerance
 */

import type { NDCPackage, SelectedNDC } from '$lib/types';
import { logger } from '$lib/server/utils/logger';

/**
 * Criteria for package optimization
 */
export interface OptimizationCriteria {
	minimizePackages?: boolean;
	minimizeWaste?: boolean;
	allowOverfill?: boolean;
	maxOverfillPercent?: number;
}

/**
 * Result of package optimization
 */
export interface OptimizationResult {
	packages: SelectedNDC[];
	totalQuantity: number;
	wasteQuantity: number;
	packageCount: number;
	score: number; // Lower is better
}

/**
 * Optimizes package selection based on configurable criteria
 * 
 * Explores single and two-package combinations to find the best solution
 * based on waste minimization, package count minimization, and overfill tolerance.
 * 
 * @param requiredQuantity - Required quantity to meet
 * @param availablePackages - Available NDC packages
 * @param criteria - Optimization criteria (defaults to minimize both packages and waste)
 * @returns Optimization result with selected packages and score
 * 
 * @example
 * ```typescript
 * const result = optimizePackageSelection(60, packages, {
 *   minimizeWaste: true,
 *   maxOverfillPercent: 20
 * });
 * ```
 */
export function optimizePackageSelection(
	requiredQuantity: number,
	availablePackages: NDCPackage[],
	criteria: OptimizationCriteria = {}
): OptimizationResult {
	const {
		minimizePackages = true,
		minimizeWaste = true,
		allowOverfill = true,
		maxOverfillPercent = 20
	} = criteria;

	logger.info('Optimizing package selection', {
		requiredQuantity,
		criteria
	});

	// Handle zero quantity requirement
	if (requiredQuantity <= 0) {
		return {
			packages: [],
			totalQuantity: 0,
			wasteQuantity: 0,
			packageCount: 0,
			score: Infinity
		};
	}

	const activePackages = availablePackages.filter((pkg) => pkg.status === 'active');

	if (activePackages.length === 0) {
		return {
			packages: [],
			totalQuantity: 0,
			wasteQuantity: 0,
			packageCount: 0,
			score: Infinity
		};
	}

	// Generate all possible combinations
	const combinations = generateCombinations(requiredQuantity, activePackages, maxOverfillPercent);

	if (combinations.length === 0) {
		// Fallback to simplest solution
		return selectFallbackPackage(requiredQuantity, activePackages);
	}

	// Score each combination
	const scoredCombinations = combinations.map((combo) => {
		const wasteScore = minimizeWaste ? combo.wasteQuantity : 0;
		const packageScore = minimizePackages ? combo.packageCount * 10 : 0;
		// Only add package score if there's waste, otherwise exact matches should score 0
		const score = wasteScore + (wasteScore > 0 ? packageScore : 0);

		return { ...combo, score };
	});

	// Sort by score (lower is better)
	scoredCombinations.sort((a, b) => a.score - b.score);

	logger.info('Optimal package selection found', {
		result: scoredCombinations[0]
	});

	return scoredCombinations[0];
}

/**
 * Generates all valid package combinations within overfill tolerance
 * 
 * Explores:
 * - Single package solutions
 * - Two-package combinations (up to 10 of each)
 * 
 * @param requiredQuantity - Required quantity
 * @param packages - Available packages
 * @param maxOverfillPercent - Maximum allowed overfill percentage
 * @returns Array of valid optimization results
 */
function generateCombinations(
	requiredQuantity: number,
	packages: NDCPackage[],
	maxOverfillPercent: number
): OptimizationResult[] {
	const results: OptimizationResult[] = [];
	const maxOverfill = (requiredQuantity * maxOverfillPercent) / 100;

	// Try single package solutions
	for (const pkg of packages) {
		if (pkg.packageSize >= requiredQuantity) {
			const waste = pkg.packageSize - requiredQuantity;
			if (waste <= maxOverfill) {
				results.push({
					packages: [
						{
							ndc: pkg.ndc,
							quantity: pkg.packageSize,
							packageCount: 1,
							overfill: waste
						}
					],
					totalQuantity: pkg.packageSize,
					wasteQuantity: waste,
					packageCount: 1,
					score: 0
				});
			}
		}
	}

	// Try two-package combinations
	for (let i = 0; i < packages.length; i++) {
		for (let j = i; j < packages.length; j++) {
			const result = tryTwoPackageCombination(
				packages[i],
				packages[j],
				requiredQuantity,
				maxOverfill
			);
			if (result) {
				results.push(result);
			}
		}
	}

	return results;
}

/**
 * Tries to find a valid combination using two different package types
 * 
 * Tests combinations from 0-10 packages of each type to find matches
 * within the overfill tolerance.
 * 
 * @param pkg1 - First package type
 * @param pkg2 - Second package type
 * @param requiredQuantity - Required quantity
 * @param maxOverfill - Maximum allowed overfill (absolute value)
 * @returns Optimization result if valid combination found, null otherwise
 */
function tryTwoPackageCombination(
	pkg1: NDCPackage,
	pkg2: NDCPackage,
	requiredQuantity: number,
	maxOverfill: number
): OptimizationResult | null {
	// Try different counts of each package
	for (let count1 = 0; count1 <= 10; count1++) {
		for (let count2 = 0; count2 <= 10; count2++) {
			if (count1 === 0 && count2 === 0) continue;

			const total = count1 * pkg1.packageSize + count2 * pkg2.packageSize;
			if (total >= requiredQuantity && total - requiredQuantity <= maxOverfill) {
				const packages: SelectedNDC[] = [];

				if (count1 > 0) {
					packages.push({
						ndc: pkg1.ndc,
						quantity: pkg1.packageSize * count1,
						packageCount: count1
					});
				}

				if (count2 > 0) {
					packages.push({
						ndc: pkg2.ndc,
						quantity: pkg2.packageSize * count2,
						packageCount: count2
					});
				}

				return {
					packages,
					totalQuantity: total,
					wasteQuantity: total - requiredQuantity,
					packageCount: count1 + count2,
					score: 0
				};
			}
		}
	}

	return null;
}

/**
 * Selects fallback package when no valid combinations found
 * 
 * Uses the largest available package and calculates how many are needed.
 * This ensures we always return a solution, even if it exceeds overfill limits.
 * 
 * @param requiredQuantity - Required quantity
 * @param packages - Available packages
 * @returns Fallback optimization result with score of Infinity
 */
function selectFallbackPackage(
	requiredQuantity: number,
	packages: NDCPackage[]
): OptimizationResult {
	// Select largest package available
	const largest = packages.reduce((max, pkg) =>
		pkg.packageSize > max.packageSize ? pkg : max
	);

	const count = Math.ceil(requiredQuantity / largest.packageSize);
	const total = count * largest.packageSize;

	return {
		packages: [
			{
				ndc: largest.ndc,
				quantity: total,
				packageCount: count,
				overfill: total - requiredQuantity
			}
		],
		totalQuantity: total,
		wasteQuantity: total - requiredQuantity,
		packageCount: count,
		score: Infinity
	};
}

