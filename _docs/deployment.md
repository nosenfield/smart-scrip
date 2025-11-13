# Deployment Documentation

## Prerequisites

- Google Cloud Platform account with billing enabled
- gcloud CLI installed and configured
- Docker installed (optional, for local testing)
- OpenAI API key
- GitHub repository with CI/CD configured (for automated deployment)

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
gcloud services enable monitoring.googleapis.com
```

### 3. Setup Secrets

```bash
./scripts/setup-secrets.sh $PROJECT_ID YOUR_OPENAI_API_KEY
```

This script will:
- Enable Secret Manager API
- Create `openai-api-key` secret
- Grant Cloud Run service account access to the secret

### 4. Configure GitHub Secrets (for CI/CD)

In your GitHub repository, add the following secrets:

- `GCP_PROJECT_ID`: Your Google Cloud Project ID
- `GCP_SA_KEY`: Service account key JSON (create service account with Cloud Run Admin and Service Account User roles)

## Deployment

### Automated Deployment (Recommended)

Push to `main` branch triggers automatic deployment via GitHub Actions.

The workflow (`.github/workflows/deploy.yml`) will:
1. Build container image using Cloud Build
2. Deploy to Cloud Run with all configuration
3. Set environment variables and secrets
4. Configure resource limits and auto-scaling

**Note**: Ensure GitHub secrets are configured before pushing to main.

### Manual Deployment

```bash
./scripts/deploy.sh PROJECT_ID [REGION]
```

The deployment script will:
1. Enable required APIs
2. Build container image
3. Deploy to Cloud Run
4. Configure all settings (memory, CPU, timeout, concurrency)
5. Display service URL

**Example**:
```bash
./scripts/deploy.sh smart-scrip-dev us-central1
```

### Deployment Configuration

The deployment uses the following configuration:

- **Service Name**: `ndc-calculator`
- **Region**: `us-central1` (default, configurable)
- **Memory**: 512Mi
- **CPU**: 1
- **Timeout**: 300 seconds (5 minutes)
- **Concurrency**: 80 requests per instance
- **Min Instances**: 0 (scales to zero)
- **Max Instances**: 100
- **Public Access**: Enabled (MVP - change for production)

## Verification

After deployment, verify the service is running:

### 1. Check Service Status

```bash
gcloud run services describe ndc-calculator --region us-central1
```

### 2. Test API Endpoint

```bash
curl -X POST https://your-service-url/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "drugName": "Lisinopril 10mg tablet",
    "sig": "Take 1 tablet by mouth once daily",
    "daysSupply": 30
  }'
```

### 3. Check Logs

```bash
# View recent logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=ndc-calculator" --limit 50

# View error logs only
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=ndc-calculator AND severity>=ERROR" --limit 50
```

### 4. Verify Service URL

The deployment script outputs the service URL. You can also retrieve it:

```bash
gcloud run services describe ndc-calculator \
  --region us-central1 \
  --format 'value(status.url)'
```

## Rollback

To rollback to a previous revision:

### 1. List Revisions

```bash
gcloud run revisions list --service ndc-calculator --region us-central1
```

### 2. Rollback to Specific Revision

```bash
gcloud run services update-traffic ndc-calculator \
  --to-revisions REVISION_NAME=100 \
  --region us-central1
```

### 3. Rollback to Previous Revision

```bash
# Get previous revision name
PREV_REVISION=$(gcloud run revisions list --service ndc-calculator --region us-central1 --format 'value(name)' --limit 2 | tail -1)

# Rollback
gcloud run services update-traffic ndc-calculator \
  --to-revisions $PREV_REVISION=100 \
  --region us-central1
```

## Environment Variables

### Required Variables

These are automatically set during deployment:

- `NODE_ENV`: `production`
- `OPENAI_API_KEY`: Retrieved from Secret Manager (`openai-api-key:latest`)
- `OPENAI_MODEL`: `gpt-4o-mini`
- `RXNORM_API_BASE_URL`: `https://rxnav.nlm.nih.gov/REST`
- `FDA_NDC_API_BASE_URL`: `https://api.fda.gov/drug/ndc.json`

### Updating Environment Variables

```bash
gcloud run services update ndc-calculator \
  --region us-central1 \
  --set-env-vars KEY=VALUE
```

### Updating Secrets

