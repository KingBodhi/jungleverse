#!/bin/bash
# Create Windows 11 VM for poker clients
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config/vm-config.sh"

echo "=== Poker Clients VM Creator ==="
echo ""
echo "Configuration:"
echo "  Name: ${VM_NAME}"
echo "  CPUs: ${VM_CPUS}"
echo "  RAM: ${VM_RAM_MB}MB"
echo "  Disk: ${VM_DISK_SIZE_GB}GB"
echo ""

# Pre-flight checks
echo "[1/6] Pre-flight checks..."

if ! command -v virt-install &>/dev/null; then
    echo "ERROR: virt-install not found. Run install-deps.sh first."
    exit 1
fi

if ! systemctl is-active --quiet libvirtd; then
    echo "ERROR: libvirtd is not running"
    echo "Run: sudo systemctl start libvirtd"
    exit 1
fi

if [[ ! -f "${WIN_ISO}" ]]; then
    echo "ERROR: Windows ISO not found at: ${WIN_ISO}"
    echo "Run ./download-isos.sh and follow instructions"
    exit 1
fi

if [[ ! -f "${VIRTIO_ISO}" ]]; then
    echo "ERROR: VirtIO ISO not found at: ${VIRTIO_ISO}"
    echo "Run ./download-isos.sh"
    exit 1
fi

# Check if VM already exists
if virsh dominfo "${VM_NAME}" &>/dev/null; then
    echo ""
    echo "WARNING: VM '${VM_NAME}' already exists!"
    read -p "Do you want to delete and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing existing VM..."
        virsh destroy "${VM_NAME}" 2>/dev/null || true
        virsh undefine "${VM_NAME}" --nvram 2>/dev/null || true
        rm -f "${VM_DISK_PATH}"
    else
        echo "Aborted."
        exit 0
    fi
fi

echo "  ✓ Checks passed"

# Create disk directory
echo ""
echo "[2/6] Creating disk image..."
mkdir -p "$(dirname "${VM_DISK_PATH}")"
qemu-img create -f qcow2 "${VM_DISK_PATH}" "${VM_DISK_SIZE_GB}G"
echo "  ✓ Created: ${VM_DISK_PATH}"

# Ensure shared directory exists
echo ""
echo "[3/6] Setting up shared folder..."
mkdir -p "${SHARED_FOLDER_HOST_PATH}"
chmod 755 "${SHARED_FOLDER_HOST_PATH}"
echo "  ✓ Shared folder: ${SHARED_FOLDER_HOST_PATH}"

# Create TPM socket directory (required for Windows 11)
echo ""
echo "[4/6] Setting up TPM emulation..."
TPM_DIR="${VM_BASE_DIR}/tpm/${VM_NAME}"
mkdir -p "${TPM_DIR}"

# Start swtpm in background if not using libvirt managed TPM
# Note: virt-install with --tpm handles this automatically

echo "  ✓ TPM directory ready"

# Create the VM
echo ""
echo "[5/6] Creating VM with virt-install..."
echo ""

virt-install \
    --name "${VM_NAME}" \
    --description "${VM_DESCRIPTION}" \
    --memory "${VM_RAM_MB}" \
    --vcpus "${VM_CPUS}" \
    --cpu host-passthrough \
    --os-variant win11 \
    --boot uefi \
    --machine q35 \
    --disk path="${VM_DISK_PATH}",bus=virtio,size="${VM_DISK_SIZE_GB}" \
    --cdrom "${WIN_ISO}" \
    --disk path="${VIRTIO_ISO}",device=cdrom \
    --network network="${VM_NETWORK}",model=virtio \
    --graphics spice,listen=127.0.0.1,port="${VM_SPICE_PORT}" \
    --video qxl \
    --channel spicevmc \
    --tpm backend.type=emulator,backend.version=2.0,model=tpm-crb \
    --features smm.state=on \
    --memballoon model=virtio \
    --rng /dev/urandom \
    --noautoconsole \
    --wait 0

echo ""
echo "  ✓ VM created and started"

# Set autostart if configured
if [[ "${VM_AUTOSTART}" == "true" ]]; then
    virsh autostart "${VM_NAME}"
    echo "  ✓ Autostart enabled"
fi

echo ""
echo "[6/6] Post-creation notes..."
echo ""
echo "=== VM Created Successfully ==="
echo ""
echo "The VM is now running. Connect to it with:"
echo "  virt-viewer ${VM_NAME}"
echo ""
echo "During Windows installation:"
echo "  1. When asked for drivers, browse to the VirtIO CD"
echo "  2. Select: amd64 > w11 for storage and network drivers"
echo "  3. Complete Windows installation normally"
echo ""
echo "After Windows is installed:"
echo "  1. Install VirtIO guest tools from the VirtIO CD (virtio-win-guest-tools.exe)"
echo "  2. Install WinFsp from: https://winfsp.dev/ (for virtio-fs)"
echo "  3. Run the setup script inside Windows (see setup-windows-guest.ps1)"
echo "  4. Install poker clients"
echo ""
echo "Shared folder will be available at ${SHARED_FOLDER_GUEST_MOUNT} after setup"
echo ""
echo "VM Management Commands:"
echo "  virsh start ${VM_NAME}      # Start VM"
echo "  virsh shutdown ${VM_NAME}   # Graceful shutdown"
echo "  virsh destroy ${VM_NAME}    # Force stop"
echo "  virt-viewer ${VM_NAME}      # Connect to display"
