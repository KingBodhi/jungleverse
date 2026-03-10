# Cloud Windows Instance Setup for Poker Data Collection
# Run this on the Windows VPS after installing poker clients

#Requires -RunAsAdministrator

Write-Host "=== Poker Data Cloud Sync Setup ===" -ForegroundColor Cyan
Write-Host ""

# Configuration - UPDATE THESE
$LinuxHost = "YOUR_LINUX_HOST_IP"
$LinuxUser = "poker-sync"
$LinuxPort = 22
$RemotePath = "/opt/poker-data/incoming"
$SyncIntervalMinutes = 5

# Local paths
$LocalDataDir = "C:\PokerData"
$ScriptsDir = "C:\PokerData\scripts"
$SSHKeyPath = "C:\PokerData\.ssh\id_ed25519"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Linux Host: $LinuxHost"
Write-Host "  Linux User: $LinuxUser"
Write-Host "  Remote Path: $RemotePath"
Write-Host "  Sync Interval: $SyncIntervalMinutes minutes"
Write-Host ""

# Step 1: Create directories
Write-Host "[1/6] Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $LocalDataDir -Force | Out-Null
New-Item -ItemType Directory -Path $ScriptsDir -Force | Out-Null
New-Item -ItemType Directory -Path "C:\PokerData\.ssh" -Force | Out-Null
Write-Host "  OK" -ForegroundColor Green

# Step 2: Install OpenSSH client if not present
Write-Host ""
Write-Host "[2/6] Checking OpenSSH client..." -ForegroundColor Yellow
$sshCapability = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Client*'
if ($sshCapability.State -ne 'Installed') {
    Write-Host "  Installing OpenSSH Client..." -ForegroundColor Yellow
    Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
}
Write-Host "  OK: OpenSSH client available" -ForegroundColor Green

# Step 3: Generate SSH key if not exists
Write-Host ""
Write-Host "[3/6] Setting up SSH key..." -ForegroundColor Yellow
if (-not (Test-Path $SSHKeyPath)) {
    Write-Host "  Generating new SSH key pair..."
    ssh-keygen -t ed25519 -f $SSHKeyPath -N '""' -q
    Write-Host "  Key generated: $SSHKeyPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "  === IMPORTANT ===" -ForegroundColor Red
    Write-Host "  Copy this public key to your Linux host:" -ForegroundColor White
    Write-Host ""
    Get-Content "$SSHKeyPath.pub"
    Write-Host ""
    Write-Host "  Add it to: /home/$LinuxUser/.ssh/authorized_keys" -ForegroundColor White
    Write-Host "  =================" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter after you've added the key to the Linux host"
} else {
    Write-Host "  SSH key already exists" -ForegroundColor Green
}

# Step 4: Create the sync script
Write-Host ""
Write-Host "[4/6] Creating sync script..." -ForegroundColor Yellow

$syncScript = @"
# Poker Data Sync Script
# Collects data from poker clients and uploads to Linux host

`$ErrorActionPreference = 'SilentlyContinue'
`$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Config
`$LinuxHost = "$LinuxHost"
`$LinuxUser = "$LinuxUser"
`$LinuxPort = $LinuxPort
`$RemotePath = "$RemotePath"
`$SSHKey = "$SSHKeyPath"
`$LocalStaging = "$LocalDataDir\staging"

# Create staging directory
New-Item -ItemType Directory -Path `$LocalStaging -Force | Out-Null

# Client data locations
`$clients = @(
    @{ Name = "pokerstars"; Paths = @(
        "`$env:LOCALAPPDATA\PokerStars.EU",
        "`$env:LOCALAPPDATA\PokerStars"
    ); Patterns = @("*.xml", "tournament*.txt", "*.log") },

    @{ Name = "ggpoker"; Paths = @(
        "`$env:APPDATA\GGPoker",
        "`$env:LOCALAPPDATA\GGPoker"
    ); Patterns = @("*.json", "*.db") },

    @{ Name = "888poker"; Paths = @(
        "`$env:APPDATA\888poker",
        "`$env:LOCALAPPDATA\888poker"
    ); Patterns = @("*.xml", "*.dat") },

    @{ Name = "partypoker"; Paths = @(
        "`$env:LOCALAPPDATA\PartyGaming\PartyPoker"
    ); Patterns = @("*.xml", "*.dat") },

    @{ Name = "wptglobal"; Paths = @(
        "`$env:APPDATA\WPTGlobal"
    ); Patterns = @("*.json", "*.db") },

    @{ Name = "wsop"; Paths = @(
        "`$env:LOCALAPPDATA\WSOP"
    ); Patterns = @("*.json", "*.db") }
)

