#!/bin/bash

# Deploy to Google Cloud Run
# Usage: ./scripts/deploy.sh PROJECT_ID [REGION]

set -e

# Check prerequisites
if ! command -v gcloud &> /dev/null; then
  echo "Error: gcloud CLI not found. Please install Google Cloud SDK."
  exit 1
fi

# Validate Dockerfile exists
if [ ! -f "Dockerfile" ]; then
  echo "Error: Dockerfile not found in current directory"
  exit 1
fi

PROJECT_ID=$1
REGION=${2:-us-central1}

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: ./scripts/deploy.sh PROJECT_ID [REGION]"
  exit 1
fi

# Add error trap for better failure messages
trap 'echo "Error on line $LINENO. Deployment failed."; exit 1' ERR

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
IMAGE_TAG="gcr.io/$PROJECT_ID/ndc-calculator:latest"
gcloud builds submit --tag $IMAGE_TAG

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy ndc-calculator \
  --image $IMAGE_TAG \
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

