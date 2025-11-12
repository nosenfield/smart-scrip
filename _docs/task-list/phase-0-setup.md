# Phase 0: Project Setup & Foundation

**Document Version:** 1.0
**Last Updated:** 2025-11-11

---

## Overview

This phase establishes the foundational infrastructure for the NDC Packaging & Quantity Calculator. Tasks include project initialization, dependency installation, development environment configuration, and baseline testing setup.

**Dependencies:** None (starting from scratch)

**Estimated Effort:** Foundation setup tasks

---

## Tasks

### 0.1 - Initialize SvelteKit Project

**Description:** Create new SvelteKit project with TypeScript configuration

**Implementation Steps:**
1. Run `npm create svelte@latest` in project directory
2. Select options:
   - TypeScript syntax: Yes
   - ESLint: Yes
   - Prettier: Yes
   - Playwright: Yes
   - Vitest: Yes
3. Verify project structure created correctly
4. Run `npm install` to install dependencies

**Acceptance Criteria:**
- SvelteKit project initialized with TypeScript
- All configuration files present (tsconfig.json, vite.config.ts, etc.)
- Dependencies installed successfully
- `npm run dev` starts development server

**Files Created:**
- `svelte.config.js`
- `vite.config.ts`
- `tsconfig.json`
- `package.json`
- `src/app.html`
- `src/routes/+page.svelte`

