# Phase 4: Frontend UI

**Document Version:** 1.0
**Last Updated:** 2025-11-11

---

## Overview

This phase implements the SvelteKit frontend user interface, including the prescription input form, results display, and error handling components.

**Dependencies:** [Phase 3: API Routes & Orchestration](phase-3-api.md)

**Estimated Effort:** Frontend implementation

---

## Tasks

### 4.1 - Create Base UI Components

**Description:** Implement reusable base components for the UI

**Implementation Steps:**
1. Create `src/lib/components/Button.svelte`:
   ```svelte
   <script lang="ts">
     export let type: 'button' | 'submit' = 'button';
     export let variant: 'primary' | 'secondary' = 'primary';
     export let disabled = false;
   </script>

   <button
     {type}
     {disabled}
     class="btn btn-{variant}"
     on:click
   >
     <slot />
   </button>

   <style>
     .btn {
       padding: 0.75rem 1.5rem;
       border-radius: 0.375rem;
       font-weight: 500;
       cursor: pointer;
       transition: all 0.2s;
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
   ```
2. Create `src/lib/components/Input.svelte`:
   ```svelte
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
     />
     {#if error}
       <span class="error-message">{error}</span>
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
   ```
3. Create `src/lib/components/LoadingSpinner.svelte`
4. Create component index file

**Acceptance Criteria:**
- Base components created
- Consistent styling
- Accessibility attributes
- TypeScript props
- Components reusable

**Files Created:**
- `src/lib/components/Button.svelte`
- `src/lib/components/Input.svelte`
- `src/lib/components/LoadingSpinner.svelte`
- `src/lib/components/index.ts`

