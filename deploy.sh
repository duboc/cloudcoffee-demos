#!/usr/bin/env bash
set -euo pipefail

# CloudCoffee AI Manager — Cloud Run deploy (from source)
# Usage: ./deploy.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[info]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ok]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*"; }
fail()  { echo -e "${RED}[error]${NC} $*"; exit 1; }

SERVICE_NAME="cloudcoffee"
DEFAULT_REGION="us-central1"

echo ""
echo -e "${CYAN}===========================================${NC}"
echo -e "${CYAN}  CloudCoffee — Deploy to Cloud Run${NC}"
echo -e "${CYAN}===========================================${NC}"
echo ""

# -------------------------------------------------------------------
# 1. Check gcloud CLI
# -------------------------------------------------------------------
if ! command -v gcloud &>/dev/null; then
  fail "gcloud CLI not found. Install from https://cloud.google.com/sdk/docs/install"
fi
ok "gcloud CLI found"

# -------------------------------------------------------------------
# 2. Resolve project ID
# -------------------------------------------------------------------
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || true)

if [ -n "$CURRENT_PROJECT" ]; then
  info "Current gcloud project: ${CURRENT_PROJECT}"
  read -rp "Use this project? [Y/n] " use_current
  if [[ "${use_current:-Y}" =~ ^[Yy]$ ]]; then
    PROJECT_ID="$CURRENT_PROJECT"
  else
    read -rp "Enter Google Cloud project ID: " PROJECT_ID
  fi
else
  read -rp "Enter Google Cloud project ID: " PROJECT_ID
fi

if [ -z "$PROJECT_ID" ]; then
  fail "No project ID provided."
fi

gcloud config set project "$PROJECT_ID" 2>/dev/null
ok "Project: ${PROJECT_ID}"

# -------------------------------------------------------------------
# 3. Resolve region
# -------------------------------------------------------------------
read -rp "Cloud Run region [${DEFAULT_REGION}]: " REGION
REGION="${REGION:-$DEFAULT_REGION}"
ok "Region: ${REGION}"

# -------------------------------------------------------------------
# 4. Enable required APIs
# -------------------------------------------------------------------
info "Enabling required APIs..."

APIS=(
  "run.googleapis.com"
  "cloudbuild.googleapis.com"
  "artifactregistry.googleapis.com"
  "aiplatform.googleapis.com"
)

for api in "${APIS[@]}"; do
  gcloud services enable "$api" --project="$PROJECT_ID" --quiet 2>/dev/null
done
ok "APIs enabled (Cloud Run, Cloud Build, Artifact Registry, Vertex AI)"

# -------------------------------------------------------------------
# 5. Deploy to Cloud Run from source
# -------------------------------------------------------------------
echo ""
echo -e "${CYAN}===========================================${NC}"
echo -e "${CYAN}  Deploying to Cloud Run (from source)${NC}"
echo -e "${CYAN}===========================================${NC}"
echo ""
info "Cloud Build will upload the source, build the container, and deploy it."
info "This is the first deploy — it may prompt you to create an Artifact Registry repository."
echo ""

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=${REGION}" \
  --memory 512Mi \
  --timeout 60s \
  --min-instances 0 \
  --max-instances 3

# -------------------------------------------------------------------
# 6. Print service URL
# -------------------------------------------------------------------
echo ""
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format "value(status.url)" 2>/dev/null)

echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  Deployment complete${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
ok "Service: ${SERVICE_NAME}"
ok "Region:  ${REGION}"
ok "URL:     ${SERVICE_URL}"
echo ""
warn "Note: Data saved in data/ is ephemeral on Cloud Run (lost on new revisions)."
warn "This is fine for demos. For production, use Cloud Storage or a database."
echo ""
