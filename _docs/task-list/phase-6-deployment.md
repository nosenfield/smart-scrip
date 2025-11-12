# Phase 6: Deployment & DevOps

**Document Version:** 1.0
**Last Updated:** 2025-11-11

---

## Overview

This phase covers deployment configuration, CI/CD setup, Cloud Run deployment, monitoring configuration, and production readiness validation.

**Dependencies:** [Phase 5: Testing & Quality Assurance](phase-5-testing.md)

**Estimated Effort:** Deployment and infrastructure setup

---

## Tasks

### 6.1 - Configure SvelteKit for Cloud Run

**Description:** Setup SvelteKit adapter and build configuration for Cloud Run deployment

**Implementation Steps:**
1. Install Node adapter for SvelteKit:
   ```bash
   npm install -D @sveltejs/adapter-node
   ```
2. Update `svelte.config.js`:
   ```javascript
   import adapter from '@sveltejs/adapter-node';
   import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

   /** @type {import('@sveltejs/kit').Config} */
   const config = {
     preprocess: vitePreprocess(),

     kit: {
       adapter: adapter({
         out: 'build',
         precompress: true,
         envPrefix: ''
       })
     }
   };

   export default config;
   ```
3. Test build locally:
   ```bash
   npm run build
   node build
   ```
4. Verify application runs on port 3000

**Acceptance Criteria:**
- Adapter configured correctly
- Build succeeds without errors
- Application runs from build output
- Environment variables accessible

**Files Modified:**
- `svelte.config.js`
- `package.json`