**Reference:** [architecture.md - Technology Stack](../architecture.md#technology-stack)

---

### 0.2 - Configure TypeScript Settings

**Description:** Optimize TypeScript configuration for strict type safety

**Implementation Steps:**
1. Update `tsconfig.json` with strict settings:
   ```json
   {
     "extends": "./.svelte-kit/tsconfig.json",
     "compilerOptions": {
       "strict": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noImplicitReturns": true,
       "noFallthroughCasesInSwitch": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true
     }
   }
   ```
2. Verify compilation with `npm run check`

**Acceptance Criteria:**
- TypeScript strict mode enabled
- No compilation errors
- Type checking passes

**Files Modified:**
- `tsconfig.json`

**Reference:** [architecture.md - Technology Stack](../architecture.md#technology-stack)

---

### 0.3 - Install Core Dependencies

**Description:** Install required npm packages for APIs and utilities

**Implementation Steps:**
1. Install production dependencies:
   ```bash
   npm install openai @google-cloud/logging
   ```
2. Install development dependencies:
   ```bash
   npm install -D @types/node
   ```
3. Verify `package.json` updated correctly

**Acceptance Criteria:**
- All dependencies listed in package.json
- `node_modules` populated
- No installation errors
- `npm run build` succeeds

**Dependencies Installed:**
- `openai` - OpenAI API client
- `@google-cloud/logging` - Cloud Logging integration
- `@types/node` - Node.js type definitions

**Reference:** [architecture.md - Technology Stack](../architecture.md#technology-stack)

---

### 0.4 - Setup Environment Variables

**Description:** Configure environment variable management for API keys

**Implementation Steps:**
1. Create `.env.example` template:
   ```bash
   # OpenAI Configuration
   OPENAI_API_KEY=sk-your-api-key-here
   OPENAI_MODEL=gpt-4o-mini

   # RxNorm API
   RXNORM_API_BASE_URL=https://rxnav.nlm.nih.gov/REST

   # FDA NDC Directory API
   FDA_NDC_API_BASE_URL=https://api.fda.gov/drug/ndc.json

   # Application
   PUBLIC_APP_NAME=NDC Packaging Calculator
   ```
2. Create `.env` file (gitignored)
3. Add `.env` to `.gitignore` if not already present
4. Document environment variables in README.md

**Acceptance Criteria:**
- `.env.example` committed to repository
- `.env` gitignored
- Environment variables accessible in SvelteKit

**Files Created:**
- `.env.example`
- `.env` (gitignored)

**Files Modified:**
- `.gitignore`

**Reference:** [architecture.md - API Key Management](../architecture.md#api-key-management)

---

### 0.5 - Create Directory Structure

**Description:** Establish project directory structure per architecture specification

**Implementation Steps:**
1. Create directories:
   ```bash
   mkdir -p src/lib/components
   mkdir -p src/lib/server/services
   mkdir -p src/lib/server/logic
   mkdir -p src/lib/server/utils
   mkdir -p src/lib/types
   mkdir -p src/lib/stores
   mkdir -p src/lib/config
   mkdir -p src/routes/api/calculate
   mkdir -p tests/unit
   mkdir -p tests/integration
   ```
2. Create placeholder `.gitkeep` files in empty directories
3. Verify structure matches architecture document

**Acceptance Criteria:**
- All directories created
- Structure matches [architecture.md - Directory Structure](../architecture.md#directory-structure)
- Directories tracked in git

**Directories Created:**
- `src/lib/components/`
- `src/lib/server/services/`
- `src/lib/server/logic/`
- `src/lib/server/utils/`
- `src/lib/types/`
- `src/lib/stores/`
- `src/lib/config/`
- `src/routes/api/calculate/`
- `tests/unit/`
- `tests/integration/`

**Reference:** [architecture.md - Directory Structure](../architecture.md#directory-structure)

---

### 0.6 - Configure Testing Framework

**Description:** Setup Vitest for unit testing and configure test environment

**Implementation Steps:**
1. Create `vitest.config.ts`:
   ```typescript
   import { defineConfig } from 'vitest/config';
   import { sveltekit } from '@sveltejs/kit/vite';

   export default defineConfig({
     plugins: [sveltekit()],
     test: {
       include: ['tests/**/*.test.ts'],
       environment: 'node',
       globals: true,
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html']
       }
     }
   });
   ```
2. Add test scripts to `package.json`:
   ```json
   {
     "scripts": {
       "test": "vitest run",
       "test:watch": "vitest",
       "test:coverage": "vitest run --coverage"
     }
   }
   ```
3. Create sample test to verify setup:
   ```typescript
   // tests/unit/sample.test.ts
   import { describe, it, expect } from 'vitest';

   describe('Sample Test', () => {
     it('should pass', () => {
       expect(true).toBe(true);
     });
   });
   ```
4. Run `npm test` to verify configuration

**Acceptance Criteria:**
- Vitest configured correctly
- Sample test passes
- `npm test` executes successfully
- Coverage reporting enabled

**Files Created:**
- `vitest.config.ts`
- `tests/unit/sample.test.ts`

**Files Modified:**
- `package.json`

**Reference:** [architecture.md - Testing Strategy](../architecture.md#testing-strategy)

---

### 0.7 - Setup ESLint and Prettier

**Description:** Configure code quality and formatting tools

**Implementation Steps:**
1. Verify `.eslintrc.cjs` exists (created by SvelteKit init)
2. Create `.prettierrc`:
   ```json
   {
     "useTabs": false,
     "tabWidth": 2,
     "singleQuote": true,
     "trailingComma": "none",
     "printWidth": 100,
     "plugins": ["prettier-plugin-svelte"],
     "overrides": [
       {
         "files": "*.svelte",
         "options": {
           "parser": "svelte"
         }
       }
     ]
   }
   ```
3. Add scripts to `package.json`:
   ```json
   {
     "scripts": {
       "lint": "eslint .",
       "format": "prettier --write .",
       "format:check": "prettier --check ."
     }
   }
   ```
4. Run `npm run format` to format existing files
5. Run `npm run lint` to verify no errors

**Acceptance Criteria:**
- ESLint and Prettier configured
- All files formatted consistently
- No linting errors
- Format check passes in CI

**Files Created:**
- `.prettierrc`

**Files Modified:**
- `package.json`

**Reference:** [architecture.md - Development Tools](../architecture.md#development-tools)

---

### 0.8 - Create Base Type Definitions

**Description:** Define TypeScript interfaces for core domain models

**Implementation Steps:**
1. Create `src/lib/types/prescription.types.ts`:
   ```typescript
   export interface ParsedSIG {
     dose: number;
     unit: string;
     frequency: number;
     route: string;
     duration?: number;
     specialInstructions?: string;
   }

   export interface PrescriptionInput {
     drugName?: string;
     ndc?: string;
     sig: string;
     daysSupply: number;
   }
   ```
2. Create `src/lib/types/ndc.types.ts`:
   ```typescript
   export interface NDCPackage {
     ndc: string;
     packageSize: number;
     packageUnit: string;
     status: 'active' | 'inactive';
     manufacturer?: string;
   }

   export interface SelectedNDC {
     ndc: string;
     quantity: number;
     packageCount: number;
     overfill?: number;
     underfill?: number;
   }
   ```
3. Create `src/lib/types/api.types.ts`:
   ```typescript
   import type { SelectedNDC } from './ndc.types';
   import type { ParsedSIG } from './prescription.types';

   export interface CalculationRequest {
     drugName?: string;
     ndc?: string;
     sig: string;
     daysSupply: number;
   }

   export interface Warning {
     type: string;
     message: string;
     severity: 'info' | 'warning' | 'error';
   }

   export interface CalculationResponse {
     success: boolean;
     data?: {
       rxcui: string;
       normalizedDrug: {
         name: string;
         strength: string;
         doseForm: string;
       };
       parsedSIG: ParsedSIG;
       selectedNDCs: SelectedNDC[];
       totalQuantity: number;
       warnings: Warning[];
       aiReasoning?: string;
     };
     error?: string;
     code?: string;
   }
   ```
4. Create barrel export `src/lib/types/index.ts`:
   ```typescript
   export * from './prescription.types';
   export * from './ndc.types';
   export * from './api.types';
   ```

**Acceptance Criteria:**
- All base types defined
- TypeScript compilation successful
- Types exported from index.ts
- No linting errors

**Files Created:**
- `src/lib/types/prescription.types.ts`
- `src/lib/types/ndc.types.ts`
- `src/lib/types/api.types.ts`
- `src/lib/types/index.ts`

**Reference:** [architecture.md - Type Definitions](../architecture.md#type-definitions)

---

### 0.9 - Setup Docker Configuration

**Description:** Create Dockerfile for Cloud Run deployment

**Implementation Steps:**
1. Create `Dockerfile`:
   ```dockerfile
   FROM node:20-alpine AS builder

   WORKDIR /app

   COPY package*.json ./
   RUN npm ci

   COPY . .
   RUN npm run build
   RUN npm prune --production

   FROM node:20-alpine

   WORKDIR /app

   COPY --from=builder /app/build build/
   COPY --from=builder /app/node_modules node_modules/
   COPY package.json .

   EXPOSE 3000
   ENV NODE_ENV=production

   CMD ["node", "build"]
   ```
2. Create `.dockerignore`:
   ```
   node_modules
   .svelte-kit
   .git
   .env
   .env.*
   !.env.example
   npm-debug.log
   .DS_Store
   tests
   _docs
   README.md
   .prettierrc
   .eslintrc.cjs
   ```
3. Test local build:
   ```bash
   docker build -t ndc-calculator .
   ```

**Acceptance Criteria:**
- Dockerfile creates working container
- Container size <200MB
- Docker build succeeds
- `.dockerignore` excludes dev files

**Files Created:**
- `Dockerfile`
- `.dockerignore`

**Reference:** [architecture.md - Container Optimization](../architecture.md#container-optimization)

---

### 0.10 - Create Configuration Constants

**Description:** Define application-wide constants and configuration

**Implementation Steps:**
1. Create `src/lib/config/constants.ts`:
   ```typescript
   export const API_TIMEOUTS = {
     OPENAI: 30000, // 30 seconds
     RXNORM: 10000, // 10 seconds
     FDA_NDC: 10000 // 10 seconds
   } as const;

   export const RETRY_CONFIG = {
     MAX_RETRIES: 3,
     BASE_DELAY: 1000, // 1 second
     MAX_DELAY: 10000 // 10 seconds
   } as const;

   export const INPUT_CONSTRAINTS = {
     DRUG_NAME_MAX_LENGTH: 200,
     SIG_MAX_LENGTH: 500,
     DAYS_SUPPLY_MIN: 1,
     DAYS_SUPPLY_MAX: 365
   } as const;

   export const WARNING_TYPES = {
     NO_EXACT_MATCH: 'NO_EXACT_MATCH',
     INACTIVE_NDC: 'INACTIVE_NDC',
     OVERFILL: 'OVERFILL',
     UNDERFILL: 'UNDERFILL',
     MULTIPLE_PACKAGES: 'MULTIPLE_PACKAGES'
   } as const;

   export const ERROR_CODES = {
     VALIDATION_ERROR: 'VALIDATION_ERROR',
     EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
     BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
     INTERNAL_ERROR: 'INTERNAL_ERROR'
   } as const;
   ```

**Acceptance Criteria:**
- Constants file created
- All values properly typed with `as const`
- No magic numbers in codebase
- TypeScript provides autocomplete for constants

**Files Created:**
- `src/lib/config/constants.ts`

**Reference:** [architecture.md - Directory Structure](../architecture.md#directory-structure)

---

### 0.11 - Initialize Git Workflow

**Description:** Configure git hooks and commit conventions

**Implementation Steps:**
1. Verify `.gitignore` includes:
   ```
   .DS_Store
   node_modules
   /build
   /.svelte-kit
   /package
   .env
   .env.*
   !.env.example
   vite.config.js.timestamp-*
   vite.config.ts.timestamp-*
   ```
2. Create `.github/workflows/` directory for future CI/CD
3. Initial commit of base structure:
   ```bash
   git add .
   git commit -m "chore: initialize project with SvelteKit and TypeScript"
   ```

**Acceptance Criteria:**
- `.gitignore` properly configured
- Sensitive files excluded
- Initial commit created
- GitHub Actions directory ready

**Files Modified:**
- `.gitignore`

**Directories Created:**
- `.github/workflows/`

**Reference:** [architecture.md - Deployment Architecture](../architecture.md#deployment-architecture)

---

### 0.12 - Create README Documentation

**Description:** Document project setup and development instructions

**Implementation Steps:**
1. Create comprehensive `README.md`:
   ```markdown
   # NDC Packaging & Quantity Calculator

   AI-accelerated tool for accurate prescription fulfillment by matching prescriptions with valid National Drug Codes (NDCs) and calculating correct dispense quantities.

   ## Tech Stack

   - SvelteKit 2.x
   - TypeScript 5.x
   - OpenAI API
   - RxNorm API
   - FDA NDC Directory API
   - Google Cloud Platform (Cloud Run)

   ## Prerequisites

   - Node.js 20.x LTS
   - npm 10.x
   - Docker (for containerized deployment)
   - OpenAI API key

   ## Setup

   1. Clone repository
   2. Install dependencies: `npm install`
   3. Copy environment variables: `cp .env.example .env`
   4. Add your OpenAI API key to `.env`
   5. Start dev server: `npm run dev`

   ## Development

   - `npm run dev` - Start development server
   - `npm run build` - Build production bundle
   - `npm run preview` - Preview production build
   - `npm test` - Run tests
   - `npm run lint` - Lint code
   - `npm run format` - Format code

   ## Documentation

   See `_docs/` directory for detailed documentation:
   - [PRD](/_docs/prd.md)
   - [Architecture](/_docs/architecture.md)
   - [Task List](/_docs/task-list.md)

   ## License

   Proprietary
   ```

**Acceptance Criteria:**
- README.md created
- Setup instructions clear
- All npm scripts documented
- Links to documentation working

**Files Created:**
- `README.md`

**Reference:** [architecture.md - Overview](../architecture.md#executive-summary)

---

## Phase Completion Criteria

All tasks (0.1 - 0.12) completed and verified:
- [ ] SvelteKit project initialized
- [ ] TypeScript configured with strict mode
- [ ] Core dependencies installed
- [ ] Environment variables configured
- [ ] Directory structure created
- [ ] Testing framework setup
- [ ] Linting and formatting configured
- [ ] Base type definitions created
- [ ] Docker configuration ready
- [ ] Application constants defined
- [ ] Git workflow initialized
- [ ] README documentation complete

**Next Phase:** [Phase 1: Core Services & API Integration](phase-1-services.md)
