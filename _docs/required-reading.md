# Required Reading for NDC Calculator Development

**Document Version:** 1.0
**Last Updated:** 2025-11-11

---

## Overview

This document provides essential reading materials for developers working on the NDC Packaging & Quantity Calculator. Resources are organized by topic and priority level.

**Priority Levels:**
- **Critical** - Must read before starting development
- **Important** - Read during relevant phase
- **Reference** - Consult as needed

---

## Table of Contents

1. [Project Documentation](#project-documentation)
2. [SvelteKit & Svelte](#sveltekit--svelte)
3. [TypeScript](#typescript)
4. [External APIs](#external-apis)
5. [OpenAI Integration](#openai-integration)
6. [Google Cloud Platform](#google-cloud-platform)
7. [Testing](#testing)
8. [Healthcare & Pharmacy](#healthcare--pharmacy)

---

## Project Documentation

### Critical

**[Product Requirements Document (PRD)](prd.md)**
- Purpose: Understand project goals, user needs, and success criteria
- Key Sections: Problem statement, functional requirements, success metrics
- Read: Before starting any development

**[Architecture Document](architecture.md)**
- Purpose: Understand technical design and system components
- Key Sections: Technology stack, data flow, API integration strategy
- Read: Before Phase 0

**[Task List](task-list.md)**
- Purpose: Development roadmap and task breakdown
- Key Sections: All phases, task dependencies
- Read: Before each phase

**[Best Practices](best-practices.md)**
- Purpose: Coding standards and conventions
- Key Sections: TypeScript practices, error handling, testing
- Read: Before writing code

---

### Important

**[Task Tracker](task-tracker.md)**
- Purpose: Monitor development progress
- Usage: Update as tasks complete
- Read: Throughout development

**[API Specification](api-spec.md)** (Created in Phase 3)
- Purpose: Understand API contracts
- Key Sections: Request/response formats, error codes
- Read: During Phase 3

---

## SvelteKit & Svelte

### Critical

**SvelteKit Documentation - Introduction**
- URL: https://kit.svelte.dev/docs/introduction
- Topics: SvelteKit basics, routing, server vs client code
- Priority: Critical
- Phase: Phase 0

**SvelteKit Documentation - Routing**
- URL: https://kit.svelte.dev/docs/routing
- Topics: File-based routing, layouts, API routes
- Priority: Critical
- Phase: Phase 0, Phase 3, Phase 4

**Svelte Tutorial**
- URL: https://learn.svelte.dev/
- Topics: Reactivity, components, props, events
- Priority: Critical
- Phase: Phase 4

---

### Important

**SvelteKit Documentation - Form Actions**
- URL: https://kit.svelte.dev/docs/form-actions
- Topics: Progressive enhancement, form handling
- Priority: Important
- Phase: Phase 4

**SvelteKit Documentation - Load Functions**
- URL: https://kit.svelte.dev/docs/load
- Topics: Server vs universal load, data fetching
- Priority: Important
- Phase: Phase 4

**Svelte Documentation - Stores**
- URL: https://svelte.dev/docs/svelte-store
- Topics: Writable stores, derived stores, custom stores
- Priority: Important
- Phase: Phase 4

---

### Reference

**SvelteKit Documentation - Adapters**
- URL: https://kit.svelte.dev/docs/adapters
- Topics: Deployment adapters, adapter-node
- Priority: Reference
- Phase: Phase 6

**SvelteKit Documentation - Advanced Routing**
- URL: https://kit.svelte.dev/docs/advanced-routing
- Topics: Route parameters, layouts, error pages
- Priority: Reference
- Phase: As needed

---

## TypeScript

### Critical

**TypeScript Handbook - Everyday Types**
- URL: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- Topics: Basic types, type annotations, interfaces
- Priority: Critical
- Phase: Phase 0

**TypeScript Handbook - Narrowing**
- URL: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- Topics: Type guards, typeof, instanceof
- Priority: Critical
- Phase: Phase 1, Phase 2

---

### Important

**TypeScript Handbook - Generics**
- URL: https://www.typescriptlang.org/docs/handbook/2/generics.html
- Topics: Generic functions, constraints
- Priority: Important
- Phase: Phase 1

**TypeScript Handbook - Modules**
- URL: https://www.typescriptlang.org/docs/handbook/2/modules.html
- Topics: Import/export, module resolution
- Priority: Important
- Phase: Phase 0

**TypeScript Best Practices**
- URL: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- Topics: Do's and don'ts, common pitfalls
- Priority: Important
- Phase: Throughout

---

### Reference

**TypeScript Utility Types**
- URL: https://www.typescriptlang.org/docs/handbook/utility-types.html
- Topics: Partial, Pick, Omit, Record
- Priority: Reference
- Phase: As needed

---

## External APIs

### Critical

**RxNorm API Overview**
- URL: https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html
- Topics: RxCUI, drug normalization, API endpoints
- Priority: Critical
- Phase: Phase 1
- Key Endpoints:
  - `/REST/rxcui.json?name={drugName}`
  - `/REST/rxcui/{rxcui}/properties.json`

**FDA NDC Directory API**
- URL: https://open.fda.gov/apis/drug/ndc/
- Topics: NDC lookup, package information, marketing status
- Priority: Critical
- Phase: Phase 1
- Key Endpoints:
  - `/drug/ndc.json?search=rxcui:{rxcui}`
  - `/drug/ndc.json?search=product_ndc:{ndc}`

---

### Important

**RxNorm Technical Documentation**
- URL: https://www.nlm.nih.gov/research/umls/rxnorm/docs/techdoc.html
- Topics: Term types (TTY), RxNorm concepts
- Priority: Important
- Phase: Phase 1

**OpenFDA API Basics**
- URL: https://open.fda.gov/apis/
- Topics: Query syntax, pagination, rate limits
- Priority: Important
- Phase: Phase 1

---

### Reference

**RxNorm Browser**
- URL: https://mor.nlm.nih.gov/RxNav/
- Topics: Interactive drug lookup
- Priority: Reference
- Usage: Testing and validation

**FDA NDC Database**
- URL: https://www.fda.gov/drugs/drug-approvals-and-databases/national-drug-code-directory
- Topics: NDC format, package codes
- Priority: Reference
- Usage: Understanding NDC structure

---

## OpenAI Integration

### Critical

**OpenAI API Documentation - Chat Completions**
- URL: https://platform.openai.com/docs/guides/chat-completions
- Topics: Message format, parameters, best practices
- Priority: Critical
- Phase: Phase 1

**OpenAI API Documentation - Structured Outputs**
- URL: https://platform.openai.com/docs/guides/structured-outputs
- Topics: JSON mode, schema validation
- Priority: Critical
- Phase: Phase 1

---

### Important

**OpenAI API Documentation - Error Handling**
- URL: https://platform.openai.com/docs/guides/error-codes
- Topics: Error codes, retry strategies
- Priority: Important
- Phase: Phase 1

**OpenAI Best Practices**
- URL: https://platform.openai.com/docs/guides/best-practices
- Topics: Prompt engineering, safety, cost optimization
- Priority: Important
- Phase: Phase 1

**OpenAI Models Overview**
- URL: https://platform.openai.com/docs/models
- Topics: GPT-4o vs GPT-4o-mini, pricing, capabilities
- Priority: Important
- Phase: Phase 1

---

### Reference

**OpenAI Cookbook**
- URL: https://cookbook.openai.com/
- Topics: Code examples, common patterns
- Priority: Reference
- Usage: Implementation examples

---

## Google Cloud Platform

### Critical

**Cloud Run Documentation - Quickstart**
- URL: https://cloud.google.com/run/docs/quickstarts
- Topics: Deploying containers, configuration
- Priority: Critical
- Phase: Phase 6

**Cloud Run Documentation - Service Configuration**
- URL: https://cloud.google.com/run/docs/configuring/services
- Topics: CPU, memory, concurrency, environment variables
- Priority: Critical
- Phase: Phase 6

---

### Important

**Secret Manager Documentation**
- URL: https://cloud.google.com/secret-manager/docs
- Topics: Creating secrets, IAM permissions, accessing secrets
- Priority: Important
- Phase: Phase 6

**Cloud Logging Documentation - Writing Logs**
- URL: https://cloud.google.com/logging/docs/write-logs
- Topics: Structured logging, severity levels
- Priority: Important
- Phase: Phase 1, Phase 6

**Cloud Build Documentation**
- URL: https://cloud.google.com/build/docs
- Topics: Building containers, CI/CD
- Priority: Important
- Phase: Phase 6

---

### Reference

**Cloud Run Pricing**
- URL: https://cloud.google.com/run/pricing
- Topics: Cost calculation, free tier
- Priority: Reference
- Usage: Cost estimation

**Cloud Monitoring Documentation**
- URL: https://cloud.google.com/monitoring/docs
- Topics: Metrics, dashboards, alerts
- Priority: Reference
- Phase: Phase 6

---

## Testing

### Critical

**Vitest Documentation - Getting Started**
- URL: https://vitest.dev/guide/
- Topics: Writing tests, assertions, mocking
- Priority: Critical
- Phase: Phase 0, Phase 5

**Vitest API Reference**
- URL: https://vitest.dev/api/
- Topics: Test functions, expect, vi (mock utilities)
- Priority: Critical
- Phase: Phase 5

---

### Important

**Playwright Documentation - Writing Tests**
- URL: https://playwright.dev/docs/writing-tests
- Topics: Selectors, assertions, page interactions
- Priority: Important
- Phase: Phase 5

**Playwright Documentation - Best Practices**
- URL: https://playwright.dev/docs/best-practices
- Topics: Reliable tests, parallelization
- Priority: Important
- Phase: Phase 5

**Testing Library - Principles**
- URL: https://testing-library.com/docs/guiding-principles
- Topics: User-centric testing, accessibility
- Priority: Important
- Phase: Phase 5

---

### Reference

**Vitest UI**
- URL: https://vitest.dev/guide/ui.html
- Topics: Visual test runner
- Priority: Reference
- Usage: Debugging tests

**Playwright Debugging**
- URL: https://playwright.dev/docs/debug
- Topics: Debugging tools, trace viewer
- Priority: Reference
- Usage: Troubleshooting E2E tests

---

## Healthcare & Pharmacy

### Important

**National Drug Code (NDC) Format**
- URL: https://www.fda.gov/drugs/development-approval-process-drugs/national-drug-code-database-background-information
- Topics: NDC structure, labeler/product/package codes
- Priority: Important
- Phase: Phase 1, Phase 2

**Pharmacy Abbreviations Guide**
- URL: https://www.pharmacytimes.com/view/common-pharmacy-abbreviations
- Topics: SIG abbreviations (qd, bid, tid, etc.)
- Priority: Important
- Phase: Phase 1
- Note: Helps understand prescription directions

---

### Reference

**RxNorm Overview**
- URL: https://www.nlm.nih.gov/research/umls/rxnorm/overview.html
- Topics: RxNorm purpose, concepts
- Priority: Reference
- Usage: Background knowledge

**Drug Packaging Types**
- URL: https://www.fda.gov/drugs/drug-approvals-and-databases/drug-packaging-information
- Topics: Bottles, blister packs, vials
- Priority: Reference
- Usage: Understanding package descriptions

---

## Development Tools

### Important

**Git Best Practices**
- URL: https://www.conventionalcommits.org/
- Topics: Commit messages, branching
- Priority: Important
- Phase: Throughout

**Docker Documentation - Getting Started**
- URL: https://docs.docker.com/get-started/
- Topics: Containers, Dockerfile, best practices
- Priority: Important
- Phase: Phase 0, Phase 6

---

### Reference

**VS Code - Svelte Extension**
- URL: https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode
- Topics: Syntax highlighting, IntelliSense
- Priority: Reference
- Usage: Development setup

**GitHub Actions Documentation**
- URL: https://docs.github.com/en/actions
- Topics: Workflows, secrets, CI/CD
- Priority: Reference
- Phase: Phase 6

---

## Reading Order by Phase

### Phase 0: Project Setup

1. [PRD](prd.md)
2. [Architecture](architecture.md)
3. [Task List - Phase 0](task-list/phase-0-setup.md)
4. SvelteKit Introduction
5. TypeScript Everyday Types
6. Docker Getting Started

---

### Phase 1: Core Services

1. [Task List - Phase 1](task-list/phase-1-services.md)
2. [Best Practices - API Integration](best-practices.md#api-integration)
3. OpenAI Chat Completions
4. OpenAI Structured Outputs
5. RxNorm API Overview
6. FDA NDC Directory API
7. TypeScript Generics

---

### Phase 2: Business Logic

1. [Task List - Phase 2](task-list/phase-2-logic.md)
2. [Best Practices - Error Handling](best-practices.md#error-handling)
3. TypeScript Narrowing
4. Pharmacy Abbreviations Guide
5. NDC Format Documentation

---

### Phase 3: API Routes

1. [Task List - Phase 3](task-list/phase-3-api.md)
2. SvelteKit Routing
3. SvelteKit Load Functions
4. [Best Practices - Code Organization](best-practices.md#code-organization)

---

### Phase 4: Frontend UI

1. [Task List - Phase 4](task-list/phase-4-frontend.md)
2. Svelte Tutorial
3. Svelte Stores
4. SvelteKit Form Actions
5. [Best Practices - SvelteKit Conventions](best-practices.md#sveltekit-conventions)

---

### Phase 5: Testing

1. [Task List - Phase 5](task-list/phase-5-testing.md)
2. Vitest Getting Started
3. Playwright Writing Tests
4. Testing Library Principles
5. [Best Practices - Testing Strategy](best-practices.md#testing-strategy)

---

### Phase 6: Deployment

1. [Task List - Phase 6](task-list/phase-6-deployment.md)
2. Cloud Run Quickstart
3. Secret Manager Documentation
4. Cloud Logging Documentation
5. Cloud Build Documentation
6. GitHub Actions Documentation

---

## Quick Reference Cheat Sheets

### SvelteKit File Conventions

```
+page.svelte          # Page component
+page.server.ts       # Server-side page load
+page.ts              # Universal page load
+layout.svelte        # Layout component
+layout.server.ts     # Layout server load
+server.ts            # API endpoint
+error.svelte         # Error page
```

---

### TypeScript Import Aliases

```typescript
import { Button } from '$lib/components';           # src/lib/components
import type { Config } from '$lib/config';          # src/lib/config
import * as api from '$lib/server/services';        # src/lib/server/services
```

---

### Common SIG Abbreviations

```
qd = once daily
bid = twice daily
tid = three times daily
qid = four times daily
prn = as needed
po = by mouth
ac = before meals
pc = after meals
hs = at bedtime
```

---

### Vitest Test Patterns

```typescript
describe('Feature', () => {
  it('should do something', () => {
    // Arrange
    const input = setupTestData();

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

---

## Continuous Learning

Stay updated with:

- SvelteKit GitHub Releases
- TypeScript Release Notes
- OpenAI API Changelog
- Google Cloud Blog
- Project documentation updates

---

## Notes

- All external links should be accessible without VPN
- Documentation links verified as of 2025-11-11
- Internal project documentation takes precedence over external guides
- When external documentation conflicts with project standards, follow project standards

---

**Remember:** The goal is deep understanding, not just reading. Take time to experiment with code examples and explore API responses in your development environment.
