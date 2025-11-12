<script lang="ts">
	import type { Warning } from '$lib/types';

	export let warning: Warning;

	const severityColors = {
		info: '#3b82f6',
		warning: '#f59e0b',
		error: '#ef4444'
	};

	const severityBgColors = {
		info: 'rgba(59, 130, 246, 0.1)',
		warning: 'rgba(245, 158, 11, 0.1)',
		error: 'rgba(239, 68, 68, 0.1)'
	};
</script>

<div
	class="warning-badge"
	style="--color: {severityColors[warning.severity]}; --bg-color: {severityBgColors[warning.severity]}"
	role="alert"
	aria-live="polite"
>
	<span class="severity">{warning.severity.toUpperCase()}</span>
	<span class="message">{warning.message}</span>
</div>

<style>
	.warning-badge {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-left: 4px solid var(--color);
		background-color: var(--bg-color);
		border-radius: 0.375rem;
	}

	.severity {
		font-weight: 600;
		font-size: 0.75rem;
		color: var(--color);
		text-transform: uppercase;
	}

	.message {
		color: #374151;
		font-size: 0.875rem;
		flex: 1;
	}
</style>

