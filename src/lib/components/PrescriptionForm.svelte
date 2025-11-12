<script lang="ts">
	import { Input, Button } from '$lib/components';
	import type { CalculationRequest } from '$lib/types';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{
		submit: CalculationRequest;
	}>();

	let drugName = '';
	let ndc = '';
	let sig = '';
	let daysSupply: number | '' = 30;
	let errors: Record<string, string> = {};
	let loading = false;

	function validateForm(): boolean {
		errors = {};

		if (!drugName && !ndc) {
			errors.drugName = 'Either drug name or NDC is required';
			errors.ndc = 'Either drug name or NDC is required';
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

		if (drugName) {
			request.drugName = drugName;
		}

		if (ndc) {
			request.ndc = ndc;
		}

		dispatch('submit', request);
	}

	export function resetForm() {
		drugName = '';
		ndc = '';
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
		<h2>Prescription Calculator</h2>
		<p>Enter prescription details to calculate optimal NDC selection</p>
	</div>

	<div class="form-fields">
		<Input
			label="Drug Name"
			name="drugName"
			bind:value={drugName}
			placeholder="e.g., Lisinopril 10mg tablet"
			error={errors.drugName}
			maxlength={200}
		/>

		<div class="divider">
			<span>OR</span>
		</div>

		<Input
			label="NDC"
			name="ndc"
			bind:value={ndc}
			placeholder="e.g., 00071-0304-23"
			error={errors.ndc}
		/>

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
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.divider {
		text-align: center;
		position: relative;
		margin: 0.5rem 0;
	}

	.divider::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 1px;
		background: #e5e7eb;
	}

	.divider span {
		background: white;
		padding: 0 1rem;
		color: #9ca3af;
		font-size: 0.875rem;
		position: relative;
	}

	.form-actions {
		margin-top: 2rem;
	}
</style>

