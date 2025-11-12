<script lang="ts">
	export let type: 'button' | 'submit' = 'button';
	export let variant: 'primary' | 'secondary' = 'primary';
	export let disabled = false;
</script>

<button {type} {disabled} class="btn btn-{variant}" on:click>
	<slot />
</button>

<style>
	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: 0.375rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		font-family: inherit;
		font-size: 1rem;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background-color: #2563eb;
		color: white;
		border: none;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #1d4ed8;
	}

	.btn-secondary {
		background-color: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: #f9fafb;
	}
</style>

