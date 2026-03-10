# Club GG Data Collection Setup for Contabo Windows VPS
# Run as Administrator after RDP'ing into your Contabo VPS

#Requires -RunAsAdministrator

Write-Host @"

  ╔═══════════════════════════════════════════════════════════════╗
  ║         JUNGLEVERSE - Club GG Data Collection Setup           ║
  ╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# ============================================
# CONFIGURATION - UPDATE THESE VALUES
# ============================================
$Config = @{
    LinuxHostIP   = "YOUR_LINUX_IP_HERE"      # Your jungleverse server IP
    LinuxUser     = "poker-sync"               # SSH user (created by Linux script)
    LinuxPort     = 22
    RemotePath    = "/opt/poker-data/incoming"
    SyncInterval  = 5                          # Minutes between syncs
}

Write-Host "Current Configuration:" -ForegroundColor Yellow
Write-Host "  Linux Host: $($Config.LinuxHostIP)"
Write-Host "  SSH User: $($Config.LinuxUser)"
Write-Host "  Sync Interval: $($Config.SyncInterval) minutes"
Write-Host ""

if ($Config.LinuxHostIP -eq "YOUR_LINUX_IP_HERE") {
    Write-Host "ERROR: Please edit this script and set your Linux host IP!" -ForegroundColor Red
    Write-Host "Open this file in notepad and update the LinuxHostIP value."
    exit 1
}

# ============================================
# STEP 1: Create Directories
# ============================================
Write-Host "[1/6] Creating directories..." -ForegroundColor Yellow

$Paths = @{
    Base    = "C:\PokerData"
    ClubGG  = "C:\PokerData\clubgg"
    Scripts = "C:\PokerData\scripts"
    SSH     = "C:\PokerData\.ssh"
    Logs    = "C:\PokerData\logs"
}

foreach ($path in $Paths.Values) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
}
Write-Host "  OK" -ForegroundColor Green

# ============================================
# STEP 2: Install OpenSSH Client
# ============================================
Write-Host ""
Write-Host "[2/6] Setting up OpenSSH..." -ForegroundColor Yellow

$sshCapability = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Client*'
if ($sshCapability.State -ne 'Installed') {
    Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0 | Out-Null
}
Write-Host "  OK: OpenSSH client ready" -ForegroundColor Green

# ============================================
# STEP 3: Generate SSH Key
# ============================================
Write-Host ""
Write-Host "[3/6] Setting up SSH key..." -ForegroundColor Yellow

$SSHKeyPath = "$($Paths.SSH)\id_ed25519"
if (-not (Test-Path $SSHKeyPath)) {
    ssh-keygen -t ed25519 -f $SSHKeyPath -N '""' -q
    Write-Host "  Generated new SSH key" -ForegroundColor Green
}

Write-Host ""
Write-Host "  ╔════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "  ║  IMPORTANT: Add this public key to your Linux host         ║" -ForegroundColor Magenta
Write-Host "  ╚════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Public Key:" -ForegroundColor White
Write-Host ""
Get-Content "$SSHKeyPath.pub" | Write-Host -ForegroundColor Cyan
Write-Host ""
Write-Host "  On your Linux host, run:" -ForegroundColor White
Write-Host "  echo '<paste-key-here>' | sudo tee -a /home/poker-sync/.ssh/authorized_keys" -ForegroundColor Gray
Write-Host ""
Read-Host "  Press Enter after you've added the key to Linux"

# ============================================
# STEP 4: Test SSH Connection
# ============================================
Write-Host ""
Write-Host "[4/6] Testing SSH connection..." -ForegroundColor Yellow

$sshTest = ssh -i $SSHKeyPath -p $Config.LinuxPort -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 "$($Config.LinuxUser)@$($Config.LinuxHostIP)" "echo OK" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: SSH connection successful!" -ForegroundColor Green
} else {
    Write-Host "  WARNING: SSH connection failed" -ForegroundColor Red
    Write-Host "  Error: $sshTest" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please verify:" -ForegroundColor Yellow
    Write-Host "    1. Linux host is reachable at $($Config.LinuxHostIP)"
    Write-Host "    2. SSH key is in /home/$($Config.LinuxUser)/.ssh/authorized_keys"
    Write-Host "    3. Firewall allows port $($Config.LinuxPort)"
    Write-Host ""
    Read-Host "  Press Enter to continue anyway (you can fix SSH later)"
}

# ============================================
# STEP 5: Create Data Collection Script
# ============================================
Write-Host ""
Write-Host "[5/6] Creating data collection script..." -ForegroundColor Yellow

