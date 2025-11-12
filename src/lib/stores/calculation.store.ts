/**
 * Client-side store for calculation state management
 */

import { writable } from 'svelte/store';
import type { CalculationResponse } from '$lib/types';

interface CalculationState {
	loading: boolean;
	result: CalculationResponse | null;
	history: CalculationResponse[];
}

function createCalculationStore() {
	const { subscribe, update } = writable<CalculationState>({
		loading: false,
		result: null,
		history: []
	});

	return {
		subscribe,
		setLoading: (loading: boolean) => update((state) => ({ ...state, loading })),
		setResult: (result: CalculationResponse) =>
			update((state) => ({
				...state,
				result,
				history: [...state.history, result]
			})),
		clearResult: () => update((state) => ({ ...state, result: null })),
		reset: () => update(() => ({ loading: false, result: null, history: [] }))
	};
}

export const calculationStore = createCalculationStore();