**Reference:** [architecture.md - Frontend Layer](../architecture.md#frontend-layer-sveltekit-ui)

---

### 4.2 - Create Prescription Form Component

**Description:** Implement main prescription input form

**Implementation Steps:**
1. Create `src/lib/components/PrescriptionForm.svelte`:
   ```svelte
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
   ```

**Acceptance Criteria:**
- Form component accepts user input
- Client-side validation
- Loading state handling
- Event dispatching for submission
- Responsive design

**Files Created:**
- `src/lib/components/PrescriptionForm.svelte`

**Reference:** [architecture.md - Frontend Layer](../architecture.md#frontend-layer-sveltekit-ui)

---

### 4.3 - Create Results Display Components

**Description:** Implement components for displaying calculation results

**Implementation Steps:**
1. Create `src/lib/components/WarningBadge.svelte`:
   ```svelte
   <script lang="ts">
     import type { Warning } from '$lib/types';

     export let warning: Warning;

     const severityColors = {
       info: '#3b82f6',
       warning: '#f59e0b',
       error: '#ef4444'
     };
   </script>

   <div class="warning-badge" style="--color: {severityColors[warning.severity]}">
     <span class="severity">{warning.severity.toUpperCase()}</span>
     <span class="message">{warning.message}</span>
   </div>

   <style>
     .warning-badge {
       display: flex;
       gap: 0.75rem;
       padding: 0.75rem 1rem;
       border-left: 4px solid var(--color);
       background-color: rgba(from var(--color) r g b / 0.1);
       border-radius: 0.375rem;
     }

     .severity {
       font-weight: 600;
       font-size: 0.75rem;
       color: var(--color);
     }

     .message {
       color: #374151;
       font-size: 0.875rem;
     }
   </style>
   ```
2. Create `src/lib/components/NDCCard.svelte`:
   ```svelte
   <script lang="ts">
     import type { SelectedNDC } from '$lib/types';

     export let ndc: SelectedNDC;
   </script>

   <div class="ndc-card">
     <div class="ndc-header">
       <h3>NDC: {ndc.ndc}</h3>
       {#if ndc.overfill && ndc.overfill > 0}
         <span class="badge overfill">+{ndc.overfill} overfill</span>
       {/if}
       {#if ndc.underfill && ndc.underfill > 0}
         <span class="badge underfill">-{ndc.underfill} underfill</span>
       {/if}
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
     }

     .ndc-header h3 {
       font-size: 1.125rem;
       font-weight: 600;
       color: #111827;
     }

     .badge {
       padding: 0.25rem 0.75rem;
       border-radius: 9999px;
       font-size: 0.75rem;
       font-weight: 500;
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
   ```
3. Create `src/lib/components/ResultsDisplay.svelte`:
   ```svelte
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
           {result.data.normalizedDrug.strength}
           {result.data.normalizedDrug.doseForm}
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
           {#each result.data.warnings as warning}
             <WarningBadge {warning} />
           {/each}
         </div>
       {/if}

       <div class="ndcs-section">
         <h3>Selected NDCs</h3>
         <div class="ndcs-grid">
           {#each result.data.selectedNDCs as ndc}
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
     <div class="error-display">
       <h3>Error</h3>
       <p>{result.error}</p>
       {#if result.retryable}
         <p class="retry-hint">This error may be temporary. Please try again.</p>
       {/if}
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
     }

     .retry-hint {
       margin-top: 1rem;
       font-size: 0.875rem;
       font-style: italic;
     }
   </style>
   ```

**Acceptance Criteria:**
- Results display shows all data
- Warning badges styled by severity
- NDC cards show package details
- AI reasoning displayed when available
- Error states handled
- Responsive layout

**Files Created:**
- `src/lib/components/WarningBadge.svelte`
- `src/lib/components/NDCCard.svelte`
- `src/lib/components/ResultsDisplay.svelte`

**Reference:** [architecture.md - Frontend Layer](../architecture.md#frontend-layer-sveltekit-ui)

---

### 4.4 - Implement Main Page

**Description:** Create main application page with form and results

**Implementation Steps:**
1. Create `src/routes/+page.svelte`:
   ```svelte
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

         result = await response.json();
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
           <PrescriptionForm
             bind:this={formComponent}
             on:submit={handleSubmit}
           />
         </div>

         {#if result}
           <div class="results-section">
             <ResultsDisplay {result} />
           </div>
         {/if}
       </div>
     </div>
   </main>

   <style>
     :global(body) {
       margin: 0;
       padding: 0;
       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
       background: #f3f4f6;
     }

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
     }

     .content {
       display: grid;
       gap: 2rem;
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
   ```

**Acceptance Criteria:**
- Main page integrates form and results
- API calls handled correctly
- Loading states managed
- Error handling implemented
- Responsive design
- SEO metadata included

**Files Created:**
- `src/routes/+page.svelte`

**Reference:** [architecture.md - Frontend Layer](../architecture.md#frontend-layer-sveltekit-ui)

---

### 4.5 - Add Global Styles

**Description:** Create global CSS styles and theme

**Implementation Steps:**
1. Update `src/app.css`:
   ```css
   * {
     box-sizing: border-box;
   }

   body {
     margin: 0;
     padding: 0;
   }

   h1, h2, h3, h4, h5, h6, p {
     margin: 0;
   }

   button {
     font-family: inherit;
   }

   /* Utility classes */
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
   ```
2. Import in `src/routes/+layout.svelte`

**Acceptance Criteria:**
- Global styles applied
- CSS reset included
- Utility classes available
- Consistent theming

**Files Modified:**
- `src/app.css`
- `src/routes/+layout.svelte`

**Reference:** [architecture.md - Directory Structure](../architecture.md#directory-structure)

---

### 4.6 - Create Client-Side Store (Optional)

**Description:** Implement Svelte store for client state management

**Implementation Steps:**
1. Create `src/lib/stores/calculation.store.ts`:
   ```typescript
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
       setLoading: (loading: boolean) =>
         update((state) => ({ ...state, loading })),
       setResult: (result: CalculationResponse) =>
         update((state) => ({
           ...state,
           result,
           history: [...state.history, result]
         })),
       clearResult: () =>
         update((state) => ({ ...state, result: null })),
       reset: () =>
         update(() => ({ loading: false, result: null, history: [] }))
     };
   }

   export const calculationStore = createCalculationStore();
   ```

**Acceptance Criteria:**
- Store manages calculation state
- History tracking implemented
- Type-safe operations
- Reactive updates

**Files Created:**
- `src/lib/stores/calculation.store.ts`

**Reference:** [architecture.md - Frontend Layer](../architecture.md#frontend-layer-sveltekit-ui)

---

## Phase Completion Criteria

All tasks (4.1 - 4.6) completed and verified:
- [ ] Base UI components created
- [ ] Prescription form implemented
- [ ] Results display components created
- [ ] Main page integrated
- [ ] Global styles applied
- [ ] Client-side store created (optional)

**Next Phase:** [Phase 5: Testing & Quality Assurance](phase-5-testing.md)
