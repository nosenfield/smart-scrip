<script lang="ts">
	import type { CalculationResponse } from '$lib/types';
	import NDCCard from './NDCCard.svelte';
	import WarningBadge from './WarningBadge.svelte';

	export let result: CalculationResponse;
</script>

{#if result.success && result.data}
	<div class="results-display">
		<div class="results-header">
			<h2>Calculation Results</h2>
		</div>

		<div class="drug-info">
			<h3>{result.data.normalizedDrug.name}</h3>
			<p>
				{result.data.normalizedDrug.strength} {result.data.normalizedDrug.doseForm}
			</p>
			<p class="rxcui">RxCUI: {result.data.rxcui}</p>
		</div>

		<div class="quantity-summary">
			<div class="summary-item">
				<span class="label">Total Quantity Required:</span>
				<span class="value">{result.data.totalQuantity} {result.data.parsedSIG.unit}</span>
			</div>
			<div class="summary-item">
				<span class="label">Dose:</span>
				<span class="value">
					{result.data.parsedSIG.dose} {result.data.parsedSIG.unit}
				</span>
			</div>
			<div class="summary-item">
				<span class="label">Frequency:</span>
				<span class="value">{result.data.parsedSIG.frequency}x daily</span>
			</div>
		</div>

		{#if result.data.warnings.length > 0}
			<div class="warnings-section">
				<h3>Warnings</h3>
				<div class="warnings-list">
					{#each result.data.warnings as warning (warning.type + warning.message)}
						<WarningBadge {warning} />
					{/each}
				</div>
			</div>
		{/if}

		<div class="ndcs-section">
			<h3>Selected NDCs</h3>
			<div class="ndcs-grid">
				{#each result.data.selectedNDCs as ndc (ndc.ndc)}
					<NDCCard {ndc} />
				{/each}
			</div>
		</div>

		{#if result.data.aiReasoning}
			<div class="ai-reasoning">
				<h3>AI Recommendation</h3>
				<p>{result.data.aiReasoning}</p>
			</div>
		{/if}
	</div>
{:else if !result.success}
	<div class="error-display" role="alert">
		<h3>Error</h3>
		<p>{result.error || 'An error occurred while calculating the prescription.'}</p>
	</div>
{/if}

<style>
	.results-display {
		background: white;
		border-radius: 0.5rem;
		padding: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.results-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #111827;
		margin-bottom: 1.5rem;
	}

	.drug-info {
		border-bottom: 1px solid #e5e7eb;
		padding-bottom: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.drug-info h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
		margin-bottom: 0.5rem;
	}

	.drug-info p {
		color: #6b7280;
		margin: 0.25rem 0;
	}

	.rxcui {
		font-size: 0.875rem;
		margin-top: 0.5rem;
	}

	.quantity-summary {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 2rem;
	}

	.summary-item {
		display: flex;
		justify-content: space-between;
	}

	.summary-item .label {
		color: #6b7280;
	}

	.summary-item .value {
		font-weight: 600;
		color: #111827;
	}

	.warnings-section {
		margin-bottom: 2rem;
	}

	.warnings-section h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		margin-bottom: 1rem;
	}

	.warnings-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.ndcs-section {
		margin-bottom: 2rem;
	}

	.ndcs-section h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		margin-bottom: 1rem;
	}

	.ndcs-grid {
		display: grid;
		gap: 1rem;
	}

	@media (min-width: 768px) {
		.ndcs-grid {
			grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		}
	}

	.ai-reasoning {
		margin-top: 2rem;
		padding: 1.5rem;
		background: #f9fafb;
		border-radius: 0.5rem;
	}

	.ai-reasoning h3 {
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
		margin-bottom: 0.75rem;
	}

	.ai-reasoning p {
		color: #374151;
		line-height: 1.6;
		margin: 0;
	}

	.error-display {
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.5rem;
		padding: 2rem;
	}

	.error-display h3 {
		color: #991b1b;
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
	}

	.error-display p {
		color: #7f1d1d;
		margin: 0;
	}
</style>

