# NDC Packaging & Quantity Calculator

AI-accelerated tool for accurate prescription fulfillment by matching prescriptions with valid National Drug Codes (NDCs) and calculating correct dispense quantities.

## Tech Stack

- **SvelteKit 2.x** - Full-stack web framework
- **TypeScript 5.x** - Type-safe development
- **OpenAI API** - AI-powered SIG parsing and reasoning
- **RxNorm API** - Drug normalization and RXCUI lookup
- **FDA NDC Directory API** - NDC package information
- **Google Cloud Platform** - Cloud Run deployment
- **Vitest** - Unit testing framework

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

- **AI-Powered SIG Parsing**: Uses OpenAI GPT-4o-mini to parse complex prescription instructions
- **Drug Normalization**: Leverages RxNorm API for standardized drug identification
- **NDC Matching**: Finds appropriate NDC packages from FDA database
- **Quantity Calculation**: Automatically calculates dispense quantities with overfill/underfill handling
- **Type Safety**: Fully typed TypeScript codebase
- **Test Coverage**: Comprehensive unit and integration tests
- **Cloud Ready**: Containerized for deployment on Google Cloud Run

## API Endpoints

### POST /api/calculate

Calculate NDC packages and quantities for a prescription.

**Request:**

```json
{
	"drugName": "Lisinopril 10mg tablets",
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
			"name": "Lisinopril",
			"strength": "10 mg",
			"doseForm": "Oral Tablet"
		},
		"parsedSIG": {
			"dose": 1,
			"unit": "tablet",
			"frequency": 1,
			"route": "oral"
		},
		"selectedNDCs": [
			{
				"ndc": "12345-678-90",
				"quantity": 30,
				"packageCount": 1
			}
		],
		"totalQuantity": 30,
		"warnings": []
	}
}
```

## Documentation

See `_docs/` directory for detailed documentation:

- [PRD](_docs/prd.md) - Product Requirements Document
- [Architecture](_docs/architecture.md) - System architecture and design
- [Task List](_docs/task-list.md) - Development task breakdown
- [Best Practices](_docs/best-practices.md) - Coding standards and patterns

## Testing

The project uses Vitest for testing with pattern-based test templates:

- **Unit Tests**: Test individual functions and modules in isolation
- **Integration Tests**: Test component interactions and API endpoints
- **Test Patterns**: Reusable test templates for common scenarios

Run tests with coverage:

```bash
npm run test:coverage
```

## Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t ndc-calculator .

# Run container
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=your-key-here \
  ndc-calculator
```

## Environment Variables

| Variable               | Description                    | Default                             | Required |
| ---------------------- | ------------------------------ | ----------------------------------- | -------- |
| `OPENAI_API_KEY`       | OpenAI API key                 | -                                   | Yes      |
| `OPENAI_MODEL`         | OpenAI model to use            | `gpt-4o-mini`                       | No       |
| `RXNORM_API_BASE_URL`  | RxNorm API base URL            | `https://rxnav.nlm.nih.gov/REST`    | No       |
| `FDA_NDC_API_BASE_URL` | FDA NDC Directory API base URL | `https://api.fda.gov/drug/ndc.json` | No       |
| `PUBLIC_APP_NAME`      | Application display name       | `NDC Packaging Calculator`          | No       |

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `npm run check` and `npm test`
4. Format code with `npm run format`
5. Submit a pull request

## License

Proprietary - All rights reserved
