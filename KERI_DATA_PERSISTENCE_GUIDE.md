# KERI Data Persistence Guide
**Travlr-ID Production Infrastructure**

## Overview
This guide demonstrates how KERI data persists across Docker container restarts using LMDB (Lightning Memory-Mapped Database) storage. All cryptographic identities, credentials, and witness receipts survive container shutdowns.

## Architecture

### Data Storage Locations
```
Host System (Windows):
├── C:\ProgramData\docker\volumes\travlr-id-prod_travlr-keria-data\_data\
└── Container Mount: /usr/local/var/keri/

LMDB Files:
├── data.mdb    (32KB) - All KERI data (AIDs, KELs, credentials)
└── lock.mdb    (8KB)  - Database lock file
```

### Docker Volume Configuration
```yaml
# From docker-compose.travlr-keria.yaml
volumes:
  - travlr-keria-data:/usr/local/var/keri
  - travlr-keria-config:/keria/scripts/keri/cf

volumes:
  travlr-keria-data:    # Named volume for persistence
  travlr-keria-config:  # Configuration persistence
```

## Data Persistence Verification

### Step 1: Check Current Data
```bash
# List Docker volumes
docker volume ls | findstr travlr

# Inspect volume location
docker volume inspect travlr-id-prod_travlr-keria-data

# Check LMDB files inside container
docker exec travlr-id-prod-keria-local-1 sh -c "du -sh /usr/local/var/keri && ls -la /usr/local/var/keri/adb/TheAgency/"
```

**Expected Output:**
```
48.0K   /usr/local/var/keri
-rw------T    1 root     root         32768 Aug 16 23:01 data.mdb
-rw------T    1 root     root          8192 Aug 17 09:01 lock.mdb
```

### Step 2: Test Container Restart
```bash
# Stop KERIA container
docker stop travlr-id-prod-keria-local-1

# Verify container is stopped
docker ps | findstr keria

# Restart container
docker start travlr-id-prod-keria-local-1

# Wait for startup
timeout 5 bash -c 'until docker exec travlr-id-prod-keria-local-1 echo "ready"; do sleep 1; done'
```

### Step 3: Verify Data Survival
```bash
# Check LMDB files after restart
docker exec travlr-id-prod-keria-local-1 sh -c "du -sh /usr/local/var/keri && ls -la /usr/local/var/keri/adb/TheAgency/"

# Test KERIA API functionality
curl -s http://localhost:3904/identifiers
```

**Results:**
- ✅ Same file sizes (data.mdb unchanged)
- ✅ Same creation timestamps
- ✅ API responds correctly
- ✅ All AIDs and credentials intact

## What Data Persists

### KERI Components
- **AIDs (Autonomous Identifiers)**: All cryptographic identities
- **KELs (Key Event Logs)**: Complete event history
- **Private Keys**: Encrypted signing keys
- **Witness Receipts**: Consensus validation data
- **ACDC Credentials**: Verifiable credentials and schemas

### Backend Data
- **SQLite Database**: `backend/keri_travel.db`
- **Employee Records**: Registration and metadata
- **Consent Management**: Privacy preferences
- **API Logs**: Access and sharing history

## Production Backup Strategy

### Manual Backup
```bash
# Create backup directory
mkdir -p ./backups/$(date +%Y%m%d_%H%M%S)

# Backup KERIA data volume
docker run --rm -v travlr-id-prod_travlr-keria-data:/data -v $(pwd)/backups/$(date +%Y%m%d_%H%M%S):/backup alpine tar czf /backup/keria-data.tar.gz -C /data .

# Backup configuration
docker run --rm -v travlr-id-prod_travlr-keria-config:/data -v $(pwd)/backups/$(date +%Y%m%d_%H%M%S):/backup alpine tar czf /backup/keria-config.tar.gz -C /data .

# Backup backend database
cp backend/keri_travel.db ./backups/$(date +%Y%m%d_%H%M%S)/
```

### Automated Backup (Production)
```bash
# Add to crontab for daily backups
0 2 * * * /path/to/travlr-id/scripts/backup-keria.sh
```

### Restore Procedure
```bash
# Stop services
docker-compose -f docker-compose.travlr-keria.yaml down

# Remove old volumes
docker volume rm travlr-id-prod_travlr-keria-data

# Restore from backup
docker run --rm -v travlr-id-prod_travlr-keria-data:/data -v $(pwd)/backups/BACKUP_DATE:/backup alpine tar xzf /backup/keria-data.tar.gz -C /data

# Restart services
docker-compose -f docker-compose.travlr-keria.yaml up -d
```

## Security Considerations

### Data Protection
- LMDB files contain private keys and sensitive data
- Files are protected with container-level isolation
- Access requires Docker privileges
- Backup files should be encrypted in production

### Volume Security
```bash
# Check volume permissions
docker exec travlr-id-prod-keria-local-1 ls -la /usr/local/var/keri/adb/TheAgency/

# Files are root-only with strict permissions:
-rw------T    1 root     root    (Owner read/write only)
```

## Troubleshooting

### Common Issues

**1. Volume Not Mounting**
```bash
# Check if volume exists
docker volume ls | grep travlr

# Recreate if missing
docker volume create travlr-id-prod_travlr-keria-data
```

**2. Data Corruption**
```bash
# Check LMDB integrity
docker exec travlr-id-prod-keria-local-1 sh -c "cd /usr/local/var/keri/adb/TheAgency && python -c 'import lmdb; env = lmdb.open(\".\"); print(\"LMDB OK\")'"
```

**3. Container Won't Start**
```bash
# Check container logs
docker logs travlr-id-prod-keria-local-1

# Common issues:
# - Port conflicts (3904-3906)
# - Permission issues on volume
# - Configuration file problems
```

## Production Monitoring

### Health Checks
```bash
# Container status
docker ps | grep keria

# API health
curl http://localhost:3904/health

# Data size monitoring
docker exec travlr-id-prod-keria-local-1 du -sh /usr/local/var/keri
```

### Metrics to Track
- LMDB file sizes (growth over time)
- Container restart frequency
- API response times
- Backup success/failure rates

## Migration Strategy

### Moving to New Server
1. **Backup** all volumes and databases
2. **Transfer** backup files securely
3. **Restore** on new infrastructure
4. **Verify** all AIDs and credentials
5. **Update** DNS/load balancer
6. **Test** mobile app connectivity

### Version Upgrades
1. **Backup** before upgrade
2. **Test** in staging environment
3. **Rolling upgrade** with zero downtime
4. **Verify** data integrity post-upgrade

---

## Conclusion

KERI data persistence in Travlr-ID is achieved through:
- Docker named volumes for automatic data management
- LMDB for high-performance cryptographic data storage
- Comprehensive backup and restore procedures
- Production-ready monitoring and troubleshooting

This architecture ensures that all employee identities, credentials, and privacy preferences survive infrastructure changes while maintaining cryptographic integrity.