#!/bin/bash
# =============================================================================
# Last Line - Game Server Installation Script
# =============================================================================
# Supports: Ubuntu 24.04 LTS
# Run as: sudo bash install-server.sh [--user <username>] [--repo <git-url>]
# =============================================================================

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
REPO_URL="${REPO_URL:-https://github.com/angka/Last-Line.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/last-line}"
GAME_PORT="${GAME_PORT:-8080}"
ADMIN_PORT="${ADMIN_PORT:-3001}"
STORE_PORT="${STORE_PORT:-3002}"
SERVICE_NAME="last-line"
NODE_VERSION="20"

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Helpers ─────────────────────────────────────────────────────────────────
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

is_root() { [[ "${EUID:-$(id -u)}" -eq 0 ]]; }
has_sudo() { sudo -n true 2>/dev/null; }

need_sudo() {
    if ! is_root && ! has_sudo; then
        log_error "This script requires root privileges."
        log_info "Run with: sudo bash $0"
        exit 1
    fi
}

run_as() {
    if is_root; then
        "$@"
    else
        sudo "$@"
    fi
}

# ─── Parse Arguments ───────────────────────────────────────────────────────────
TARGET_USER=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --user)
            TARGET_USER="$2"
            shift 2
            ;;
        --repo)
            REPO_URL="$2"
            shift 2
            ;;
        --install-dir)
            INSTALL_DIR="$2"
            shift 2
            ;;
        --help|-h)
            echo "Last Line Server Installer"
            echo ""
            echo "Usage: sudo bash $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --user <username>     Create and use specified user (default: current user)"
            echo "  --repo <url>          Git repository URL (default: ${REPO_URL})"
            echo "  --install-dir <path> Installation directory (default: ${INSTALL_DIR})"
            echo "  --help, -h           Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  GAME_PORT             Game server port (default: ${GAME_PORT})"
            echo "  ADMIN_PORT           Admin panel port (default: ${ADMIN_PORT})"
            echo "  STORE_PORT           Cosmetic store port (default: ${STORE_PORT})"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ─── Detect Current User ──────────────────────────────────────────────────────
if is_root; then
    if [[ -n "${SUDO_USER:-}" ]]; then
        CURRENT_USER="${SUDO_USER}"
    elif [[ -n "${TARGET_USER}" ]]; then
        CURRENT_USER="${TARGET_USER}"
    else
        CURRENT_USER="lastline"
    fi
else
    CURRENT_USER="$(whoami)"
fi

# ─── Pre-flight Checks ────────────────────────────────────────────────────────
log_info "Last Line Server Installation"
log_info "================================"
log_info "Repository: ${REPO_URL}"
log_info "Install Dir: ${INSTALL_DIR}"
log_info "Game Port:   ${GAME_PORT}"
log_info "Admin Port:  ${ADMIN_PORT}"
log_info "Store Port:  ${STORE_PORT}"
log_info "User:        ${CURRENT_USER}"
log_info ""

need_sudo

# ─── Step 1: System Update ────────────────────────────────────────────────────
log_info "Step 1/10: Updating system packages..."

run_as bash -c 'export DEBIAN_FRONTEND=noninteractive && apt-get update -y'
run_as bash -c 'export DEBIAN_FRONTEND=noninteractive && apt-get upgrade -y -qq'
log_success "System updated"

# ─── Step 2: Install Node.js ─────────────────────────────────────────────────
log_info "Step 2/10: Installing Node.js ${NODE_VERSION}..."

if command -v node &> /dev/null; then
    NODE_CURRENT=$(node --version)
    log_warn "Node.js already installed: ${NODE_CURRENT}"
else
    # Install NodeSource Node.js repository
    run_as bash -c "curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -"
    run_as bash -c "apt-get install -y nodejs"
    log_success "Node.js installed: $(node --version)"
fi

log_success "npm version: $(npm --version)"

# ─── Step 3: Install Git & Tools ─────────────────────────────────────────────
log_info "Step 3/10: Installing git and required tools..."

run_as bash -c 'export DEBIAN_FRONTEND=noninteractive && apt-get install -y curl git unzip ufw'

# Verify git
git --version
log_success "Git installed"

# ─── Step 4: Create User ─────────────────────────────────────────────────────
if ! id "${CURRENT_USER}" &>/dev/null; then
    log_info "Step 4/10: Creating user '${CURRENT_USER}'..."
    run_as useradd -m -s /bin/bash "${CURRENT_USER}"
    log_success "User created"
else
    log_info "Step 4/10: User '${CURRENT_USER}' already exists"
fi

# ─── Step 5: Clone Repository ─────────────────────────────────────────────────
log_info "Step 5/10: Cloning repository..."

if [[ -d "${INSTALL_DIR}/.git" ]]; then
    log_warn "Repository already exists at ${INSTALL_DIR}"
    log_info "Pulling latest changes..."
    run_as bash -c "cd ${INSTALL_DIR} && git pull"
else
    run_as mkdir -p "$(dirname "${INSTALL_DIR}")"
    run_as git clone "${REPO_URL}" "${INSTALL_DIR}"
    log_success "Repository cloned"
fi

# Set ownership
run_as chown -R "${CURRENT_USER}:${CURRENT_USER}" "${INSTALL_DIR}"

