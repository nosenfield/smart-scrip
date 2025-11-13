# SmartScrip 🧠💊

**AI-powered prescription finder** - An intelligent tool for accurate prescription fulfillment by matching prescriptions with valid National Drug Codes (NDCs) and calculating optimal dispense quantities.

**Production URL:** https://ndc-calculator-izsgspdfsa-uc.a.run.app

## Overview

SmartScrip helps pharmacy systems accurately match prescriptions to valid NDCs and determine correct dispense quantities. It addresses common issues like dosage form mismatches, package size errors, and inactive NDCs that lead to claim rejections and operational delays.

## Tech Stack

### Frontend
- **SvelteKit 2.47** - Full-stack web framework
- **Svelte 5.41** - Component framework
- **TypeScript 5.9** - Strict mode type safety
- **Vite 7.1** - Build tool and dev server

### Backend
- **Node.js 20.x LTS** - Runtime
- **SvelteKit** - Server-side API routes
- **@sveltejs/adapter-node** - Production adapter

### Infrastructure
- **Google Cloud Run** - Serverless hosting
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **Google Cloud Logging** - Structured logging

### External Services
- **OpenAI API (GPT-4o-mini)** - AI-powered SIG parsing and NDC selection reasoning
- **RxNorm API** - Drug normalization and RxCUI lookup
- **FDA NDC Directory API** - NDC package information

### Testing & Quality
- **Vitest 4.0** - Unit and integration testing
- **ESLint 9.39** - Code linting
- **Prettier 3.6** - Code formatting

## Prerequisites

- Node.js 20.x LTS
- npm 10.x
- Docker (for containerized deployment)
- OpenAI API key

## Setup

1. **Clone repository**

   ```bash
   git clone <repository-url>
   cd smart-scrip
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your OpenAI API key:

   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Development Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run check` - Type check TypeScript
- `npm run lint` - Lint code with ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Project Structure

```
smart-scrip/
├── src/
│   ├── lib/
│   │   ├── components/       # Svelte components
│   │   ├── server/
│   │   │   ├── services/    # External API integrations
│   │   │   ├── logic/       # Business logic
│   │   │   └── utils/       # Server utilities
│   │   ├── types/           # TypeScript type definitions
│   │   ├── stores/          # Svelte stores
│   │   └── config/          # Configuration and constants
│   └── routes/
│       └── api/             # API endpoints
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── patterns/            # Test pattern templates
├── _docs/                   # Project documentation
└── static/                  # Static assets
```

## Key Features

### Product Matching Capabilities
- **Dual Input Methods**: Accepts drug name or NDC code
- **Intelligent Search Strategy**: 
  - RxCUI lookup (preferred, standardized)
  - Generic name fallback
  - Original drug name fallback
- **Smart Package Matching**:
  - Filters to active NDCs only
  - Matches by unit (tablet, ml, etc.)
  - Exact match → closest single package → optimal combination
  - Minimizes waste while keeping package count low
- **AI Enhancement**: Refines deterministic matches with reasoning and validates selections

### Core Functionality
- **AI-Powered SIG Parsing**: Uses OpenAI GPT-4o-mini to parse complex prescription instructions
- **Drug Normalization**: Leverages RxNorm API for standardized drug identification (RxCUI)
- **NDC Matching**: Finds appropriate NDC packages from FDA database
- **Quantity Calculation**: Automatically calculates dispense quantities with overfill/underfill warnings
- **Type Safety**: Fully typed TypeScript codebase with strict mode
- **Test Coverage**: Comprehensive unit and integration tests
- **Production Ready**: Deployed on Google Cloud Run with CI/CD

## API Endpoints

### POST /api/calculate

Calculate NDC packages and quantities for a prescription.

**Request (Drug Name):**

```json
{
	"drugName": "Lisinopril 10mg tablet",
	"sig": "Take 1 tablet by mouth once daily",
	"daysSupply": 30
}
```

**Request (NDC):**

```json
{
	"ndc": "65862-045-00",
	"sig": "Take 1 tablet by mouth once daily",
	"daysSupply": 30
}
```

**Response:**

