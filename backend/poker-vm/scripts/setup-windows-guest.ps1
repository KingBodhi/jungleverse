# Windows Guest Setup Script for Poker VM
# Run this inside the Windows VM after installation

#Requires -RunAsAdministrator

Write-Host "=== Poker VM Windows Guest Setup ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SharedDriveLetter = "Z"
$SharedFolderName = "poker-data"
$DataSyncTaskName = "PokerDataSync"

# Step 1: Check for WinFsp (required for virtio-fs)
Write-Host "[1/5] Checking WinFsp installation..." -ForegroundColor Yellow

$winfspInstalled = Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -like "*WinFsp*" }
if (-not $winfspInstalled) {
    Write-Host "  WinFsp is NOT installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please install WinFsp from: https://winfsp.dev/rel/" -ForegroundColor White
    Write-Host "  Download the .msi installer and run it, then re-run this script."
    Write-Host ""
    exit 1
}
Write-Host "  OK: WinFsp is installed" -ForegroundColor Green

# Step 2: Check for VirtIO FS service
Write-Host ""
Write-Host "[2/5] Checking VirtIO-FS service..." -ForegroundColor Yellow

$virtiofsSvc = Get-Service -Name "VirtioFsSvc" -ErrorAction SilentlyContinue
if (-not $virtiofsSvc) {
    Write-Host "  VirtIO-FS service not found. Installing..." -ForegroundColor Yellow

    # Try to find virtiofs.exe from VirtIO drivers
    $virtiofsPath = "C:\Program Files\Virtio-Win\virtio-fs\virtiofs.exe"
    if (Test-Path $virtiofsPath) {
        & $virtiofsPath install
        Start-Service -Name "VirtioFsSvc"
        Write-Host "  OK: VirtIO-FS service installed and started" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: virtio-fs not found. Install VirtIO guest tools first." -ForegroundColor Red
        exit 1
    }
} else {
    if ($virtiofsSvc.Status -ne "Running") {
        Start-Service -Name "VirtioFsSvc"
    }
    Write-Host "  OK: VirtIO-FS service is running" -ForegroundColor Green
}

# Step 3: Mount the shared folder
Write-Host ""
Write-Host "[3/5] Mounting shared folder..." -ForegroundColor Yellow

# Check if already mounted
$existingDrive = Get-PSDrive -Name $SharedDriveLetter -ErrorAction SilentlyContinue
if ($existingDrive) {
    Write-Host "  Drive ${SharedDriveLetter}: already exists" -ForegroundColor Yellow
} else {
    # Mount using virtiofs tag
    # The mount happens automatically via VirtioFsSvc if configured correctly
    Write-Host "  Shared folder should auto-mount as ${SharedDriveLetter}:" -ForegroundColor White
    Write-Host "  If not visible, check VM XML for filesystem configuration" -ForegroundColor White
}

# Step 4: Create data sync directories
Write-Host ""
Write-Host "[4/5] Creating data sync structure..." -ForegroundColor Yellow

$clients = @(
    @{ Name = "PokerStars"; LocalPath = "$env:LOCALAPPDATA\PokerStars.EU"; SyncPath = "${SharedDriveLetter}:\pokerstars" },
    @{ Name = "GGPoker"; LocalPath = "$env:APPDATA\GGPoker"; SyncPath = "${SharedDriveLetter}:\ggpoker" },
    @{ Name = "888Poker"; LocalPath = "$env:APPDATA\888poker"; SyncPath = "${SharedDriveLetter}:\888poker" },
    @{ Name = "PartyPoker"; LocalPath = "$env:LOCALAPPDATA\PartyGaming\PartyPoker"; SyncPath = "${SharedDriveLetter}:\partypoker" },
    @{ Name = "WPTGlobal"; LocalPath = "$env:APPDATA\WPTGlobal"; SyncPath = "${SharedDriveLetter}:\wptglobal" },
    @{ Name = "WSOP"; LocalPath = "$env:LOCALAPPDATA\WSOP"; SyncPath = "${SharedDriveLetter}:\wsop" }
)

foreach ($client in $clients) {
    if (Test-Path $client.SyncPath) {
        Write-Host "  OK: $($client.Name) sync folder exists" -ForegroundColor Green
    } else {
        try {
            New-Item -ItemType Directory -Path $client.SyncPath -Force | Out-Null
            Write-Host "  Created: $($client.SyncPath)" -ForegroundColor Green
        } catch {
            Write-Host "  WARNING: Could not create $($client.SyncPath) - shared drive may not be mounted" -ForegroundColor Yellow
        }
    }
}