# ─── Step 6: Install Dependencies ─────────────────────────────────────────────
log_info "Step 6/10: Installing npm dependencies..."

run_as bash -c "cd ${INSTALL_DIR} && npm install"
log_success "Dependencies installed"

# ─── Step 7: Build Project ─────────────────────────────────────────────────────
log_info "Step 7/10: Building TypeScript project..."

run_as bash -c "cd ${INSTALL_DIR} && npm run build"
log_success "Project built"

# ─── Step 8: Create Required Directories ──────────────────────────────────────
log_info "Step 8/10: Creating required directories..."

run_as mkdir -p "${INSTALL_DIR}/saves"
run_as mkdir -p "${INSTALL_DIR}/content"
run_as chown -R "${CURRENT_USER}:${CURRENT_USER}" "${INSTALL_DIR}/saves"
run_as chmod 755 "${INSTALL_DIR}/saves"
run_as chmod 755 "${INSTALL_DIR}/content"
log_success "Directories created"

# ─── Step 9: Configure Firewall ────────────────────────────────────────────────
log_info "Step 9/10: Configuring firewall..."

# Check if ufw is active
if run_as ufw status | grep -q "Status: active"; then
    log_info "UFW is active, opening ports..."
    run_as ufw allow "${GAME_PORT}/tcp" comment "Last Line Game Server"
    run_as ufw allow "${ADMIN_PORT}/tcp" comment "Last Line Admin Panel"
    run_as ufw allow "${STORE_PORT}/tcp" comment "Last Line Cosmetic Store"
    run_as ufw reload
    log_success "Firewall configured (${GAME_PORT}, ${ADMIN_PORT}, ${STORE_PORT} open)"
else
    log_warn "UFW is not active. Enable it with: sudo ufw enable"
    log_info "Required ports: ${GAME_PORT} (game), ${ADMIN_PORT} (admin), ${STORE_PORT} (store)"
fi

# ─── Step 10: Create Systemd Service ─────────────────────────────────────────
log_info "Step 10/10: Creating systemd service..."

SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
ENV_FILE="${INSTALL_DIR}/.env"

# Create .env file if it doesn't exist
if [[ ! -f "${ENV_FILE}" ]]; then
    log_info "Creating environment configuration..."
    run_as tee "${ENV_FILE}" > /dev/null << EOF
# Last Line Server Configuration
PORT=${GAME_PORT}
ADMIN_PORT=${ADMIN_PORT}
NODE_ENV=production

# JWT Secrets - CHANGE THESE IN PRODUCTION!
# Generate with: openssl rand -base64 32
PLAYER_JWT_SECRET=change-me-$(openssl rand -hex 16)
ADMIN_JWT_SECRET=change-me-$(openssl rand -hex 16)

# Steam API (optional - for Steam authentication)
# STEAM_API_KEY=your-steam-api-key
# STEAM_APP_ID=your-steam-app-id

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Admin Account (CHANGE PASSWORD!)
ADMIN_USER=admin
ADMIN_PASS=admin123
EOF
    run_as chown "${CURRENT_USER}:${CURRENT_USER}" "${ENV_FILE}"
    run_as chmod 600 "${ENV_FILE}"
    log_warn "Created .env with default admin credentials - CHANGE THESE!"
fi

# Create systemd service
run_as tee "${SERVICE_FILE}" > /dev/null << EOF
[Unit]
Description=Last Line - MMO CLI Adventure Game Server
Documentation=https://github.com/angka/Last-Line
After=network.target

[Service]
Type=simple
User=${CURRENT_USER}
Group=${CURRENT_USER}
WorkingDirectory=${INSTALL_DIR}
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server/index.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
TimeoutStartSec=30

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${INSTALL_DIR}

[Install]
WantedBy=multi-user.target
EOF

run_as systemctl daemon-reload
run_as systemctl enable "${SERVICE_NAME}"
log_success "Systemd service created and enabled"

# ─── Final Summary ─────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
log_success "Installation Complete!"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Installation Directory: ${INSTALL_DIR}"
echo "  Game Port:             ${GAME_PORT}"
echo "  Admin Panel:          http://localhost:${ADMIN_PORT}/admin-panel"
echo "  Cosmetic Store:         http://localhost:${STORE_PORT}/store/"
echo ""
echo "  Service Commands:"
echo "    sudo systemctl start ${SERVICE_NAME}     # Start server"
echo "    sudo systemctl stop ${SERVICE_NAME}      # Stop server"
echo "    sudo systemctl restart ${SERVICE_NAME}   # Restart server"
echo "    sudo systemctl status ${SERVICE_NAME}    # Check status"
echo "    sudo journalctl -u ${SERVICE_NAME} -f   # View logs"
echo ""
echo "  Default Admin Credentials:"
echo "    Username: admin"
echo "    Password:  admin123"
echo ""
echo "  ⚠️  IMPORTANT: Change the default admin password!"
echo "     Edit: ${ENV_FILE}"
echo ""
log_info "Starting server..."
run_as systemctl start "${SERVICE_NAME}"
sleep 2

if run_as systemctl is-active --quiet "${SERVICE_NAME}"; then
    log_success "Server is running!"
    log_info "Connect clients to: <server-ip>:${GAME_PORT}"
else
    log_error "Server failed to start. Check logs:"
    run_as journalctl -u "${SERVICE_NAME}" --no-pager -n 20
fi
echo ""
