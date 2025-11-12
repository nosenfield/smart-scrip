<script lang="ts">
	export let size: 'small' | 'medium' | 'large' = 'medium';
	export let label = 'Loading...';
</script>

<div class="spinner-container" role="status" aria-label={label}>
	<div class="spinner spinner-{size}"></div>
	{#if label}
		<span class="sr-only">{label}</span>
	{/if}
</div>

<style>
	.spinner-container {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
	}

	.spinner {
		border: 3px solid #e5e7eb;
		border-top-color: #2563eb;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.spinner-small {
		width: 1rem;
		height: 1rem;
		border-width: 2px;
	}

	.spinner-medium {
		width: 2rem;
		height: 2rem;
	}

	.spinner-large {
		width: 3rem;
		height: 3rem;
		border-width: 4px;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>

