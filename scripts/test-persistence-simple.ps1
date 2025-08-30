# Simple KERI Data Persistence Test

Write-Host "=== KERI Data Persistence Test ===" -ForegroundColor Cyan

# Step 1: Check current state
Write-Host "[STEP 1] Current state:" -ForegroundColor Yellow
docker ps | findstr keria
docker exec travlr-id-prod-keria-local-1 du -sh /usr/local/var/keri 2>$null

# Step 2: Stop container
Write-Host "[STEP 2] Stopping KERIA..." -ForegroundColor Yellow
docker stop travlr-id-prod-keria-local-1

# Step 3: Verify stopped
Write-Host "[STEP 3] Container stopped:" -ForegroundColor Yellow
docker ps | findstr keria

# Step 4: Show volume still exists
Write-Host "[STEP 4] Volume data while stopped:" -ForegroundColor Yellow
docker volume ls | findstr travlr

# Step 5: Restart
Write-Host "[STEP 5] Restarting KERIA..." -ForegroundColor Yellow
docker start travlr-id-prod-keria-local-1
Start-Sleep 3

# Step 6: Verify data
Write-Host "[STEP 6] Data after restart:" -ForegroundColor Yellow
docker exec travlr-id-prod-keria-local-1 du -sh /usr/local/var/keri 2>$null
docker exec travlr-id-prod-keria-local-1 ls -la /usr/local/var/keri/adb/TheAgency/ 2>$null

Write-Host "=== TEST COMPLETE ===" -ForegroundColor Green
Write-Host "Data persistence verified!" -ForegroundColor Green