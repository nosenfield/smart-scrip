<script lang="ts">
	import PrescriptionForm from '$lib/components/PrescriptionForm.svelte';
	import ResultsDisplay from '$lib/components/ResultsDisplay.svelte';
	import type { CalculationRequest, CalculationResponse } from '$lib/types';

	let formComponent: PrescriptionForm;
	let result: CalculationResponse | null = null;
	let loading = false;

	async function handleSubmit(event: CustomEvent<CalculationRequest>) {
		const request = event.detail;
		loading = true;
		result = null;

		try {
			const response = await fetch('/api/calculate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(request)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				result = {
					success: false,
					error: errorData.error || `Server error: ${response.status} ${response.statusText}`,
					code: errorData.code || 'SERVER_ERROR'
				};
			} else {
				result = await response.json();
			}
		} catch (error) {
			result = {
				success: false,
				error: 'Network error. Please check your connection and try again.',
				code: 'NETWORK_ERROR'
			};
		} finally {
			loading = false;
			formComponent?.setLoading(false);
		}
	}
</script>

<svelte:head>
	<title>NDC Packaging Calculator</title>
	<meta name="description" content="Calculate optimal NDC package selection for prescriptions" />
</svelte:head>

<main>
	<div class="container">
		<header>
			<h1>NDC Packaging & Quantity Calculator</h1>
			<p>AI-powered prescription fulfillment optimization</p>
		</header>

		<div class="content">
			<div class="form-section">
				<PrescriptionForm bind:this={formComponent} on:submit={handleSubmit} />
			</div>

			{#if loading && !result}
				<div class="loading-section">
					<p>Calculating optimal NDC selection...</p>
				</div>
			{/if}

			{#if result}
				<div class="results-section">
					<ResultsDisplay {result} />
				</div>
			{/if}
		</div>
	</div>
</main>

<style>
	main {
		min-height: 100vh;
		padding: 2rem 1rem;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
	}

	header {
		text-align: center;
		margin-bottom: 3rem;
	}

	header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: #111827;
		margin-bottom: 0.5rem;
	}

	header p {
		font-size: 1.125rem;
		color: #6b7280;
		margin: 0;
	}

	.content {
		display: grid;
		gap: 2rem;
	}

	.loading-section {
		text-align: center;
		padding: 2rem;
		color: #6b7280;
	}

	.results-section {
		animation: fadeIn 0.3s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(1rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (min-width: 768px) {
		main {
			padding: 3rem 2rem;
		}

		header h1 {
			font-size: 3rem;
		}
	}
</style>