$CollectorScript = @"
# Club GG Data Collector
# Runs every $($Config.SyncInterval) minutes via scheduled task

`$ErrorActionPreference = 'SilentlyContinue'
`$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
`$logFile = "C:\PokerData\logs\sync_`$timestamp.log"

function Log(`$msg) {
    "`$(Get-Date -Format 'HH:mm:ss') `$msg" | Tee-Object -FilePath `$logFile -Append
}

Log "Starting Club GG data collection..."

# Club GG data locations (adjust based on actual install)
`$ClubGGPaths = @(
    "`$env:APPDATA\ClubGG",
    "`$env:LOCALAPPDATA\ClubGG",
    "`$env:APPDATA\GGPoker",
    "`$env:LOCALAPPDATA\GGPoker",
    "`$env:LOCALAPPDATA\Programs\ClubGG"
)

`$OutputDir = "C:\PokerData\clubgg"
`$DataFound = `$false

foreach (`$basePath in `$ClubGGPaths) {
    if (Test-Path `$basePath) {
        Log "Found data at: `$basePath"
        `$DataFound = `$true

        # Copy relevant files
        Get-ChildItem -Path `$basePath -Recurse -Include *.json,*.db,*.sqlite,*.xml,*.log -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                `$destPath = Join-Path `$OutputDir `$_.Name
                Copy-Item -Path `$_.FullName -Destination `$destPath -Force
                Log "  Copied: `$(`$_.Name)"
            } catch {
                # File locked, skip
            }
        }
    }
}

if (-not `$DataFound) {
    Log "WARNING: No Club GG data found. Is the client installed and logged in?"
}

# Create summary JSON
`$summary = @{
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    source = "clubgg"
    files = (Get-ChildItem `$OutputDir -File | Select-Object -ExpandProperty Name)
} | ConvertTo-Json

`$summary | Out-File -FilePath "`$OutputDir\sync_manifest.json" -Encoding UTF8

# Upload to Linux host
Log "Uploading to Linux host..."

`$scpArgs = @(
    "-i", "C:\PokerData\.ssh\id_ed25519",
    "-P", "$($Config.LinuxPort)",
    "-o", "StrictHostKeyChecking=no",
    "-o", "BatchMode=yes",
    "-r",
    "C:\PokerData\clubgg\*",
    "$($Config.LinuxUser)@$($Config.LinuxHostIP):$($Config.RemotePath)/"
)

`$result = & scp @scpArgs 2>&1

if (`$LASTEXITCODE -eq 0) {
    Log "Upload complete!"
} else {
    Log "Upload failed: `$result"
}

Log "Done."
"@

$CollectorScriptPath = "$($Paths.Scripts)\collect-clubgg.ps1"
$CollectorScript | Out-File -FilePath $CollectorScriptPath -Encoding UTF8
Write-Host "  Created: $CollectorScriptPath" -ForegroundColor Green

# ============================================
# STEP 6: Create Scheduled Task
# ============================================
Write-Host ""
Write-Host "[6/6] Creating scheduled task..." -ForegroundColor Yellow

$TaskName = "ClubGGDataSync"

# Remove existing task if present
Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false -ErrorAction SilentlyContinue

$Action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$CollectorScriptPath`""

$Trigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes $Config.SyncInterval) `
    -RepetitionDuration (New-TimeSpan -Days 9999)

$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description "Sync Club GG data to Jungleverse" | Out-Null

Write-Host "  OK: Task runs every $($Config.SyncInterval) minutes" -ForegroundColor Green

# ============================================
# DONE
# ============================================
Write-Host ""
Write-Host @"
  ╔═══════════════════════════════════════════════════════════════╗
  ║                      SETUP COMPLETE                           ║
  ╚═══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green

Write-Host ""
Write-Host "  Next steps:" -ForegroundColor White
Write-Host "    1. Download Club GG from: https://www.clubgg.com/download" -ForegroundColor Gray
Write-Host "    2. Install and login to your Club GG account" -ForegroundColor Gray
Write-Host "    3. Data will sync every $($Config.SyncInterval) minutes automatically" -ForegroundColor Gray
Write-Host ""
Write-Host "  Manual commands:" -ForegroundColor White
Write-Host "    Run sync now:  powershell $CollectorScriptPath" -ForegroundColor Gray
Write-Host "    View logs:     dir C:\PokerData\logs" -ForegroundColor Gray
Write-Host "    Task status:   taskschd.msc" -ForegroundColor Gray
Write-Host ""
