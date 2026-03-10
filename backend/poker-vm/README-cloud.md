# Cloud Windows Instance for Poker Data Collection

Run poker clients on a cloud Windows VPS and sync data back to jungleverse.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Cloud Provider (Hetzner/Vultr/AWS)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Windows VPS                                           │ │
│  │  ├── PokerStars                                        │ │
│  │  ├── GGPoker                                           │ │
│  │  ├── 888Poker                                          │ │
│  │  └── ...                                               │ │
│  │                                                        │ │
│  │  Scheduled Task: sync-poker-data.ps1                   │ │
│  │       ↓                                                │ │
│  │  SFTP/SCP → Linux Host                                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓ (SSH/SFTP)
┌─────────────────────────────────────────────────────────────┐
│  Linux Host (jungleverse)                                   │
│  ├── /opt/poker-data/incoming/                              │
│  ├── watcher service → parse → API ingestion                │
│  └── jungleverse app                                        │
└─────────────────────────────────────────────────────────────┘
```

## Recommended Cloud Providers

| Provider | Plan | Specs | Monthly Cost | Notes |
|----------|------|-------|--------------|-------|
| **Hetzner Cloud** | CX22 + Windows | 2 vCPU, 4GB RAM, 40GB | ~€8-12 | Best value, EU-based |
| **Vultr** | Windows Cloud | 2 vCPU, 4GB RAM, 80GB | ~$24 | Easy setup, global |
| **Contabo** | VPS S | 4 vCPU, 8GB RAM, 200GB | ~€6 | Very cheap, slower support |
| **AWS EC2** | t3.medium | 2 vCPU, 4GB RAM | ~$50+ | Overkill, complex |

**Recommendation:** Hetzner or Contabo for cost-effectiveness.

## Quick Start

### 1. Provision Windows VPS

```bash
# Using Hetzner CLI (example)
hcloud server create \
  --name poker-collector \
  --type cx22 \
  --image windows-2022 \
  --location nbg1

# Or just use provider's web console to create Windows instance
```

### 2. Initial Windows Setup (via RDP)

1. Connect via RDP to the Windows instance
2. Install poker clients (PokerStars, GGPoker, etc.)
3. Login to each client to populate data
4. Run the setup script (see below)

### 3. Configure Data Sync

Copy `scripts/cloud-sync-setup.ps1` to the Windows instance and run as Administrator.

### 4. Setup Linux Receiver

On your jungleverse host:
```bash
./scripts/setup-cloud-receiver.sh
```

## Security Notes

- Use SSH key authentication (not passwords)
- Restrict SSH access to known IPs if possible
- The Windows instance only needs outbound SSH to your host
- Consider WireGuard VPN for additional security
