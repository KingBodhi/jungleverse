#!/bin/bash
# VM Configuration for Poker Clients Environment

# VM Identity
VM_NAME="poker-clients-vm"
VM_DESCRIPTION="Windows VM for poker client data collection"

# Resource Allocation
VM_CPUS=4
VM_RAM_MB=8192
VM_DISK_SIZE_GB=64

# Paths
VM_BASE_DIR="${HOME}/.local/share/poker-vm"
VM_DISK_PATH="${VM_BASE_DIR}/disks/${VM_NAME}.qcow2"
VM_ISO_DIR="${VM_BASE_DIR}/iso"
VM_SHARED_DIR="${VM_BASE_DIR}/shared-data"

# ISO files (download separately)
WIN_ISO="${VM_ISO_DIR}/Win11_English_x64.iso"
VIRTIO_ISO="${VM_ISO_DIR}/virtio-win.iso"

# Network
VM_NETWORK="default"  # Uses default NAT network

# Display
VM_DISPLAY="spice"
VM_SPICE_PORT=5900

# Shared folder (virtio-fs)
SHARED_FOLDER_TAG="poker-data"
SHARED_FOLDER_HOST_PATH="${VM_SHARED_DIR}"
SHARED_FOLDER_GUEST_MOUNT="Z:"

# Auto-start
VM_AUTOSTART=true

# Snapshot settings
SNAPSHOT_ON_SHUTDOWN=false
MAX_SNAPSHOTS=3