Write-Host "[`$timestamp] Starting poker data sync..."

foreach (`$client in `$clients) {
    `$clientStaging = Join-Path `$LocalStaging `$client.Name
    New-Item -ItemType Directory -Path `$clientStaging -Force | Out-Null

    `$found = `$false
    foreach (`$basePath in `$client.Paths) {
        `$expandedPath = `$ExecutionContext.InvokeCommand.ExpandString(`$basePath)
        if (Test-Path `$expandedPath) {
            `$found = `$true
            foreach (`$pattern in `$client.Patterns) {
                Get-ChildItem -Path `$expandedPath -Filter `$pattern -Recurse -ErrorAction SilentlyContinue |
                    ForEach-Object {
                        try {
                            Copy-Item -Path `$_.FullName -Destination `$clientStaging -Force -ErrorAction SilentlyContinue
                        } catch {
                            # File might be locked, skip
                        }
                    }
            }
        }
    }

    if (`$found) {
        Write-Host "  Collected: `$(`$client.Name)"
    }
}

# Write sync timestamp
`$timestamp | Out-File -FilePath "`$LocalStaging\.sync_timestamp" -Force

# Upload via SCP
Write-Host "Uploading to `$LinuxHost..."
`$scpArgs = @(
    "-i", `$SSHKey,
    "-P", `$LinuxPort,
    "-o", "StrictHostKeyChecking=no",
    "-o", "BatchMode=yes",
    "-r",
    "`$LocalStaging\*",
    "`${LinuxUser}@`${LinuxHost}:`$RemotePath/"
)

`$result = & scp @scpArgs 2>&1

if (`$LASTEXITCODE -eq 0) {
    Write-Host "Sync complete!"
} else {
    Write-Host "Sync failed: `$result" -ForegroundColor Red
}

# Cleanup old staging data (keep last run only)
# Remove-Item -Path `$LocalStaging -Recurse -Force
"@

$syncScriptPath = "$ScriptsDir\sync-poker-data.ps1"
$syncScript | Out-File -FilePath $syncScriptPath -Encoding UTF8
Write-Host "  Created: $syncScriptPath" -ForegroundColor Green

# Step 5: Create scheduled task
Write-Host ""
Write-Host "[5/6] Creating scheduled task..." -ForegroundColor Yellow

$taskName = "PokerDataSync"
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$syncScriptPath`""

$trigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes $SyncIntervalMinutes) `
    -RepetitionDuration (New-TimeSpan -Days 9999)

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Sync poker client data to Linux host" | Out-Null

Write-Host "  OK: Task '$taskName' created (runs every $SyncIntervalMinutes minutes)" -ForegroundColor Green

# Step 6: Test connection
Write-Host ""
Write-Host "[6/6] Testing SSH connection..." -ForegroundColor Yellow

$testResult = & ssh -i $SSHKeyPath -p $LinuxPort -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 "${LinuxUser}@${LinuxHost}" "echo 'Connection OK'" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: SSH connection successful" -ForegroundColor Green
} else {
    Write-Host "  WARNING: SSH connection failed" -ForegroundColor Red
    Write-Host "  Error: $testResult" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please ensure:" -ForegroundColor Yellow
    Write-Host "    1. Linux host is reachable at $LinuxHost"
    Write-Host "    2. SSH key is added to /home/$LinuxUser/.ssh/authorized_keys"
    Write-Host "    3. Firewall allows port $LinuxPort"
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Install poker clients if not already done"
Write-Host "  2. Login to each client to populate data"
Write-Host "  3. Verify SSH connection works"
Write-Host "  4. Data will sync every $SyncIntervalMinutes minutes automatically"
Write-Host ""
Write-Host "Manual sync: powershell $syncScriptPath"
Write-Host "View task: taskschd.msc -> PokerDataSync"
Write-Host ""
