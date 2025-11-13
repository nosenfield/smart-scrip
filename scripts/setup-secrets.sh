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

# Create OpenAI API key secret (or add new version if exists)
if gcloud secrets describe openai-api-key --project=$PROJECT_ID >/dev/null 2>&1; then
  echo "Secret 'openai-api-key' already exists. Adding new version..."
  echo -n "$OPENAI_KEY" | gcloud secrets versions add openai-api-key \
    --data-file=-
else
  echo "Creating new secret 'openai-api-key'..."
  echo -n "$OPENAI_KEY" | gcloud secrets create openai-api-key \
    --data-file=- \
    --replication-policy="automatic"
fi

# Grant Cloud Run service account access to secret
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

echo "Secrets configured successfully"

