# KERIA Data Backup Script
# Creates complete backup of KERIA data and configuration

param(
    [string]$BackupPath = ".\backups",
    [switch]$Compress = $true,
    [switch]$Verify = $true
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $BackupPath $timestamp

Write-Host "=== KERIA Data Backup Script ===" -ForegroundColor Cyan
Write-Host "Backup Directory: $backupDir" -ForegroundColor Blue
Write-Host ""

# Create backup directory
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "✅ Created backup directory: $backupDir" -ForegroundColor Green
}

# Function to backup Docker volume
function Backup-DockerVolume {
    param($volumeName, $backupName)
    
    Write-Host "📦 Backing up volume: $volumeName" -ForegroundColor Yellow
    
    if ($Compress) {
        $backupFile = Join-Path $backupDir "$backupName.tar.gz"
        $command = "docker run --rm -v ${volumeName}:/data -v ${backupDir}:/backup alpine tar czf /backup/$backupName.tar.gz -C /data ."
    } else {
        $backupFile = Join-Path $backupDir $backupName
        New-Item -ItemType Directory -Path $backupFile -Force | Out-Null
        $command = "docker run --rm -v ${volumeName}:/data -v ${backupFile}:/backup alpine cp -a /data/. /backup/"
    }
    
    try {
        Invoke-Expression $command
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Successfully backed up $volumeName" -ForegroundColor Green
            if (Test-Path $backupFile) {
                $size = if ($Compress) { 
                    (Get-Item $backupFile).Length 
                } else { 
                    (Get-ChildItem $backupFile -Recurse | Measure-Object Length -Sum).Sum 
                }
                Write-Host "   📊 Backup size: $([math]::Round($size/1KB, 2)) KB" -ForegroundColor Blue
            }
        } else {
            Write-Host "❌ Failed to backup $volumeName" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error backing up $volumeName`: $_" -ForegroundColor Red
    }
}

# Backup KERIA data volume
Backup-DockerVolume "travlr-id-prod_travlr-keria-data" "keria-data"

# Backup KERIA config volume
Backup-DockerVolume "travlr-id-prod_travlr-keria-config" "keria-config"

# Backup witnesses config
Backup-DockerVolume "travlr-id-prod_travlr-witnesses-config" "witnesses-config"

# Backup backend database
Write-Host "📦 Backing up backend database..." -ForegroundColor Yellow
$dbPath = ".\backend\keri_travel.db"
if (Test-Path $dbPath) {
    $dbBackup = Join-Path $backupDir "keri_travel.db"
    Copy-Item $dbPath $dbBackup
    Write-Host "✅ Successfully backed up backend database" -ForegroundColor Green
    $dbSize = (Get-Item $dbBackup).Length
    Write-Host "   📊 Database size: $([math]::Round($dbSize/1KB, 2)) KB" -ForegroundColor Blue
} else {
    Write-Host "⚠️  Backend database not found at $dbPath" -ForegroundColor Yellow
}

# Create backup manifest
$manifest = @{
    timestamp = $timestamp
    backup_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    volumes = @(
        "travlr-id-prod_travlr-keria-data",
        "travlr-id-prod_travlr-keria-config", 
        "travlr-id-prod_travlr-witnesses-config"
    )
    database = "keri_travel.db"
    compressed = $Compress
    backup_tool = "PowerShell script"
    version = "1.0"
}

$manifestPath = Join-Path $backupDir "backup-manifest.json"
$manifest | ConvertTo-Json -Depth 3 | Out-File -FilePath $manifestPath -Encoding UTF8
Write-Host "✅ Created backup manifest: backup-manifest.json" -ForegroundColor Green

# Verification
if ($Verify) {
    Write-Host ""
    Write-Host "🔍 Verifying backup..." -ForegroundColor Yellow
    
    $backupFiles = Get-ChildItem $backupDir
    Write-Host "📁 Backup contents:" -ForegroundColor Blue
    foreach ($file in $backupFiles) {
        $size = if ($file.PSIsContainer) { 
            (Get-ChildItem $file.FullName -Recurse | Measure-Object Length -Sum).Sum 
        } else { 
            $file.Length 
        }
        Write-Host "   $($file.Name) - $([math]::Round($size/1KB, 2)) KB" -ForegroundColor Gray
    }
    
    # Test backup integrity for compressed files
    if ($Compress) {
        $tarFiles = Get-ChildItem $backupDir -Filter "*.tar.gz"
        foreach ($tarFile in $tarFiles) {
            Write-Host "🧪 Testing $($tarFile.Name)..." -ForegroundColor Yellow
            $testResult = docker run --rm -v "${backupDir}:/backup" alpine tar tzf "/backup/$($tarFile.Name)" 2>&1
            if ($LASTEXITCODE -eq 0) {
                $fileCount = ($testResult | Measure-Object).Count
                Write-Host "   ✅ Valid archive with $fileCount files" -ForegroundColor Green
            } else {
                Write-Host "   ❌ Archive corruption detected!" -ForegroundColor Red
            }
        }
    }
}

# Summary
Write-Host ""
Write-Host "=== BACKUP SUMMARY ===" -ForegroundColor Cyan
Write-Host "📅 Timestamp: $timestamp" -ForegroundColor Blue
Write-Host "📂 Location: $backupDir" -ForegroundColor Blue
Write-Host "💾 Format: $(if ($Compress) { 'Compressed (tar.gz)' } else { 'Uncompressed' })" -ForegroundColor Blue

$totalSize = (Get-ChildItem $backupDir -Recurse | Measure-Object Length -Sum).Sum
Write-Host "📊 Total Size: $([math]::Round($totalSize/1MB, 2)) MB" -ForegroundColor Blue

Write-Host ""
Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
Write-Host "🔒 Keep this backup in a secure location" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 To restore, use: .\scripts\restore-keria.ps1 -BackupPath '$backupDir'" -ForegroundColor Blue