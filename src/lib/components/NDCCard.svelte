<script lang="ts">
	import type { SelectedNDC } from '$lib/types';

	export let ndc: SelectedNDC;
</script>

<div class="ndc-card">
	<div class="ndc-header">
		<h3>NDC: {ndc.ndc}</h3>
		<div class="badges">
			{#if ndc.overfill && ndc.overfill > 0}
				<span class="badge overfill">+{ndc.overfill} overfill</span>
			{/if}
			{#if ndc.underfill && ndc.underfill > 0}
				<span class="badge underfill">-{ndc.underfill} underfill</span>
			{/if}
		</div>
	</div>

	<div class="ndc-details">
		<div class="detail-item">
			<span class="label">Quantity:</span>
			<span class="value">{ndc.quantity}</span>
		</div>
		<div class="detail-item">
			<span class="label">Package Count:</span>
			<span class="value">{ndc.packageCount}</span>
		</div>
	</div>
</div>

<style>
	.ndc-card {
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 1.5rem;
		background: white;
	}

	.ndc-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.ndc-header h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.badges {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.badge {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.overfill {
		background: #fef3c7;
		color: #92400e;
	}

	.underfill {
		background: #fee2e2;
		color: #991b1b;
	}

	.ndc-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
	}

	.label {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.value {
		color: #111827;
		font-weight: 500;
		font-size: 0.875rem;
	}
</style>