```bash
# Update secret value
echo -n "new-api-key" | gcloud secrets versions add openai-api-key --data-file=-

# Update service to use new secret version
gcloud run services update ndc-calculator \
  --region us-central1 \
  --update-secrets OPENAI_API_KEY=openai-api-key:latest
```

## Monitoring

### Dashboard

Access the monitoring dashboard:
```
https://console.cloud.google.com/monitoring/dashboards/custom/[DASHBOARD_ID]
```

See `_docs/monitoring.md` for dashboard setup instructions.

### Logs

View logs in Cloud Console:
```
https://console.cloud.google.com/logs/query
```

See `_docs/cloud-logging.md` for log filter queries.

### Alerts

View alert policies:
```
https://console.cloud.google.com/monitoring/alerting
```

See `_docs/monitoring.md` for alert configuration.

## Troubleshooting

### Container Fails to Start

1. **Check Cloud Logging for errors**:
   ```bash
   gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=ndc-calculator AND severity>=ERROR" --limit 20
   ```

2. **Verify environment variables**:
   ```bash
   gcloud run services describe ndc-calculator --region us-central1 --format 'value(spec.template.spec.containers[0].env)'
   ```

3. **Check Secret Manager permissions**:
   ```bash
   gcloud projects get-iam-policy $PROJECT_ID \
     --flatten="bindings[].members" \
     --filter="bindings.members:*appspot.gserviceaccount.com"
   ```

4. **Verify Secret exists**:
   ```bash
   gcloud secrets describe openai-api-key
   ```

### High Response Times

1. **Check external API latency**:
   - Review Cloud Logging for OpenAI, RxNorm, or FDA API timeouts
   - Check external API status pages

2. **Review Cloud Run metrics**:
   - Check CPU and memory utilization
   - Review request latency (p50, p95, p99)
   - Check instance count and scaling behavior

3. **Consider increasing resources**:
   ```bash
   gcloud run services update ndc-calculator \
     --region us-central1 \
     --memory 1Gi \
     --cpu 2
   ```

4. **Set minimum instances** (reduces cold starts):
   ```bash
   gcloud run services update ndc-calculator \
     --region us-central1 \
     --min-instances 1
   ```

### Service Not Accessible

1. **Verify service is deployed**:
   ```bash
   gcloud run services list --region us-central1
   ```

2. **Check IAM permissions**:
   ```bash
   gcloud run services get-iam-policy ndc-calculator --region us-central1
   ```

3. **Verify public access** (if using `--allow-unauthenticated`):
   ```bash
   gcloud run services describe ndc-calculator --region us-central1 --format 'value(status.conditions)'
   ```

### Build Failures

1. **Check Cloud Build logs**:
   ```bash
   gcloud builds list --limit 5
   gcloud builds log [BUILD_ID]
   ```

2. **Verify Dockerfile**:
   - Ensure Dockerfile exists in project root
   - Check Dockerfile syntax
   - Verify build context includes all required files

3. **Check .gcloudignore**:
   - Ensure unnecessary files are excluded
   - Verify required files are not ignored

### Cost Optimization

1. **Set min instances to 0** (for low traffic):
   ```bash
   gcloud run services update ndc-calculator \
     --region us-central1 \
     --min-instances 0
   ```

2. **Use GPT-4o-mini** (already configured):
   - More cost-effective than GPT-4o
   - Sufficient for MVP requirements

3. **Monitor Cloud Run usage**:
   - Review Cloud Billing dashboard
   - Set up budget alerts
   - Monitor instance hours and request counts

4. **Optimize container image size**:
   - Current image size: ~376MB (target: <200MB)
   - Consider multi-stage builds
   - Remove unnecessary dependencies

## Security Considerations

### Current Configuration (MVP)

- **Public Access**: Service is publicly accessible (`--allow-unauthenticated`)
- **Secret Management**: API keys stored in Secret Manager
- **HTTPS**: Enforced by Cloud Run (all traffic encrypted)

### Production Recommendations

1. **Restrict Access**:
   - Remove `--allow-unauthenticated` flag
   - Implement Cloud IAM authentication
   - Use `--ingress internal` for VPC-only access

2. **Network Security**:
   - Deploy to private VPC network
   - Use Cloud Run ingress controls
   - Implement rate limiting (already configured in code)

3. **Secret Rotation**:
   - Rotate API keys regularly
   - Use secret versioning
   - Monitor secret access

## References

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Architecture Documentation](architecture.md)
- [Monitoring Guide](monitoring.md)
- [Cloud Logging Guide](cloud-logging.md)

