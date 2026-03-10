#!/bin/bash
# Setup Linux host to receive poker data from cloud Windows instance
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
SYNC_USER="poker-sync"
DATA_DIR="/opt/poker-data"
INCOMING_DIR="${DATA_DIR}/incoming"
PARSED_DIR="${DATA_DIR}/parsed"

echo "=== Cloud Poker Data Receiver Setup ==="
echo ""
echo "This script will:"
echo "  1. Create a dedicated user for sync: ${SYNC_USER}"
echo "  2. Create data directories: ${DATA_DIR}"
echo "  3. Configure SSH access"
echo "  4. Set up the file watcher service"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Step 1: Create sync user
echo ""
echo "[1/5] Creating sync user..."
if id "${SYNC_USER}" &>/dev/null; then
    echo "  User ${SYNC_USER} already exists"
else
    sudo useradd -r -m -d "/home/${SYNC_USER}" -s /bin/bash "${SYNC_USER}"
    echo "  Created user: ${SYNC_USER}"
fi

# Step 2: Create directories
echo ""
echo "[2/5] Creating data directories..."
sudo mkdir -p "${INCOMING_DIR}"
sudo mkdir -p "${PARSED_DIR}"
sudo mkdir -p "/home/${SYNC_USER}/.ssh"

# Set ownership
sudo chown -R "${SYNC_USER}:${SYNC_USER}" "${DATA_DIR}"
sudo chown -R "${SYNC_USER}:${SYNC_USER}" "/home/${SYNC_USER}/.ssh"
sudo chmod 700 "/home/${SYNC_USER}/.ssh"

# Allow current user to read the data
sudo chmod -R 755 "${DATA_DIR}"

echo "  Created: ${DATA_DIR}"
echo "  Incoming: ${INCOMING_DIR}"
echo "  Parsed: ${PARSED_DIR}"

# Step 3: Setup SSH
echo ""
echo "[3/5] Setting up SSH..."
AUTH_KEYS="/home/${SYNC_USER}/.ssh/authorized_keys"
if [[ ! -f "${AUTH_KEYS}" ]]; then
    sudo touch "${AUTH_KEYS}"
    sudo chown "${SYNC_USER}:${SYNC_USER}" "${AUTH_KEYS}"
    sudo chmod 600 "${AUTH_KEYS}"
fi

echo ""
echo "  === ACTION REQUIRED ==="
echo "  Add the Windows instance's public key to:"
echo "    ${AUTH_KEYS}"
echo ""
echo "  You can do this with:"
echo "    sudo nano ${AUTH_KEYS}"
echo "  Then paste the key from the Windows setup output."
echo "  ========================"
echo ""
read -p "Press Enter after adding the SSH key..."

# Step 4: Install Python dependencies and watcher
echo ""
echo "[4/5] Setting up watcher service..."

# Install watchdog if not present
pip3 install --user watchdog requests 2>/dev/null || {
    echo "  Installing Python packages system-wide..."
    sudo pip3 install watchdog requests
}

# Copy watcher script
SERVICE_DIR="${DATA_DIR}/service"
sudo mkdir -p "${SERVICE_DIR}"
sudo cp "${SCRIPT_DIR}/../service/watcher.py" "${SERVICE_DIR}/"
sudo chmod +x "${SERVICE_DIR}/watcher.py"

# Create systemd service for cloud mode
SYSTEMD_SERVICE="/etc/systemd/system/poker-data-watcher.service"
sudo tee "${SYSTEMD_SERVICE}" > /dev/null << EOF
[Unit]
Description=Poker Data Watcher Service (Cloud Mode)
After=network.target

[Service]
Type=simple
User=${USER}
ExecStart=/usr/bin/python3 ${SERVICE_DIR}/watcher.py --watch-dir ${INCOMING_DIR}
WorkingDirectory=${DATA_DIR}
Environment=POKER_VM_SHARED_DIR=${INCOMING_DIR}
Environment=POKER_VM_PARSED_DIR=${PARSED_DIR}
Environment=LOG_LEVEL=INFO
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
echo "  Service installed"

# Step 5: Start the service
echo ""
echo "[5/5] Starting watcher service..."
sudo systemctl enable poker-data-watcher
sudo systemctl start poker-data-watcher

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Service status:"
sudo systemctl status poker-data-watcher --no-pager || true
echo ""
echo "Directories:"
echo "  Incoming data: ${INCOMING_DIR}"
echo "  Parsed output: ${PARSED_DIR}"
echo ""
echo "Commands:"
echo "  sudo systemctl status poker-data-watcher    # Check status"
echo "  sudo systemctl restart poker-data-watcher   # Restart"
echo "  sudo journalctl -u poker-data-watcher -f    # View logs"
echo ""
echo "Update jungleverse env to point to parsed data:"
echo "  POKER_VM_PARSED_DIR=${PARSED_DIR}"
echo ""
