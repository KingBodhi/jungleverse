#!/bin/bash
# Download required ISO files for VM setup
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config/vm-config.sh"

echo "=== ISO Download Helper ==="
echo ""
echo "ISO directory: ${VM_ISO_DIR}"
mkdir -p "${VM_ISO_DIR}"

# Download VirtIO drivers (these are freely available)
VIRTIO_URL="https://fedorapeople.org/groups/virt/virtio-win/direct-downloads/stable-virtio/virtio-win.iso"

echo ""
echo "[1/2] Downloading VirtIO Windows drivers..."
if [[ -f "${VIRTIO_ISO}" ]]; then
    echo "  → Already exists, skipping"
else
    echo "  → Downloading from: ${VIRTIO_URL}"
    curl -L -o "${VIRTIO_ISO}" "${VIRTIO_URL}"
    echo "  ✓ Downloaded: ${VIRTIO_ISO}"
fi

# Windows ISO needs manual download due to licensing
echo ""
echo "[2/2] Windows 11 ISO..."
if [[ -f "${WIN_ISO}" ]]; then
    echo "  ✓ Found: ${WIN_ISO}"
else
    echo ""
    echo "  Windows 11 ISO must be downloaded manually from Microsoft:"
    echo ""
    echo "  1. Go to: https://www.microsoft.com/software-download/windows11"
    echo "  2. Select 'Windows 11 (multi-edition ISO for x64 devices)'"
    echo "  3. Choose your language and download"
    echo "  4. Save the ISO to: ${WIN_ISO}"
    echo ""
    echo "  Alternatively, use the Media Creation Tool on another Windows machine."
    echo ""
fi

echo ""
echo "=== Status ==="
echo ""
echo "VirtIO ISO: $(if [[ -f "${VIRTIO_ISO}" ]]; then echo "✓ Ready"; else echo "✗ Missing"; fi)"
echo "Windows ISO: $(if [[ -f "${WIN_ISO}" ]]; then echo "✓ Ready"; else echo "✗ Missing - manual download required"; fi)"
echo ""

if [[ -f "${VIRTIO_ISO}" ]] && [[ -f "${WIN_ISO}" ]]; then
    echo "All ISOs ready! Run ./create-vm.sh to create the VM."
else
    echo "Please ensure all ISOs are in place before creating the VM."
fi
