#!/bin/bash
# Install KVM/QEMU dependencies for poker VM
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config/vm-config.sh"

echo "=== Poker VM Dependencies Installer ==="
echo ""

# Check for virtualization support
echo "[1/5] Checking virtualization support..."
if ! grep -qE '(vmx|svm)' /proc/cpuinfo; then
    echo "ERROR: CPU virtualization not supported or not enabled in BIOS"
    echo "Please enable VT-x (Intel) or AMD-V in your BIOS settings"
    exit 1
fi
echo "  ✓ Virtualization supported"

# Detect package manager
detect_pkg_manager() {
    if command -v apt &>/dev/null; then
        echo "apt"
    elif command -v dnf &>/dev/null; then
        echo "dnf"
    elif command -v pacman &>/dev/null; then
        echo "pacman"
    elif command -v zypper &>/dev/null; then
        echo "zypper"
    else
        echo "unknown"
    fi
}

PKG_MANAGER=$(detect_pkg_manager)
echo ""
echo "[2/5] Detected package manager: ${PKG_MANAGER}"

# Install packages based on distro
echo ""
echo "[3/5] Installing QEMU/KVM packages..."

case "${PKG_MANAGER}" in
    apt)
        sudo apt update
        sudo apt install -y \
            qemu-kvm \
            qemu-utils \
            libvirt-daemon-system \
            libvirt-clients \
            bridge-utils \
            virt-manager \
            virt-viewer \
            ovmf \
            swtpm \
            swtpm-tools \
            python3-pip
        ;;
    dnf)
        sudo dnf install -y \
            @virtualization \
            qemu-kvm \
            libvirt \
            virt-install \
            virt-manager \
            virt-viewer \
            edk2-ovmf \
            swtpm \
            swtpm-tools \
            python3-pip
        ;;
    pacman)
        sudo pacman -Sy --noconfirm \
            qemu-full \
            libvirt \
            virt-manager \
            virt-viewer \
            edk2-ovmf \
            swtpm \
            python-pip \
            dnsmasq \
            bridge-utils
        ;;
    zypper)
        sudo zypper install -y \
            qemu-kvm \
            libvirt \
            virt-manager \
            virt-viewer \
            qemu-ovmf-x86_64 \
            swtpm \
            python3-pip
        ;;
    *)
        echo "ERROR: Unsupported package manager"
        echo "Please install QEMU/KVM manually:"
        echo "  - qemu-kvm"
        echo "  - libvirt"
        echo "  - virt-manager"
        echo "  - virt-viewer"
        echo "  - OVMF (UEFI firmware)"
        exit 1
        ;;
esac

echo "  ✓ Packages installed"

# Enable and start libvirt
echo ""
echo "[4/5] Enabling libvirt service..."
sudo systemctl enable --now libvirtd
sudo systemctl enable --now virtlogd

# Add user to required groups
echo ""
echo "[5/5] Configuring user permissions..."
sudo usermod -aG libvirt,kvm "${USER}"

# Create directory structure
echo ""
echo "Creating VM directory structure..."
mkdir -p "${VM_BASE_DIR}"/{disks,iso,shared-data}
mkdir -p "${VM_SHARED_DIR}"/{pokerstars,ggpoker,888poker,partypoker,wptglobal,wsop}

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Directory structure created at: ${VM_BASE_DIR}"
echo ""
echo "IMPORTANT: You need to log out and back in for group changes to take effect."
echo ""
echo "Next steps:"
echo "  1. Log out and log back in"
echo "  2. Run: ./download-isos.sh"
echo "  3. Run: ./create-vm.sh"
