#!/usr/bin/env bash
set -euo pipefail

# CloudCoffee AI Manager — quick start script
# Usage: ./start.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[info]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ok]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*"; }
fail()  { echo -e "${RED}[error]${NC} $*"; exit 1; }

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  CloudCoffee AI Manager${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# -------------------------------------------------------------------
# 1. Check Node.js
# -------------------------------------------------------------------
if ! command -v node &>/dev/null; then
  fail "Node.js is not installed. Install v18+ from https://nodejs.org"
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  fail "Node.js v18+ is required (found v$(node -v | sed 's/v//'))"
fi
ok "Node.js $(node -v)"

# -------------------------------------------------------------------
# 2. Check gcloud CLI and ADC
# -------------------------------------------------------------------
if ! command -v gcloud &>/dev/null; then
  warn "gcloud CLI not found. Install it from https://cloud.google.com/sdk/docs/install"
  warn "You need gcloud to authenticate with Vertex AI."
else
  ok "gcloud CLI found"

  # Check if Application Default Credentials exist
  ADC_FILE="${CLOUDSDK_CONFIG_DIR:-$HOME/.config/gcloud}/application_default_credentials.json"
  if [ -f "$ADC_FILE" ]; then
    ok "Application Default Credentials found"
  else
    warn "No Application Default Credentials detected."
    echo ""
    info "Run the following command to authenticate:"
    echo ""
    echo "    gcloud auth application-default login"
    echo ""
    read -rp "Do you want to run it now? [Y/n] " answer
    if [[ "${answer:-Y}" =~ ^[Yy]$ ]]; then
      gcloud auth application-default login
      ok "Authentication complete"
    else
      warn "Skipping authentication. The app will fail to call Gemini without ADC."
    fi
  fi
fi

# -------------------------------------------------------------------
# 3. Install dependencies
# -------------------------------------------------------------------
if [ ! -d "node_modules" ]; then
  info "Installing dependencies..."
  npm install
  ok "Dependencies installed"
else
  ok "Dependencies already installed"
fi

# -------------------------------------------------------------------
# 4. Set up .env
# -------------------------------------------------------------------
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    warn ".env created from .env.example — please set your GOOGLE_CLOUD_PROJECT."
    echo ""
    read -rp "Enter your Google Cloud project ID: " project_id
    if [ -n "$project_id" ]; then
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your-project-id/$project_id/" .env
      else
        sed -i "s/your-project-id/$project_id/" .env
      fi
      ok "GOOGLE_CLOUD_PROJECT set to: $project_id"
    else
      warn "No project ID entered. Edit .env manually before using Gemini features."
    fi
  else
    fail ".env.example not found. Cannot create .env file."
  fi
else
  ok ".env already configured"
fi

# -------------------------------------------------------------------
# 5. Verify project ID is set
# -------------------------------------------------------------------
source .env 2>/dev/null || true
if [ -z "${GOOGLE_CLOUD_PROJECT:-}" ] || [ "$GOOGLE_CLOUD_PROJECT" = "your-project-id" ]; then
  warn "GOOGLE_CLOUD_PROJECT is not set in .env. Gemini API calls will fail."
  warn "Edit .env and set your Google Cloud project ID."
fi

# -------------------------------------------------------------------
# 6. Start dev servers
# -------------------------------------------------------------------
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Starting CloudCoffee AI Manager${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
info "Frontend:  http://localhost:3000"
info "Backend:   http://localhost:3001"
info "Press Ctrl+C to stop."
echo ""

npm run dev
