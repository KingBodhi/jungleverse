#!/bin/bash
# Start the poker data watcher service
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="${SCRIPT_DIR}/../service"
source "${SCRIPT_DIR}/../config/vm-config.sh"

echo "=== Poker Data Watcher Setup ==="
echo ""

# Install Python dependencies
echo "[1/4] Installing Python dependencies..."
pip3 install --user -q -r "${SERVICE_DIR}/requirements.txt"
echo "  ✓ Dependencies installed"

# Create service directory in user space
echo ""
echo "[2/4] Setting up service files..."
SERVICE_INSTALL_DIR="${HOME}/.local/share/poker-vm/service"
mkdir -p "${SERVICE_INSTALL_DIR}"
cp "${SERVICE_DIR}/watcher.py" "${SERVICE_INSTALL_DIR}/"
chmod +x "${SERVICE_INSTALL_DIR}/watcher.py"
echo "  ✓ Copied watcher.py to ${SERVICE_INSTALL_DIR}"

# Install systemd user service
echo ""
echo "[3/4] Installing systemd user service..."
SYSTEMD_USER_DIR="${HOME}/.config/systemd/user"
mkdir -p "${SYSTEMD_USER_DIR}"
cp "${SERVICE_DIR}/poker-data-watcher.service" "${SYSTEMD_USER_DIR}/"
systemctl --user daemon-reload
echo "  ✓ Service installed"

# Enable and start the service
echo ""
echo "[4/4] Starting service..."
systemctl --user enable poker-data-watcher.service
systemctl --user start poker-data-watcher.service
echo "  ✓ Service started"

echo ""
echo "=== Watcher Running ==="
echo ""
echo "Service status:"
systemctl --user status poker-data-watcher.service --no-pager || true
echo ""
echo "Commands:"
echo "  systemctl --user status poker-data-watcher    # Check status"
echo "  systemctl --user restart poker-data-watcher   # Restart"
echo "  journalctl --user -u poker-data-watcher -f    # View logs"
echo ""
echo "Parsed data will appear in: ${VM_SHARED_DIR}/_parsed/"
