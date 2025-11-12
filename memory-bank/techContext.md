# Technical Context: smart-scrip

**Last Updated**: 2025-11-11

## Tech Stack

### Frontend
- **Framework**: SvelteKit 2.47.1 (full-stack)
- **Language**: TypeScript 5.9.3 (strict mode enabled)
- **Build Tool**: Vite 7.1.10
- **Styling**: (TBD - to be implemented in Phase 4)
- **State Management**: Svelte 5 stores (built-in)

### Backend
- **Runtime**: Node.js 20.x LTS
- **Framework**: SvelteKit 2.47.1 (server-side)
- **Language**: TypeScript 5.9.3
- **Database**: None (stateless MVP)
- **Adapter**: @sveltejs/adapter-auto (7.0.0) - will migrate to adapter-node for production

### Infrastructure
- **Hosting**: Google Cloud Run (planned)
- **Logging**: Google Cloud Logging (@google-cloud/logging 11.2.1)
- **CI/CD**: GitHub Actions (planned)
- **Containerization**: Docker (multi-stage build)

### External Services
- **AI/ML**: OpenAI API (openai 6.8.1) - GPT-4o-mini for SIG parsing
- **Drug Data**: RxNorm API (NIH/NLM) - drug normalization
- **NDC Data**: FDA NDC Directory API - package information

### Testing
- **Unit Tests**: Vitest 4.0.8
- **Coverage**: @vitest/coverage-v8 4.0.8
- **Integration Tests**: Vitest (planned)
- **E2E Tests**: (TBD - Phase 5)

### Code Quality
- **Linting**: ESLint 9.39.1 with TypeScript plugin
- **Formatting**: Prettier 3.6.2 with Svelte plugin
- **Type Checking**: TypeScript compiler + svelte-check 4.3.3

---

## Development Setup

### Prerequisites
```bash
- Node.js 20.x LTS
- npm 10.x
- Docker Desktop (for containerization testing)
- OpenAI API key
```

### Installation
```bash
# Clone repository
git clone <repo-url>
cd smart-scrip

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your OPENAI_API_KEY

# Start development server
npm run dev
```

### Environment Variables
```bash
# Required
OPENAI_API_KEY=sk-your-key-here    # OpenAI API key
OPENAI_MODEL=gpt-4o-mini           # Model to use (default)

# Optional (have defaults)
RXNORM_API_BASE_URL=https://rxnav.nlm.nih.gov/REST
FDA_NDC_API_BASE_URL=https://api.fda.gov/drug/ndc.json
PUBLIC_APP_NAME=NDC Packaging Calculator
```

---

## Dependencies

### Core Dependencies
- `openai@6.8.1` - OpenAI API client for SIG parsing
- `@google-cloud/logging@11.2.1` - Cloud Logging integration

### Development Dependencies
- `@sveltejs/kit@2.47.1` - Full-stack framework
- `@sveltejs/vite-plugin-svelte@6.2.1` - Vite integration
- `svelte@5.41.0` - UI framework
- `typescript@5.9.3` - Type safety
- `vitest@4.0.8` - Testing framework
- `@vitest/coverage-v8@4.0.8` - Test coverage
- `eslint@9.39.1` - Linting
- `prettier@3.6.2` - Code formatting
- `svelte-check@4.3.3` - Svelte type checking

### Why We Chose These

**SvelteKit**: Full-stack framework providing both frontend and backend in one cohesive package. Excellent TypeScript support, built-in routing, and server-side rendering.

**TypeScript Strict Mode**: Ensures type safety throughout the codebase, catching errors at compile time rather than runtime.

**Vitest**: Modern, fast testing framework with excellent TypeScript and Vite integration.

**OpenAI GPT-4o-mini**: Cost-effective model with strong natural language understanding for parsing complex prescription instructions (SIG).

**Google Cloud Platform**: Reliable infrastructure with integrated logging and monitoring for healthcare applications.

---

## Technical Constraints

### Performance Requirements
- API response time: <2s (p95) for full calculation
- OpenAI API timeout: 30s
- RxNorm API timeout: 10s
- FDA NDC API timeout: 10s
- Page load: <2s

### Platform Constraints
- Must support: Chrome, Firefox, Safari, Edge (last 2 versions)
- Responsive design: Desktop and tablet
- No offline functionality required (API-dependent)
- Mobile responsive: Yes

### Security Requirements
- Environment variables: Server-side only ($env/static/private)
- API keys: Never exposed to client
- HTTPS: Required in production
- No authentication: MVP is open access (to be added later)

---

## Build & Deployment

### Build Process
```bash
# Type check
npm run check

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format

# Production build
npm run build
```

### Deployment
```bash
# Build Docker image
docker build -t ndc-calculator .

# Run container locally
docker run -p 3000:3000 --env-file .env ndc-calculator

# Deploy to Cloud Run (Phase 6)
# TBD - deployment scripts to be created
```

### Environments
- **Development**: Local (http://localhost:5173)
- **Staging**: TBD
- **Production**: TBD (Cloud Run)

---

## Troubleshooting

### Common Issues

#### Issue 1: Docker build fails with "cannot find build directory"
**Solution**: Currently using adapter-auto which outputs to `.svelte-kit/output/` instead of `build/`. For local Docker testing, apply temporary Dockerfile changes documented in `_docs/guides/docker-testing.md`. For production, will migrate to adapter-node in Phase 6.

#### Issue 2: Environment variables not loading
**Solution**: Ensure using `$env/static/private` for server-side variables. Never use `$env/dynamic/private` or client-side env imports for secrets.

#### Issue 3: TypeScript errors in test files
**Solution**: Run `npm run check` to see full error details. Ensure all test files import types correctly from vitest.

---

## Configuration Files

### Key Config Files
- `svelte.config.js` - SvelteKit configuration
- `vite.config.ts` - Vite + Vitest configuration
- `tsconfig.json` - TypeScript strict mode settings
- `.eslintrc.cjs` - ESLint rules
- `.prettierrc` - Code formatting rules
- `Dockerfile` - Container build configuration
- `.dockerignore` - Files excluded from Docker build
- `.env.example` - Environment variable template

### Important Settings
- **TypeScript strict mode**: All strict flags enabled
- **Node engine**: 20.x enforced via .npmrc
- **Test globals**: Enabled in vite.config.ts
- **Port**: 3000 (development), dynamic in Cloud Run
