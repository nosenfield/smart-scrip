<script lang="ts">
	import { Input, Button } from '$lib/components';
	import type { CalculationRequest } from '$lib/types';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{
		submit: CalculationRequest;
	}>();

	let useDrugName = false; // false = NDC mode (default), true = Drug Name mode
	let identifier = ''; // Single field for either NDC or drug name
	let sig = '';
	let daysSupply: number | '' = 30;
	let errors: Record<string, string> = {};
	let loading = false;

	// Example prescriptions
	const examples = [
		{
			drugName: 'Lisinopril 10mg tablet',
			ndc: '65862-045-00',
			sig: 'Take 1 tablet by mouth once daily',
			daysSupply: 30
		},
		{
			drugName: 'Metformin 500mg tablet',
			ndc: '42385-949-01',
			sig: 'Take 1 tablet by mouth twice daily with meals',
			daysSupply: 90
		},
		{
			drugName: 'Atorvastatin 20mg tablet',
			ndc: '31722-425-90',
			sig: 'Take 1 tablet by mouth once daily at bedtime',
			daysSupply: 30
		}
	];

	function fillExample(example: typeof examples[0]) {
		// Fill based on current mode
		if (useDrugName) {
			identifier = example.drugName;
		} else {
			identifier = example.ndc;
		}
		sig = example.sig;
		daysSupply = example.daysSupply;
		errors = {}; // Clear any errors
	}

	function toggleInputMode() {
		useDrugName = !useDrugName;
		identifier = ''; // Clear field when switching modes
		errors = {}; // Clear errors
	}

	function validateForm(): boolean {
		errors = {};

		if (!identifier || identifier.trim().length === 0) {
			errors.identifier = useDrugName
				? 'Drug name is required'
				: 'NDC is required';
		}

		if (!sig || sig.trim().length === 0) {
			errors.sig = 'Prescription directions are required';
		}

		if (!daysSupply || daysSupply < 1 || daysSupply > 365) {
			errors.daysSupply = 'Days supply must be between 1 and 365';
		}

		return Object.keys(errors).length === 0;
	}

	function handleSubmit() {
		if (!validateForm()) {
			return;
		}

		loading = true;

		const request: CalculationRequest = {
			sig,
			daysSupply: daysSupply as number
		};

		if (useDrugName) {
			request.drugName = identifier.trim();
		} else {
			request.ndc = identifier.trim();
		}

		dispatch('submit', request);
	}

	export function resetForm() {
		useDrugName = false;
		identifier = '';
		sig = '';
		daysSupply = 30;
		errors = {};
		loading = false;
	}

	export function setLoading(value: boolean) {
		loading = value;
	}
</script>

<form on:submit|preventDefault={handleSubmit} class="prescription-form">
	<div class="form-header">
		<p class="description">Enter prescription details to calculate optimal NDC selection</p>
		<p class="examples">
			Example: 
			{#each examples as example, index}
				<button
					type="button"
					class="example-link"
					on:click={() => fillExample(example)}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							fillExample(example);
						}
					}}
				>
					{example.drugName}
				</button>
			{/each}
		</p>
	</div>

	<div class="form-fields">
		<div class="identifier-field">
			<div class="identifier-label">
				{#if useDrugName}
					<button
						type="button"
						class="toggle-link"
						on:click={toggleInputMode}
						on:keydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								toggleInputMode();
							}
						}}
						aria-label="Switch to NDC input"
					>
						NDC
					</button>
					<span class="or-text">or</span>
					<span>Drug Name</span>
				{:else}
					<span>NDC</span>
					<span class="or-text">or</span>
					<button
						type="button"
						class="toggle-link"
						on:click={toggleInputMode}
						on:keydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								toggleInputMode();
							}
						}}
						aria-label="Switch to Drug Name input"
					>
						Drug Name
					</button>
				{/if}
			</div>
			<Input
				label={useDrugName ? 'Drug Name' : 'NDC'}
				name={useDrugName ? 'drugName' : 'ndc'}
				bind:value={identifier}
				placeholder={useDrugName ? 'e.g., Lisinopril 10mg tablet' : 'e.g., 00071-0304-23'}
				error={errors.identifier}
				maxlength={useDrugName ? 200 : undefined}
			/>
		</div>

		<Input
			label="SIG (Prescription Directions)"
			name="sig"
			bind:value={sig}
			placeholder="e.g., Take 1 tablet by mouth daily"
			required
			error={errors.sig}
			maxlength={500}
		/>

		<Input
			label="Days Supply"
			name="daysSupply"
			type="number"
			bind:value={daysSupply}
			placeholder="30"
			required
			error={errors.daysSupply}
		/>
	</div>

	<div class="form-actions">
		<Button type="submit" disabled={loading}>
			{loading ? 'Calculating...' : 'Calculate NDC'}
		</Button>
	</div>
</form>

<style>
	.prescription-form {
		background: white;
		border-radius: 0.5rem;
		padding: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.form-header {
		margin-bottom: 2rem;
	}

	.form-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #111827;
		margin-bottom: 0.5rem;
	}

	.form-header p {
		color: #6b7280;
		font-size: 0.875rem;
		margin: 0.5rem 0;
	}

	.description {
		font-weight: 600;
		font-size: 1rem;
	}

	.examples {
		font-size: 1rem;
		color: #6b7280;
	}

	.example-link {
		background: none;
		border: none;
		padding: 0;
		margin: 0 0.5rem;
		color: #3b82f6;
		cursor: pointer;
		font-size: 0.875rem;
		text-decoration: underline;
		transition: color 0.2s;
	}

	.example-link:first-child {
		margin-left: 0;
	}

	.example-link:last-child {
		margin-right: 0;
	}

	.example-link:hover {
		color: #2563eb;
	}

	.example-link:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
		border-radius: 2px;
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.identifier-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.identifier-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.identifier-label > span {
		display: block;
	}

	.or-text {
		color: #6b7280;
		font-weight: 400;
	}

	.toggle-link {
		background: none;
		border: none;
		padding: 0;
		color: #3b82f6;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: underline;
		transition: color 0.2s;
	}

	.toggle-link:hover {
		color: #2563eb;
	}

	.toggle-link:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
		border-radius: 2px;
	}

	.form-actions {
		margin-top: 2rem;
	}
</style>

