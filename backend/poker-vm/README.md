# Poker Client VM Infrastructure

Windows VM environment for running poker clients and extracting game data on Linux hosts.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Linux Host                                                 │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Windows 11 VM (QEMU/KVM + virtio)                     │ │
│  │                                                        │ │
│  │  Poker Clients:                                        │ │
│  │  ├── PokerStars                                        │ │
│  │  ├── GGPoker                                           │ │
│  │  ├── 888Poker                                          │ │
│  │  ├── PartyPoker                                        │ │
│  │  ├── WPT Global                                        │ │
│  │  └── WSOP                                              │ │
│  │                                                        │ │
│  │  Data Locations → Shared Folder (Z:\poker-data)        │ │
│  └──────────────────────────┬─────────────────────────────┘ │
│                             │                               │
│                      virtio-fs mount                        │
│                             │                               │
│                  /mnt/poker-vm-data/                        │
│                             │                               │
│  ┌──────────────────────────┴─────────────────────────────┐ │
│  │  poker-data-watcher (systemd service)                  │ │
│  │  - Monitors file changes                               │ │
│  │  - Parses client data formats                          │ │
│  │  - Triggers API ingestion                              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Linux host with KVM support (`lscpu | grep Virtualization`)
- QEMU/KVM packages installed
- Windows 11 ISO
- VirtIO drivers ISO (for Windows guest)
- At least 8GB RAM available for VM
- 60GB+ disk space

## Quick Start

```bash
# 1. Install dependencies
./scripts/install-deps.sh

# 2. Download required ISOs
./scripts/download-isos.sh

# 3. Create and start VM
./scripts/create-vm.sh

# 4. After Windows setup, install poker clients
# 5. Run the sync script to copy data files
./scripts/sync-client-data.ps1  # Run inside VM

# 6. Start the data watcher on Linux host
./scripts/start-watcher.sh
```

## Poker Client Data Locations

| Client | Windows Path | Data Format |
|--------|--------------|-------------|
| PokerStars | `%LOCALAPPDATA%\PokerStars.EU\` | XML, SQLite |
| GGPoker | `%APPDATA%\GGPoker\` | JSON, SQLite |
| 888Poker | `%APPDATA%\888poker\` | XML |
| PartyPoker | `%LOCALAPPDATA%\PartyGaming\PartyPoker\` | XML |
| WPT Global | `%APPDATA%\WPTGlobal\` | JSON |
| WSOP | `%LOCALAPPDATA%\WSOP\` | JSON |

## VM Configuration

See `config/vm-config.sh` for VM parameters:
- 4 vCPUs
- 8GB RAM
- 64GB virtual disk (qcow2)
- virtio-fs shared folder
- Spice display for GUI access

## Maintenance

```bash
# Start VM
virsh start poker-clients-vm

# Stop VM gracefully
virsh shutdown poker-clients-vm

# Connect to VM display
virt-viewer poker-clients-vm

# Check watcher service
systemctl --user status poker-data-watcher
```
