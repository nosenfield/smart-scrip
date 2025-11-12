# NDC Packaging & Quantity Calculator - Architecture

**Document Version:** 1.0
**Last Updated:** 2025-11-11

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [System Components](#system-components)
5. [Data Flow](#data-flow)
6. [API Integration Strategy](#api-integration-strategy)
7. [Directory Structure](#directory-structure)
8. [Design Decisions](#design-decisions)
9. [Technical Constraints](#technical-constraints)
10. [Security Considerations](#security-considerations)
11. [Performance Optimization](#performance-optimization)
12. [Error Handling Strategy](#error-handling-strategy)
13. [Monitoring and Observability](#monitoring-and-observability)
14. [Scalability Considerations](#scalability-considerations)

---

## Executive Summary

The NDC Packaging & Quantity Calculator is a stateless, AI-accelerated web application built on SvelteKit and deployed on Google Cloud Platform. The system leverages OpenAI for intelligent parsing and decision-making, integrates with RxNorm and FDA NDC Directory APIs for drug normalization and validation, and provides pharmacists with accurate prescription fulfillment recommendations.

**Key Architectural Principles:**
- Stateless serverless design for cost efficiency and scalability
- AI-first approach for complex parsing and selection logic
- Real-time API integration without local caching
- Fail-fast error handling with explicit user warnings
- Cloud-native deployment on GCP Cloud Run

---

## Technology Stack

### Core Technologies

**Frontend Framework**
- SvelteKit 2.x (full-stack framework)
- Svelte 5.x (reactive UI components)
- TypeScript 5.x (type safety)

**Backend Runtime**
- Node.js 20.x LTS
- SvelteKit server-side routes (API endpoints)

**AI & Machine Learning**
- OpenAI API (GPT-4o or GPT-4o-mini)
  - SIG parsing and normalization
  - Intelligent NDC selection logic
  - Structured JSON output generation

**External APIs**
- RxNorm API (NLM/NIH) - Drug normalization to RxCUI
- FDA NDC Directory API - NDC validation and package data
- OpenAI API - AI processing

**Cloud Platform**
- Google Cloud Platform (GCP)
- Cloud Run (containerized serverless deployment)
- Cloud Logging (observability)
- Cloud Build (CI/CD)

**Development Tools**
- Vite (build tool, bundled with SvelteKit)
- Vitest (unit testing)
- Playwright (integration testing)
- Docker (containerization)
- ESLint + Prettier (code quality)

**Package Management**
- npm (Node Package Manager)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interface                       │
│                      (SvelteKit Frontend)                    │
│  - Input Form (Drug, SIG, Days Supply)                      │
│  - Results Display (NDCs, Quantities, Warnings)             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP Request
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    SvelteKit Server Routes                   │
│                    (Cloud Run Container)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  POST /api/calculate                                  │  │
│  │  - Request validation                                 │  │
│  │  - Orchestration logic                                │  │
│  │  - Response formatting                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│         ┌───────────────┼───────────────┐                   │
│         ▼               ▼               ▼                   │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐               │
│  │ OpenAI   │   │ RxNorm   │   │ FDA NDC  │               │
│  │ Service  │   │ Service  │   │ Service  │               │
│  └──────────┘   └──────────┘   └──────────┘               │
└─────────┬───────────┬───────────────┬─────────────────────┘
          │           │               │
          ▼           ▼               ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  OpenAI API  │ │  RxNorm  │ │  FDA NDC     │
│  (External)  │ │   API    │ │  Directory   │
│              │ │(External)│ │   API        │
│              │ │          │ │  (External)  │
└──────────────┘ └──────────┘ └──────────────┘
```

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Cloud Run Service                      │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Container Instance 1                         │  │    │
│  │  │  - SvelteKit App                              │  │    │
│  │  │  - Node.js Runtime                            │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Container Instance 2 (auto-scaled)           │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Container Instance N (auto-scaled)           │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Cloud Logging                          │    │
│  │  - Application logs                                 │    │
│  │  - Error tracking                                   │    │
│  │  - Performance metrics                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Cloud Build (CI/CD)                    │    │
│  │  - Automated testing                                │    │
│  │  - Container image building                         │    │
│  │  - Deployment automation                            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## System Components

### 1. Frontend Layer (SvelteKit UI)

**Purpose:** User interface for prescription input and results display

**Key Components:**
- Input form with validation
- Results display with visual warnings
- Error messaging and user feedback
- Responsive design for desktop and tablet

**Technologies:**
- Svelte 5 components
- TypeScript for type safety
- TailwindCSS or native CSS for styling
- Form validation libraries

**File Locations:**
- `src/routes/+page.svelte` - Main calculator interface
- `src/lib/components/` - Reusable UI components
- `src/lib/stores/` - Client-side state management

---

### 2. API Layer (SvelteKit Server Routes)

**Purpose:** Request handling, orchestration, and business logic

**Key Endpoints:**

```typescript
POST /api/calculate
Request Body:
{
  "drugName": string,
  "ndc": string (optional),
  "sig": string,
  "daysSupply": number
}

Response:
{
  "success": boolean,
  "data": {
    "rxcui": string,
    "normalizedDrug": {...},
    "selectedNDCs": [...],
    "totalQuantity": number,
    "warnings": [...],
    "aiReasoning": string
  },
  "error": string (if applicable)
}
```

**Responsibilities:**
- Input validation and sanitization
- API orchestration (sequential and parallel calls)
- Error handling and retry logic
- Response formatting

**File Locations:**
- `src/routes/api/calculate/+server.ts` - Main calculation endpoint
- `src/lib/server/` - Server-side utilities and services

---

### 3. Service Layer

**Purpose:** Abstraction layer for external API interactions

#### 3.1 OpenAI Service

**Responsibilities:**
- Parse SIG text into structured format
- Provide intelligent NDC selection reasoning
- Generate confidence scores

**Key Functions:**
```typescript
// src/lib/server/services/openai.service.ts
async function parseSIG(sigText: string): Promise<ParsedSIG>
async function selectOptimalNDC(options: NDCOption[]): Promise<NDCSelection>
```

**Configuration:**
- API key from environment variables
- Model selection (GPT-4o-mini for cost optimization)
- Structured output with JSON schema validation
- Timeout: 30 seconds
- Retry: 2 attempts with exponential backoff

---

#### 3.2 RxNorm Service

**Responsibilities:**
- Normalize drug names to RxCUI
- Handle branded and generic name resolution
- Support dose form variations

**Key Functions:**
```typescript
// src/lib/server/services/rxnorm.service.ts
async function normalizeToRxCUI(drugName: string): Promise<RxNormResult>
async function getRxCUIProperties(rxcui: string): Promise<DrugProperties>
```

**Configuration:**
- Base URL: https://rxnav.nlm.nih.gov/REST/
- Timeout: 10 seconds
- Retry: 3 attempts
- Error handling: Fallback to approximate match

---

#### 3.3 FDA NDC Service

**Responsibilities:**
- Retrieve valid NDCs for drug
- Validate NDC status (active/inactive)
- Extract package size information

**Key Functions:**
```typescript
// src/lib/server/services/fda-ndc.service.ts
async function searchNDCsByRxCUI(rxcui: string): Promise<NDCResult[]>
async function validateNDC(ndc: string): Promise<NDCValidation>
async function getPackageInfo(ndc: string): Promise<PackageInfo>
```

**Configuration:**
- Base URL: https://api.fda.gov/drug/ndc.json
- Timeout: 10 seconds
- Retry: 3 attempts
- Rate limiting: Exponential backoff on 429 responses

---

### 4. Business Logic Layer

**Purpose:** Core calculation and matching algorithms

**Key Modules:**

```typescript
// src/lib/server/logic/quantity-calculator.ts
function calculateTotalQuantity(sig: ParsedSIG, daysSupply: number): Quantity

// src/lib/server/logic/ndc-matcher.ts
function findBestNDCMatches(required: Quantity, available: NDC[]): Match[]

// src/lib/server/logic/package-optimizer.ts
function optimizePackageSelection(quantity: number, packages: Package[]): Selection
```

**Responsibilities:**
- Quantity calculation based on SIG and days supply
- Unit conversion (tablets, mL, units, etc.)
- Multi-pack optimization
- Overfill/underfill detection

**File Locations:**
- `src/lib/server/logic/` - Business logic modules
- `src/lib/server/utils/` - Shared utilities

---

### 5. Type Definitions

**Purpose:** Shared TypeScript interfaces and types

**File Locations:**
- `src/lib/types/prescription.types.ts` - Prescription-related types
- `src/lib/types/ndc.types.ts` - NDC and package types
- `src/lib/types/api.types.ts` - API request/response types
- `src/lib/types/external-api.types.ts` - External API response types

**Example:**
```typescript
// src/lib/types/prescription.types.ts
export interface ParsedSIG {
  dose: number;
  unit: string;
  frequency: number;
  route: string;
  duration?: number;
  specialInstructions?: string;
}

export interface CalculationResult {
  rxcui: string;
  normalizedDrug: DrugInfo;
  selectedNDCs: SelectedNDC[];
  totalQuantity: number;
  warnings: Warning[];
  aiReasoning?: string;
}
```

---

## Data Flow

### Complete Request Flow

```
1. USER INPUT
   └─> Pharmacist enters: "Lisinopril 10mg tablet", "1 po qd", 30 days

2. FRONTEND VALIDATION
   └─> Client-side validation (required fields, format)

3. API REQUEST
   └─> POST /api/calculate

4. SERVER-SIDE PROCESSING
   ├─> Step 1: Parse SIG with OpenAI
   │   └─> OpenAI API call (~1-2s)
   │       Result: { dose: 1, unit: "tablet", frequency: 1, route: "oral" }
   │
   ├─> Step 2: Normalize drug name with RxNorm
   │   └─> RxNorm API call (~0.5s)
   │       Result: { rxcui: "314076", name: "Lisinopril 10mg tablet" }
   │
   ├─> Step 3: Calculate total quantity
   │   └─> Business logic (local computation)
   │       Result: 30 tablets (1 tablet × 1/day × 30 days)
   │
   ├─> Step 4: Retrieve available NDCs
   │   └─> FDA NDC API call (~0.5s)
   │       Result: [ {ndc: "0071-0304-23", size: 100}, ... ]
   │
   ├─> Step 5: Select optimal NDC(s)
   │   └─> OpenAI API call with context (~1-2s)
   │       Result: Best match with reasoning
   │
   └─> Step 6: Format response

5. RESPONSE TO CLIENT
   └─> JSON with selected NDCs, quantities, warnings

6. UI UPDATE
   └─> Display results with visual indicators
```

**Total Processing Time:** 3-5 seconds (may exceed 2s target under load)

---

## API Integration Strategy

### OpenAI Integration

**Usage Pattern:**
- Two API calls per calculation request
  1. SIG parsing (input normalization)
  2. NDC selection (decision making)

**Prompt Engineering:**
```typescript
// SIG Parsing Prompt
const SIG_PARSE_PROMPT = `
You are a pharmacy AI assistant. Parse the following prescription SIG into structured JSON.

SIG: "{sigText}"

Return JSON matching this schema:
{
  "dose": number,
  "unit": string (tablet|capsule|mL|units|puff|etc),
  "frequency": number (times per day),
  "route": string,
  "specialInstructions": string
}
`;

// NDC Selection Prompt
const NDC_SELECT_PROMPT = `
You are selecting the optimal NDC package(s) for a prescription.

Required quantity: {quantity} {unit}
Available NDCs: {ndcOptions}

Select the best option(s) considering:
- Minimize waste (prefer exact matches)
- Prefer single packages over multiple
- Flag inactive NDCs
- Warn about overfills/underfills

Return JSON with reasoning.
`;
```

**Error Handling:**
- Timeout: 30 seconds
- Retry: 2 attempts
- Fallback: Return error to user if both attempts fail
- Validation: Verify JSON schema of AI response

**Cost Optimization:**
- Use GPT-4o-mini for lower cost (~$0.15/1M input tokens)
- Minimize prompt length
- Cache prompt templates

---

### RxNorm Integration

**API Endpoints Used:**
```
GET /REST/rxcui.json?name={drugName}
GET /REST/rxcui/{rxcui}/properties.json
GET /REST/rxcui/{rxcui}/related.json?tty=SCD+SBD
```

**Error Handling:**
- Timeout: 10 seconds
- Retry: 3 attempts with 1s delay
- Fallback: Approximate match endpoint if exact match fails
- No SLA: Graceful degradation with user-friendly error messages

**Response Parsing:**
```typescript
interface RxNormResponse {
  idGroup?: {
    rxnormId?: string[];
  };
  rxcuiStatusHistory?: {
    metaData?: {
      status?: string;
    };
  };
}
```

---

### FDA NDC Directory Integration

**API Endpoints Used:**
```
GET /drug/ndc.json?search=rxcui:{rxcui}
GET /drug/ndc.json?search=product_ndc:{ndc}
```

**Query Parameters:**
- `limit=100` - Maximum results per request
- `skip=0` - Pagination offset

**Error Handling:**
- Timeout: 10 seconds
- Retry: 3 attempts with exponential backoff
- Rate limiting: Detect 429 status, implement backoff
- No match handling: Return empty array, flag in UI

**Response Parsing:**
```typescript
interface FDANDCResponse {
  results: Array<{
    product_ndc: string;
    generic_name: string;
    brand_name: string;
    active_ingredients: Array<{
      name: string;
      strength: string;
    }>;
    packaging: Array<{
      package_ndc: string;
      description: string;
    }>;
    marketing_status: string;
  }>;
}
```

---

## Directory Structure

```
smart-scrip/
├── src/
│   ├── routes/
│   │   ├── +page.svelte                    # Main calculator UI
│   │   ├── +page.server.ts                 # Server-side page load
│   │   ├── +layout.svelte                  # App layout
│   │   └── api/
│   │       └── calculate/
│   │           └── +server.ts              # POST /api/calculate endpoint
│   │
│   ├── lib/
│   │   ├── components/
│   │   │   ├── PrescriptionForm.svelte    # Input form component
│   │   │   ├── ResultsDisplay.svelte      # Results UI component
│   │   │   ├── NDCCard.svelte             # Individual NDC display
│   │   │   ├── WarningBadge.svelte        # Warning indicator
│   │   │   └── LoadingSpinner.svelte      # Loading state
│   │   │
│   │   ├── server/
│   │   │   ├── services/
│   │   │   │   ├── openai.service.ts      # OpenAI API wrapper
│   │   │   │   ├── rxnorm.service.ts      # RxNorm API wrapper
│   │   │   │   └── fda-ndc.service.ts     # FDA NDC API wrapper
│   │   │   │
│   │   │   ├── logic/
│   │   │   │   ├── quantity-calculator.ts # Quantity calculation
│   │   │   │   ├── ndc-matcher.ts         # NDC matching logic
│   │   │   │   ├── package-optimizer.ts   # Multi-pack optimization
│   │   │   │   └── validation.ts          # Input validation
│   │   │   │
│   │   │   └── utils/
│   │   │       ├── api-client.ts          # HTTP client wrapper
│   │   │       ├── retry.ts               # Retry logic
│   │   │       ├── logger.ts              # Logging utility
│   │   │       └── error-handler.ts       # Error handling
│   │   │
│   │   ├── types/
│   │   │   ├── prescription.types.ts      # Prescription types
│   │   │   ├── ndc.types.ts               # NDC types
│   │   │   ├── api.types.ts               # API request/response types
│   │   │   └── external-api.types.ts      # External API types
│   │   │
│   │   ├── stores/
│   │   │   └── calculation.store.ts       # Client state management
│   │   │
│   │   └── config/
│   │       └── constants.ts               # App-wide constants
│   │
│   ├── app.html                            # HTML template
│   └── app.css                             # Global styles
│
├── tests/
│   ├── unit/
│   │   ├── quantity-calculator.test.ts
│   │   ├── ndc-matcher.test.ts
│   │   └── validation.test.ts
│   │
│   └── integration/
│       ├── api-calculate.test.ts
│       ├── openai-service.test.ts
│       └── rxnorm-service.test.ts
│
├── _docs/
│   ├── prd.md                              # Product requirements
│   ├── architecture.md                     # This file
│   ├── task-list.md                        # Development task list
│   ├── task-tracker.md                     # Progress tracker
│   ├── best-practices.md                   # Development guidelines
│   ├── required-reading.md                 # Developer onboarding
│   └── guides/
│       └── [template files]
│
├── scripts/
│   ├── deploy.sh                           # Deployment script
│   └── test.sh                             # Test runner
│
├── .env.example                            # Environment variable template
├── .env                                    # Environment variables (gitignored)
├── .gitignore
├── Dockerfile                              # Container definition
├── .dockerignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── README.md
```

---

## Design Decisions

### 1. Stateless Architecture

**Decision:** No database or persistent storage in MVP

**Rationale:**
- Aligns with Cloud Run's serverless model
- Reduces infrastructure complexity
- Minimizes operational overhead
- Faster MVP development
- Lower cost

**Trade-offs:**
- No audit trail for calculations
- Cannot track accuracy metrics over time
- Users cannot retrieve previous calculations

**Mitigation:**
- Use Cloud Logging for error tracking
- Future iteration can add Firestore for history

---

### 2. AI-First Approach

**Decision:** Use OpenAI for SIG parsing and NDC selection

**Rationale:**
- Handles complex, non-standard SIG text
- Provides reasoning for NDC selection
- Reduces need for extensive rule-based logic
- Adapts to variations in prescription writing

**Trade-offs:**
- Higher cost per request
- Non-deterministic behavior
- Potential for hallucinations
- API dependency

**Mitigation:**
- Validate AI output with schema enforcement
- Implement confidence scoring
- Add fallback to rule-based logic for common cases
- Use GPT-4o-mini for cost optimization

---

### 3. Real-Time API Calls (No Caching)

**Decision:** Query RxNorm and FDA APIs on every request

**Rationale:**
- Simplest implementation for MVP
- Always returns latest NDC data
- No cache invalidation complexity
- No storage costs

**Trade-offs:**
- Slower response times
- Vulnerable to external API downtime
- Potential rate limiting issues

**Mitigation:**
- Implement timeout and retry logic
- Add exponential backoff
- Monitor API health
- Plan caching for Phase 2

---

### 4. Cloud Run Deployment

**Decision:** Deploy as containerized service on GCP Cloud Run

**Rationale:**
- Auto-scales to zero (cost-efficient)
- Scales up automatically under load
- Simple deployment process
- Built-in HTTPS and CDN
- Perfect for SvelteKit

**Trade-offs:**
- Cold start latency
- Stateless containers (no in-memory caching)
- 60-minute request timeout (acceptable for 2s target)

**Mitigation:**
- Set minimum instances to 1 for production
- Optimize container startup time
- Use Cloud Run concurrency settings

---

### 5. No Authentication in MVP

**Decision:** Internal tool with no user authentication

**Rationale:**
- Simplifies MVP scope
- Faster development
- Suitable for internal pharmacy use
- Reduces security surface area

**Trade-offs:**
- Cannot track per-user metrics
- No user preferences
- Public endpoint if URL discovered

**Mitigation:**
- Deploy to private VPC network
- Use Cloud Run ingress controls
- Add authentication in Phase 2

---

## Technical Constraints

### Performance Requirements

**Target:** Handle normalization and computation in under 2 seconds per query

**Current Estimates:**
- OpenAI SIG parse: 1-2 seconds
- RxNorm lookup: 0.3-0.5 seconds
- FDA NDC query: 0.3-0.8 seconds
- OpenAI NDC selection: 1-2 seconds
- Business logic: <0.1 seconds

**Total:** 3-5 seconds (exceeds target)

**Optimization Strategies:**
- Parallel API calls where possible
- Optimize OpenAI prompts for speed
- Implement streaming responses for UX
- Future: Add caching layer

---

### Scalability Requirements

**Target:** Support concurrent usage by multiple users without degradation

**Cloud Run Configuration:**
- Max instances: 100 (adjustable)
- Concurrency: 80 requests per container
- CPU: 1 vCPU
- Memory: 512MB
- Autoscaling: Based on CPU utilization and request count

**Bottlenecks:**
- External API rate limits (especially OpenAI)
- Cold start latency

**Mitigation:**
- Monitor Cloud Run metrics
- Implement circuit breakers
- Add request queuing if needed

---

### Cost Constraints

**Estimated Monthly Costs (1000 queries/day):**
- OpenAI API: $300-600 (2 calls/query @ $0.01-0.02/query)
- Cloud Run: $10-30 (minimal with scale-to-zero)
- Cloud Logging: $5-10
- RxNorm/FDA APIs: $0 (free)

**Total:** $315-640/month

**Cost Optimization:**
- Use GPT-4o-mini instead of GPT-4o
- Minimize prompt tokens
- Scale to zero when idle
- Add caching to reduce API calls

---

## Security Considerations

### API Key Management

**Strategy:**
- Store API keys in environment variables
- Never commit keys to version control
- Use GCP Secret Manager for production
- Rotate keys periodically

**Configuration:**
```bash
# .env (local development)
OPENAI_API_KEY=sk-...
RXNORM_API_BASE_URL=https://rxnav.nlm.nih.gov/REST/
FDA_NDC_API_BASE_URL=https://api.fda.gov/drug/ndc.json

# Cloud Run (production)
# Use Secret Manager references
```

---

### Input Validation

**Strategy:**
- Sanitize all user inputs
- Validate data types and ranges
- Prevent injection attacks
- Limit input length

**Validation Rules:**
```typescript
// Input validation
const INPUT_CONSTRAINTS = {
  drugName: { maxLength: 200, required: false },
  ndc: { pattern: /^\d{5}-\d{3,4}-\d{1,2}$/, required: false },
  sig: { maxLength: 500, required: true },
  daysSupply: { min: 1, max: 365, required: true }
};
```

---

### HTTPS & Transport Security

**Configuration:**
- Cloud Run provides automatic HTTPS
- TLS 1.2+ enforced
- All external API calls use HTTPS
- HSTS headers enabled

---

### Data Privacy

**Considerations:**
- No PHI (Protected Health Information) stored
- No patient identifiers collected
- Prescription data processed in-memory only
- Logs sanitized to remove sensitive data

**Compliance:**
- HIPAA not applicable (no PHI storage)
- GDPR not applicable (no EU user data)

---

## Performance Optimization

### Frontend Optimization

**Strategies:**
- Code splitting with SvelteKit
- Lazy loading components
- Minimize bundle size
- Optimize images and assets

**Build Configuration:**
```typescript
// vite.config.ts
export default {
  build: {
    minify: 'esbuild',
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['openai']
        }
      }
    }
  }
};
```

---

### Backend Optimization

**Strategies:**
- Parallel API calls where possible
- Connection pooling for HTTP clients
- Efficient JSON parsing
- Minimize memory allocation

**Parallel Processing Example:**
```typescript
// After SIG parsing, fetch RxNorm data in parallel with OpenAI processing
const [rxnormData, aiContext] = await Promise.all([
  rxnormService.normalizeToRxCUI(parsedSIG.drugName),
  openaiService.prepareContext(parsedSIG)
]);
```

---

### Container Optimization

**Dockerfile Best Practices:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cache layer)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

EXPOSE 3000
CMD ["node", "build"]
```

**Container Size Target:** <200MB

---

## Error Handling Strategy

### Error Categories

**1. User Input Errors**
- Invalid drug name
- Malformed SIG
- Invalid days supply

**Response:**
```json
{
  "success": false,
  "error": "Invalid input: Days supply must be between 1 and 365",
  "code": "VALIDATION_ERROR"
}
```

---

**2. External API Errors**
- RxNorm API timeout
- FDA API unavailable
- OpenAI rate limit exceeded

**Response:**
```json
{
  "success": false,
  "error": "Unable to connect to drug database. Please try again.",
  "code": "EXTERNAL_API_ERROR",
  "retryable": true
}
```

---

**3. Business Logic Errors**
- No matching NDC found
- Ambiguous drug name
- Inactive NDC only

**Response:**
```json
{
  "success": true,
  "data": {...},
  "warnings": [
    {
      "type": "NO_EXACT_MATCH",
      "message": "No exact NDC match found. Showing closest alternatives.",
      "severity": "warning"
    }
  ]
}
```

---

**4. System Errors**
- Unexpected exceptions
- Memory errors
- Container crashes

**Response:**
```json
{
  "success": false,
  "error": "An unexpected error occurred. Please contact support.",
  "code": "INTERNAL_ERROR",
  "requestId": "abc-123-def"
}
```

---

### Error Handling Implementation

```typescript
// src/lib/server/utils/error-handler.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public retryable: boolean = false
  ) {
    super(message);
  }
}

export function handleAPIError(error: unknown) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      retryable: error.retryable
    };
  }

  // Log unexpected errors
  logger.error('Unexpected error', { error });

  return {
    success: false,
    error: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR'
  };
}
```

---

### Retry Logic

```typescript
// src/lib/server/utils/retry.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

---

## Monitoring and Observability

### Cloud Logging Integration

**Log Levels:**
- ERROR: System failures, external API errors
- WARN: No NDC match, deprecated features
- INFO: Request start/end, API calls
- DEBUG: Detailed execution flow (dev only)

**Structured Logging:**
```typescript
// src/lib/server/utils/logger.ts
import { Logging } from '@google-cloud/logging';

const logging = new Logging();
const log = logging.log('ndc-calculator');

export const logger = {
  info: (message: string, metadata?: object) => {
    log.write(log.entry({ severity: 'INFO', message, ...metadata }));
  },
  error: (message: string, metadata?: object) => {
    log.write(log.entry({ severity: 'ERROR', message, ...metadata }));
  },
  // ... other levels
};
```

---

### Metrics to Track

**Application Metrics:**
- Request count
- Response time (p50, p95, p99)
- Error rate
- Success rate

**External API Metrics:**
- OpenAI API latency
- RxNorm API latency
- FDA API latency
- API error rates

**Business Metrics:**
- NDC match success rate
- Warning frequency
- Most queried drugs

---

### Alerting Strategy

**Critical Alerts:**
- Error rate >5%
- Response time >10 seconds
- External API down
- Container crash loop

**Warning Alerts:**
- Response time >5 seconds
- Error rate >1%
- High API costs

**Implementation:**
- Cloud Monitoring alert policies
- Email/Slack notifications
- PagerDuty for critical issues (production)

---

## Scalability Considerations

### Horizontal Scaling

**Cloud Run Auto-Scaling:**
- Scales based on request volume
- Minimum instances: 0 (MVP) or 1 (production)
- Maximum instances: 100
- Target concurrency: 80 requests per container

**Configuration:**
```yaml
# cloud-run.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ndc-calculator
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "100"
        autoscaling.knative.dev/target: "80"
    spec:
      containers:
      - image: gcr.io/project/ndc-calculator
        resources:
          limits:
            cpu: "1"
            memory: "512Mi"
```

---

### Future Scalability Enhancements

**Phase 2 Optimizations:**
- Add Redis caching layer for common drugs
- Implement CDN for static assets
- Add request queuing for rate limit management
- Database for calculation history and analytics

**Estimated Capacity:**
- Current: 1,000-5,000 requests/day
- With caching: 10,000-50,000 requests/day
- With queue: 100,000+ requests/day

---

## Conclusion

This architecture provides a solid foundation for the NDC Packaging & Quantity Calculator MVP. The stateless, AI-first design leverages modern cloud-native technologies to deliver accurate prescription fulfillment recommendations while maintaining simplicity and cost-efficiency.

**Key Strengths:**
- Rapid development and deployment
- Cost-effective serverless infrastructure
- Intelligent AI-driven decision making
- Scalable Cloud Run platform

**Known Limitations:**
- No caching (slower responses, API dependency)
- No persistence (no audit trail)
- Exceeds 2-second performance target
- Non-deterministic AI behavior

**Next Steps:**
- Implement core calculation logic
- Integrate external APIs
- Build SvelteKit UI
- Deploy to Cloud Run
- Monitor and optimize performance