# Step 5: Create sync script
Write-Host ""
Write-Host "[5/5] Creating data sync script..." -ForegroundColor Yellow

$syncScriptPath = "$env:USERPROFILE\Documents\sync-poker-data.ps1"
$syncScriptContent = @'
# Poker Data Sync Script
# Copies relevant data files from poker clients to shared folder

$SharedDrive = "Z:"

$syncConfigs = @(
    @{
        Name = "PokerStars"
        Source = "$env:LOCALAPPDATA\PokerStars.EU"
        Dest = "$SharedDrive\pokerstars"
        Patterns = @("*.xml", "*.txt", "tournament*.log", "lobby*.dat")
        Subdirs = @(".", "Data", "TournamentSummary")
    },
    @{
        Name = "GGPoker"
        Source = "$env:APPDATA\GGPoker"
        Dest = "$SharedDrive\ggpoker"
        Patterns = @("*.json", "*.db", "*.sqlite")
        Subdirs = @(".", "data", "cache")
    },
    @{
        Name = "888Poker"
        Source = "$env:APPDATA\888poker"
        Dest = "$SharedDrive\888poker"
        Patterns = @("*.xml", "*.dat")
        Subdirs = @(".", "data")
    },
    @{
        Name = "PartyPoker"
        Source = "$env:LOCALAPPDATA\PartyGaming\PartyPoker"
        Dest = "$SharedDrive\partypoker"
        Patterns = @("*.xml", "*.dat", "*.db")
        Subdirs = @(".", "Data")
    },
    @{
        Name = "WPTGlobal"
        Source = "$env:APPDATA\WPTGlobal"
        Dest = "$SharedDrive\wptglobal"
        Patterns = @("*.json", "*.db")
        Subdirs = @(".", "data")
    },
    @{
        Name = "WSOP"
        Source = "$env:LOCALAPPDATA\WSOP"
        Dest = "$SharedDrive\wsop"
        Patterns = @("*.json", "*.db", "*.sqlite")
        Subdirs = @(".", "data", "cache")
    }
)

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "[$timestamp] Starting poker data sync..." -ForegroundColor Cyan

foreach ($config in $syncConfigs) {
    if (-not (Test-Path $config.Source)) {
        Write-Host "  SKIP: $($config.Name) not installed" -ForegroundColor Gray
        continue
    }

    Write-Host "  Syncing $($config.Name)..." -ForegroundColor Yellow

    foreach ($subdir in $config.Subdirs) {
        $sourcePath = Join-Path $config.Source $subdir
        if (-not (Test-Path $sourcePath)) { continue }

        foreach ($pattern in $config.Patterns) {
            $files = Get-ChildItem -Path $sourcePath -Filter $pattern -ErrorAction SilentlyContinue
            foreach ($file in $files) {
                $destFile = Join-Path $config.Dest $file.Name
                try {
                    Copy-Item -Path $file.FullName -Destination $destFile -Force
                } catch {
                    # File might be locked, skip
                }
            }
        }
    }

    # Write sync timestamp
    $timestampFile = Join-Path $config.Dest ".last_sync"
    $timestamp | Out-File -FilePath $timestampFile -Force

    Write-Host "    Done" -ForegroundColor Green
}

Write-Host "Sync complete!" -ForegroundColor Cyan
'@

$syncScriptContent | Out-File -FilePath $syncScriptPath -Encoding UTF8
Write-Host "  Created: $syncScriptPath" -ForegroundColor Green

# Create scheduled task to run sync every 5 minutes
Write-Host ""
Write-Host "Creating scheduled sync task..." -ForegroundColor Yellow

$existingTask = Get-ScheduledTask -TaskName $DataSyncTaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $DataSyncTaskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$syncScriptPath`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 9999)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $DataSyncTaskName -Action $action -Trigger $trigger -Settings $settings -Description "Sync poker client data to shared folder" | Out-Null

Write-Host "  OK: Scheduled task created (runs every 5 minutes)" -ForegroundColor Green

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Install your poker clients (PokerStars, GGPoker, etc.)"
Write-Host "  2. Log into each client to populate local data"
Write-Host "  3. Data will automatically sync to Z:\ every 5 minutes"
Write-Host "  4. Or run manual sync: powershell $syncScriptPath"
Write-Host ""
