#!/bin/bash
# Contabo Quick Start - Linux Host Setup for Club GG Data Collection
set -euo pipefail

echo "=== Jungleverse Poker Data Receiver - Quick Setup ==="
echo ""

# Configuration
SYNC_USER="poker-sync"
DATA_DIR="/opt/poker-data"
JUNGLEVERSE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"

echo "Jungleverse directory: ${JUNGLEVERSE_DIR}"
echo "Data directory: ${DATA_DIR}"
echo ""

# Create sync user
echo "[1/4] Creating sync user..."
if id "${SYNC_USER}" &>/dev/null; then
    echo "  User ${SYNC_USER} already exists"
else
    sudo useradd -r -m -d "/home/${SYNC_USER}" -s /bin/bash "${SYNC_USER}"
    echo "  Created user: ${SYNC_USER}"
fi

# Create directories
echo ""
echo "[2/4] Creating directories..."
sudo mkdir -p "${DATA_DIR}"/{incoming,parsed,logs}
sudo mkdir -p "/home/${SYNC_USER}/.ssh"
sudo chown -R "${SYNC_USER}:${SYNC_USER}" "${DATA_DIR}"
sudo chown -R "${SYNC_USER}:${SYNC_USER}" "/home/${SYNC_USER}/.ssh"
sudo chmod 700 "/home/${SYNC_USER}/.ssh"
sudo chmod 755 "${DATA_DIR}"
echo "  Created: ${DATA_DIR}/{incoming,parsed,logs}"

# Setup SSH authorized_keys
echo ""
echo "[3/4] SSH setup..."
AUTH_KEYS="/home/${SYNC_USER}/.ssh/authorized_keys"
sudo touch "${AUTH_KEYS}"
sudo chown "${SYNC_USER}:${SYNC_USER}" "${AUTH_KEYS}"
sudo chmod 600 "${AUTH_KEYS}"

echo ""
echo "  ╔════════════════════════════════════════════════════════════╗"
echo "  ║  SAVE THIS INFO - You'll need it for Windows setup         ║"
echo "  ╠════════════════════════════════════════════════════════════╣"
echo "  ║  Linux Host IP: $(hostname -I | awk '{print $1}')                               "
echo "  ║  SSH User: ${SYNC_USER}                                    "
echo "  ║  SSH Port: 22                                              "
echo "  ║  Remote Path: ${DATA_DIR}/incoming                         "
echo "  ╚════════════════════════════════════════════════════════════╝"
echo ""

# Create simple watcher script
echo "[4/4] Creating watcher script..."

cat > /tmp/poker-watcher.py << 'WATCHER_EOF'
#!/usr/bin/env python3
"""Simple poker data watcher for Club GG"""
import os
import sys
import json
import time
import logging
from pathlib import Path
from datetime import datetime, timezone
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

WATCH_DIR = os.environ.get("POKER_DATA_DIR", "/opt/poker-data/incoming")
OUTPUT_DIR = os.environ.get("POKER_PARSED_DIR", "/opt/poker-data/parsed")

class JsonHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            return
        if event.src_path.endswith('.json'):
            self.process_file(event.src_path)

    def on_modified(self, event):
        if event.is_directory:
            return
        if event.src_path.endswith('.json'):
            self.process_file(event.src_path)

    def process_file(self, filepath):
        logger.info(f"Processing: {filepath}")
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)

            # Output to parsed directory
            filename = Path(filepath).name
            output_path = Path(OUTPUT_DIR) / f"parsed_{filename}"

            with open(output_path, 'w') as f:
                json.dump({
                    "source": "clubgg",
                    "parsed_at": datetime.now(timezone.utc).isoformat(),
                    "data": data
                }, f, indent=2)

            logger.info(f"Parsed -> {output_path}")
        except Exception as e:
            logger.error(f"Error processing {filepath}: {e}")

def main():
    Path(WATCH_DIR).mkdir(parents=True, exist_ok=True)
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

    logger.info(f"Watching: {WATCH_DIR}")
    logger.info(f"Output: {OUTPUT_DIR}")

    observer = Observer()
    observer.schedule(JsonHandler(), WATCH_DIR, recursive=True)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    main()
WATCHER_EOF

sudo mv /tmp/poker-watcher.py "${DATA_DIR}/watcher.py"
sudo chmod +x "${DATA_DIR}/watcher.py"

# Install Python deps
pip3 install --user watchdog 2>/dev/null || sudo pip3 install watchdog

echo ""
echo "=== Linux Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Wait for Contabo VPS credentials"
echo "  2. RDP into the Windows VPS"
echo "  3. Run the Windows setup script (see below)"
echo ""
echo "To start the watcher manually:"
echo "  python3 ${DATA_DIR}/watcher.py"
echo ""
echo "Or run as a service:"
echo "  sudo systemctl start poker-data-watcher"
echo ""