```json
{
	"success": true,
	"data": {
		"rxcui": "314076",
		"normalizedDrug": {
			"name": "lisinopril 10 MG Oral Tablet",
			"strength": "1",
			"doseForm": "tablet"
		},
		"parsedSIG": {
			"dose": 1,
			"unit": "tablet",
			"frequency": 1,
			"route": "by mouth",
			"specialInstructions": "once daily"
		},
		"selectedNDCs": [
			{
				"ndc": "65862-045-30",
				"quantity": 30,
				"packageCount": 1
			}
		],
		"totalQuantity": 30,
		"warnings": [],
		"aiReasoning": "The NDC 65862-045-30 provides an exact match..."
	}
}
```

## Documentation

See `_docs/` directory for detailed documentation:

- [PRD](_docs/prd.md) - Product Requirements Document
- [Architecture](_docs/architecture.md) - System architecture and design
- [Deployment](_docs/deployment.md) - Deployment procedures and scripts
- [Production Readiness](_docs/production-readiness.md) - Pre-deployment checklist
- [Cloud Logging](_docs/cloud-logging.md) - Logging configuration
- [Monitoring](_docs/monitoring.md) - Monitoring and alerting setup
- [Task Tracker](_docs/task-tracker.md) - Development progress tracking

## Testing

The project uses Vitest for testing with pattern-based test templates:

- **Unit Tests**: Test individual functions and modules in isolation
- **Integration Tests**: Test component interactions and API endpoints
- **Test Patterns**: Reusable test templates for common scenarios

Run tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Testing Scripts

Test random drugs to verify search/matching:

```bash
# Test 10 random drugs by name
./scripts/test-random-drugs.sh

# Test 5 NDCs with varying quantities
./scripts/test-ndc-variations.sh

# Test against custom API URL
./scripts/test-random-drugs.sh https://your-api-url.com/api/calculate
```

## Deployment

### Google Cloud Run (Production)

Deploy to Google Cloud Run:

```bash
# Setup secrets (first time only)
./scripts/setup-secrets.sh PROJECT_ID YOUR_OPENAI_API_KEY

# Deploy
./scripts/deploy.sh PROJECT_ID [REGION]
```

The deployment script will:
- Build Docker image
- Push to Google Container Registry
- Deploy to Cloud Run
- Configure environment variables and secrets
- Output service URL

### Docker (Local)

Build and run with Docker:

```bash
# Build image
docker build -t ndc-calculator .

# Run container
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=your-key-here \
  -e RXNORM_API_BASE_URL=https://rxnav.nlm.nih.gov/REST \
  -e FDA_NDC_API_BASE_URL=https://api.fda.gov/drug/ndc.json \
  -e OPENAI_MODEL=gpt-4o-mini \
  ndc-calculator
```

### CI/CD

Automated deployment via GitHub Actions on push to `main` branch. See `.github/workflows/deploy.yml` for configuration.

## Environment Variables

| Variable               | Description                    | Default                             | Required |
| ---------------------- | ------------------------------ | ----------------------------------- | -------- |
| `OPENAI_API_KEY`       | OpenAI API key                 | -                                   | Yes      |
| `OPENAI_MODEL`         | OpenAI model to use            | `gpt-4o-mini`                       | No       |
| `RXNORM_API_BASE_URL`  | RxNorm API base URL            | `https://rxnav.nlm.nih.gov/REST`    | No       |
| `FDA_NDC_API_BASE_URL` | FDA NDC Directory API base URL | `https://api.fda.gov/drug/ndc.json` | No       |
| `PUBLIC_APP_NAME`      | Application display name       | `NDC Packaging Calculator`          | No       |

## Project Status

**Current Phase:** Phase 6 Complete (Deployment & DevOps) ✅

- ✅ Phase 0: Project Setup & Foundation
- ✅ Phase 1: Core Services & API Integration
- ✅ Phase 2: Business Logic & Calculations
- ✅ Phase 3: API Routes & Orchestration
- ✅ Phase 4: Frontend UI
- ✅ Phase 6: Deployment & DevOps
- 🔄 Phase 5: Testing & Quality Assurance (in progress)

See `_docs/task-tracker.md` for detailed progress.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `npm run check` and `npm test`
4. Format code with `npm run format`
5. Submit a pull request

## License

Proprietary - All rights reserved

---

**Built with ❤️ for accurate prescription fulfillment**
