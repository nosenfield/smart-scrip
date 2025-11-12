<script lang="ts">
	export let label: string;
	export let name: string;
	export let type: 'text' | 'number' = 'text';
	export let value: string | number = '';
	export let placeholder = '';
	export let required = false;
	export let error: string | undefined = undefined;
	export let maxlength: number | undefined = undefined;
</script>

<div class="input-group">
	<label for={name}>{label}</label>
	<input
		id={name}
		{name}
		{type}
		{placeholder}
		{required}
		{maxlength}
		bind:value
		class:error={!!error}
		aria-invalid={!!error}
		aria-describedby={error ? `${name}-error` : undefined}
	/>
	{#if error}
		<span id="{name}-error" class="error-message" role="alert">{error}</span>
	{/if}
</div>

<style>
	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-weight: 500;
		color: #374151;
		font-size: 0.875rem;
	}

	input {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 1rem;
		font-family: inherit;
	}

	input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	input.error {
		border-color: #dc2626;
	}

	.error-message {
		color: #dc2626;
		font-size: 0.875rem;
	}
</style>