**Reference:** [architecture.md - Deployment Architecture](../architecture.md#deployment-architecture)

---

### 6.2 - Create Cloud Run Configuration

**Description:** Setup Cloud Run service configuration

**Implementation Steps:**
1. Create `.gcloudignore`:
   ```
   .git
   .gitignore
   node_modules
   .svelte-kit
   .env
   .env.*
   !.env.example
   tests
   _docs
   .prettierrc
   .eslintrc.cjs
   vitest.config.ts
   playwright.config.ts
   README.md
   ```
2. Create `cloud-run.yaml`:
   ```yaml
   apiVersion: serving.knative.dev/v1
   kind: Service
   metadata:
     name: ndc-calculator
     labels:
       cloud.googleapis.com/location: us-central1
   spec:
     template:
       metadata:
         annotations:
           autoscaling.knative.dev/minScale: '0'
           autoscaling.knative.dev/maxScale: '100'
           autoscaling.knative.dev/target: '80'
       spec:
         containerConcurrency: 80
         timeoutSeconds: 300
         containers:
           - image: gcr.io/PROJECT_ID/ndc-calculator:latest
             ports:
               - containerPort: 3000
             env:
               - name: NODE_ENV
                 value: production
               - name: OPENAI_API_KEY
                 valueFrom:
                   secretKeyRef:
                     name: openai-api-key
                     key: latest
               - name: OPENAI_MODEL
                 value: gpt-4o-mini
               - name: RXNORM_API_BASE_URL
                 value: https://rxnav.nlm.nih.gov/REST
               - name: FDA_NDC_API_BASE_URL
                 value: https://api.fda.gov/drug/ndc.json
             resources:
               limits:
                 cpu: '1'
                 memory: 512Mi
     traffic:
       - percent: 100
         latestRevision: true
   ```
3. Document deployment commands

**Acceptance Criteria:**
- Cloud Run configuration complete
- Resource limits set appropriately
- Environment variables configured
- Auto-scaling parameters defined

**Files Created:**
- `.gcloudignore`
- `cloud-run.yaml`

**Reference:** [architecture.md - Cloud Run Deployment](../architecture.md#cloud-run-deployment)

---

### 6.3 - Setup Google Cloud Secret Manager

**Description:** Configure Secret Manager for sensitive credentials

**Implementation Steps:**
1. Create script `scripts/setup-secrets.sh`:
   ```bash
   #!/bin/bash

   # Setup Google Cloud Secret Manager secrets
   # Usage: ./scripts/setup-secrets.sh PROJECT_ID OPENAI_API_KEY

   PROJECT_ID=$1
   OPENAI_KEY=$2

   if [ -z "$PROJECT_ID" ] || [ -z "$OPENAI_KEY" ]; then
     echo "Usage: ./scripts/setup-secrets.sh PROJECT_ID OPENAI_API_KEY"
     exit 1
   fi

   # Set project
   gcloud config set project $PROJECT_ID

   # Enable Secret Manager API
   gcloud services enable secretmanager.googleapis.com

   # Create OpenAI API key secret
   echo -n "$OPENAI_KEY" | gcloud secrets create openai-api-key \
     --data-file=- \
     --replication-policy="automatic"

   # Grant Cloud Run service account access to secret
   gcloud secrets add-iam-policy-binding openai-api-key \
     --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"

   echo "Secrets configured successfully"
   ```
2. Make script executable:
   ```bash
   chmod +x scripts/setup-secrets.sh
   ```
3. Document secret management procedures

**Acceptance Criteria:**
- Secret Manager enabled
- Secrets creation automated
- IAM permissions configured
- Documentation complete

**Files Created:**
- `scripts/setup-secrets.sh`

**Reference:** [architecture.md - Security Considerations](../architecture.md#security-considerations)

---

### 6.4 - Create Deployment Script

**Description:** Automate deployment process with script

**Implementation Steps:**
1. Create `scripts/deploy.sh`:
   ```bash
   #!/bin/bash

   # Deploy to Google Cloud Run
   # Usage: ./scripts/deploy.sh PROJECT_ID [REGION]

   set -e

   PROJECT_ID=$1
   REGION=${2:-us-central1}

   if [ -z "$PROJECT_ID" ]; then
     echo "Usage: ./scripts/deploy.sh PROJECT_ID [REGION]"
     exit 1
   fi

   echo "Deploying NDC Calculator to Cloud Run..."
   echo "Project: $PROJECT_ID"
   echo "Region: $REGION"

   # Set project
   gcloud config set project $PROJECT_ID

   # Enable required APIs
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com

   # Build container image
   echo "Building container image..."
   gcloud builds submit --tag gcr.io/$PROJECT_ID/ndc-calculator

   # Deploy to Cloud Run
   echo "Deploying to Cloud Run..."
   gcloud run deploy ndc-calculator \
     --image gcr.io/$PROJECT_ID/ndc-calculator:latest \
     --platform managed \
     --region $REGION \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production \
     --set-env-vars RXNORM_API_BASE_URL=https://rxnav.nlm.nih.gov/REST \
     --set-env-vars FDA_NDC_API_BASE_URL=https://api.fda.gov/drug/ndc.json \
     --set-env-vars OPENAI_MODEL=gpt-4o-mini \
     --set-secrets OPENAI_API_KEY=openai-api-key:latest \
     --memory 512Mi \
     --cpu 1 \
     --timeout 300 \
     --concurrency 80 \
     --min-instances 0 \
     --max-instances 100

   # Get service URL
   SERVICE_URL=$(gcloud run services describe ndc-calculator \
     --platform managed \
     --region $REGION \
     --format 'value(status.url)')

   echo ""
   echo "Deployment complete!"
   echo "Service URL: $SERVICE_URL"
   ```
2. Make script executable:
   ```bash
   chmod +x scripts/deploy.sh
   ```
3. Test deployment to staging environment

**Acceptance Criteria:**
- Deployment script automates full process
- Error handling included
- Service URL returned
- Script tested successfully

**Files Created:**
- `scripts/deploy.sh`

**Reference:** [architecture.md - Deployment Architecture](../architecture.md#deployment-architecture)

---

### 6.5 - Setup CI/CD with GitHub Actions

**Description:** Configure automated testing and deployment pipeline

**Implementation Steps:**
1. Create `.github/workflows/test.yml`:
   ```yaml
   name: Test

   on:
     push:
       branches: [main, develop]
     pull_request:
       branches: [main]

   jobs:
     test:
       runs-on: ubuntu-latest

       steps:
         - uses: actions/checkout@v4

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20'
             cache: 'npm'

         - name: Install dependencies
           run: npm ci

         - name: Run linter
           run: npm run lint

         - name: Run type check
           run: npm run check

         - name: Run unit tests
           run: npm test

         - name: Run build
           run: npm run build

     e2e:
       runs-on: ubuntu-latest
       needs: test

       steps:
         - uses: actions/checkout@v4

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20'
             cache: 'npm'

         - name: Install dependencies
           run: npm ci

         - name: Install Playwright
           run: npx playwright install --with-deps

         - name: Run E2E tests
           run: npx playwright test

         - name: Upload test results
           if: always()
           uses: actions/upload-artifact@v4
           with:
             name: playwright-report
             path: playwright-report/
   ```
2. Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to Cloud Run

   on:
     push:
       branches: [main]
     workflow_dispatch:

   jobs:
     deploy:
       runs-on: ubuntu-latest

       permissions:
         contents: read
         id-token: write

       steps:
         - uses: actions/checkout@v4

         - name: Authenticate to Google Cloud
           uses: google-github-actions/auth@v2
           with:
             credentials_json: ${{ secrets.GCP_SA_KEY }}

         - name: Set up Cloud SDK
           uses: google-github-actions/setup-gcloud@v2

         - name: Deploy to Cloud Run
           run: |
             gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/ndc-calculator
             gcloud run deploy ndc-calculator \
               --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/ndc-calculator:latest \
               --platform managed \
               --region us-central1 \
               --allow-unauthenticated \
               --set-secrets OPENAI_API_KEY=openai-api-key:latest
   ```
3. Configure GitHub secrets
4. Test CI/CD pipeline

**Acceptance Criteria:**
- CI/CD workflows configured
- Tests run on every push
- Deployment automated on main branch
- GitHub secrets configured
- Pipeline tested successfully

**Files Created:**
- `.github/workflows/test.yml`
- `.github/workflows/deploy.yml`

**Reference:** [architecture.md - Cloud Build CI/CD](../architecture.md#cloud-build-cicd)

---

### 6.6 - Configure Cloud Logging

**Description:** Setup structured logging and log routing

**Implementation Steps:**
1. Verify Cloud Logging configuration in code (completed in Phase 1)
2. Create log filter for errors:
   ```bash
   resource.type="cloud_run_revision"
   severity>=ERROR
   resource.labels.service_name="ndc-calculator"
   ```
3. Setup log-based metrics:
   - Error rate
   - Request count
   - Response time
4. Document logging queries

**Acceptance Criteria:**
- Cloud Logging receiving logs
- Log levels properly set
- Error logs filterable
- Metrics configured
- Documentation complete

**Reference:** [architecture.md - Cloud Logging Integration](../architecture.md#cloud-logging-integration)

---

### 6.7 - Setup Monitoring and Alerting

**Description:** Configure Cloud Monitoring dashboards and alerts

**Implementation Steps:**
1. Create monitoring dashboard in Google Cloud Console:
   - Request count
   - Error rate
   - Response latency (p50, p95, p99)
   - Container CPU usage
   - Container memory usage
2. Create alert policies:
   - Error rate > 5%
   - Response time > 10 seconds
   - Container crash loop
3. Configure notification channels:
   - Email
   - Slack (if applicable)
4. Document alerting procedures

**Acceptance Criteria:**
- Monitoring dashboard created
- Alert policies configured
- Notifications working
- Documentation complete

**Reference:** [architecture.md - Monitoring and Observability](../architecture.md#monitoring-and-observability)

---

### 6.8 - Create Deployment Documentation

**Description:** Document deployment procedures and operations

**Implementation Steps:**
1. Create `_docs/deployment.md`:
   ```markdown
   # Deployment Documentation

   ## Prerequisites

   - Google Cloud Platform account
   - gcloud CLI installed
   - Docker installed (optional, for local testing)
   - OpenAI API key

   ## Initial Setup

   ### 1. Configure GCP Project

   ```bash
   export PROJECT_ID=your-project-id
   gcloud config set project $PROJECT_ID
   ```

   ### 2. Enable Required APIs

   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   gcloud services enable logging.googleapis.com
   ```

   ### 3. Setup Secrets

   ```bash
   ./scripts/setup-secrets.sh $PROJECT_ID YOUR_OPENAI_API_KEY
   ```

   ## Deployment

   ### Automated Deployment

   Push to main branch triggers automatic deployment via GitHub Actions.

   ### Manual Deployment

   ```bash
   ./scripts/deploy.sh PROJECT_ID [REGION]
   ```

   ## Verification

   After deployment:

   1. Check service status:
      ```bash
      gcloud run services describe ndc-calculator --region us-central1
      ```

   2. Test endpoint:
      ```bash
      curl -X POST https://your-service-url/api/calculate \
        -H "Content-Type: application/json" \
        -d '{"drugName":"Lisinopril 10mg tablet","sig":"Take 1 tablet daily","daysSupply":30}'
      ```

   3. Check logs:
      ```bash
      gcloud logs read --service ndc-calculator --limit 50
      ```

   ## Rollback

   To rollback to previous revision:

   ```bash
   gcloud run services update-traffic ndc-calculator \
     --to-revisions REVISION_NAME=100 \
     --region us-central1
   ```

   ## Environment Variables

   Required environment variables:
   - `OPENAI_API_KEY` - OpenAI API key (from Secret Manager)
   - `OPENAI_MODEL` - OpenAI model name (default: gpt-4o-mini)
   - `NODE_ENV` - Environment (production/development)
   - `RXNORM_API_BASE_URL` - RxNorm API base URL
   - `FDA_NDC_API_BASE_URL` - FDA NDC API base URL

   ## Monitoring

   - Dashboard: https://console.cloud.google.com/run/detail/REGION/ndc-calculator/metrics
   - Logs: https://console.cloud.google.com/logs
   - Alerts: https://console.cloud.google.com/monitoring/alerting

   ## Troubleshooting

   ### Container fails to start
   - Check Cloud Logging for errors
   - Verify environment variables set correctly
   - Check Secret Manager permissions

   ### High response times
   - Check external API latency
   - Review Cloud Run metrics
   - Consider increasing min instances

   ### Cost optimization
   - Set min instances to 0 for low traffic
   - Use GPT-4o-mini instead of GPT-4o
   - Monitor Cloud Run usage metrics
   ```

**Acceptance Criteria:**
- Deployment documentation complete
- All procedures documented
- Troubleshooting guide included
- Examples provided

**Files Created:**
- `_docs/deployment.md`

**Reference:** [architecture.md - Deployment Architecture](../architecture.md#deployment-architecture)

---

### 6.9 - Production Readiness Checklist

**Description:** Verify application is production-ready

**Implementation Steps:**
1. Create production readiness checklist:
   - [ ] All tests passing
   - [ ] Code coverage above 80%
   - [ ] No linting errors
   - [ ] TypeScript strict mode enabled
   - [ ] Environment variables configured
   - [ ] Secrets in Secret Manager
   - [ ] Docker image builds successfully
   - [ ] Application runs on Cloud Run
   - [ ] API endpoints respond correctly
   - [ ] Error handling validated
   - [ ] Logging configured
   - [ ] Monitoring dashboard created
   - [ ] Alerts configured
   - [ ] Performance tested
   - [ ] Accessibility validated
   - [ ] Documentation complete
   - [ ] CI/CD pipeline tested
2. Complete checklist items
3. Document any exceptions or deviations

**Acceptance Criteria:**
- All checklist items completed
- Production deployment successful
- Application verified in production
- Documentation updated

**Reference:** [architecture.md - Overview](../architecture.md#executive-summary)

---

## Phase Completion Criteria

All tasks (6.1 - 6.9) completed and verified:
- [ ] SvelteKit configured for Cloud Run
- [ ] Cloud Run configuration created
- [ ] Secret Manager setup
- [ ] Deployment script created
- [ ] CI/CD pipeline configured
- [ ] Cloud Logging configured
- [ ] Monitoring and alerting setup
- [ ] Deployment documentation complete
- [ ] Production readiness validated

**Project Complete:** Application deployed and operational
