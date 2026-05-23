#!/bin/bash
# =============================================================================
# Last Line - Game Server Update Script
# =============================================================================
# Supports: Ubuntu 24.04 LTS
# Run as: sudo bash update-server.sh
# =============================================================================

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
INSTALL_DIR="${INSTALL_DIR:-/opt/last-line}"
SERVICE_NAME="last-line"

# ─── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

need_sudo() {
    if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
        log_error "This script requires root privileges. Run with: sudo bash $0"
        exit 1
    fi
}

# ─── Main ─────────────────────────────────────────────────────────────────────
need_sudo

log_info "Last Line Server Update"
log_info "================================"
log_info "Install directory: ${INSTALL_DIR}"
log_info ""

# Stop server
log_info "Step 1/5: Stopping server..."
if systemctl is-active --quiet "${SERVICE_NAME}"; then
    systemctl stop "${SERVICE_NAME}"
    log_success "Server stopped"
else
    log_warn "Server was not running"
fi

# Pull latest changes
log_info "Step 2/5: Pulling latest changes from GitHub..."
cd "${INSTALL_DIR}"

if [[ ! -d ".git" ]]; then
    log_error "Not a git repository. Cannot update."
    log_info "Use install-server.sh to set up the server first."
    exit 1
fi

git fetch origin
# Discard any local build artifacts (they'll be regenerated during build)
git checkout -- dist/ 2>/dev/null || true
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [[ "${LOCAL}" == "${REMOTE}" ]]; then
    log_warn "Already up to date (no new changes)"
else
    git pull origin main
    log_success "Updated to latest version"
fi

# Install dependencies
log_info "Step 3/5: Installing dependencies..."
npm install --silent
log_success "Dependencies installed"

# Build
log_info "Step 4/5: Building project..."
npm run build
log_success "Project built"

# Restart server
log_info "Step 5/5: Restarting server..."
systemctl start "${SERVICE_NAME}"
sleep 3

# Check status
if systemctl is-active --quiet "${SERVICE_NAME}"; then
    log_success "Update complete! Server is running."
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo "  Server updated and restarted successfully!"
    echo "  View logs: sudo journalctl -u ${SERVICE_NAME} -f"
    echo "═══════════════════════════════════════════════════════════════════════════════"
else
    log_error "Server failed to start after update."
    log_info "Check logs:"
    journalctl -u "${SERVICE_NAME}" --no-pager -n 30
    exit 1
fi