# Travlr-ID Database Architecture

## Overview
Travlr-ID operates its **own centralized KERI infrastructure** with dedicated LMDB databases for secure, cryptographic storage of employee travel identities and credentials.

## Travlr-ID LMDB Database Infrastructure

### 🏢 **Travlr-ID Centralized KERI Database**
```
travlr-id-prod_travlr-keria-data/
├── /usr/local/var/keri/adb/           # Travlr-ID KERI Agent Database
│   ├── identifiers/                   # Employee AIDs and key states
│   ├── events/                        # Key Event Logs (KEL) for all employees
│   ├── credentials/                   # ACDC travel preference credentials
│   ├── receipts/                      # Witness receipts and confirmations
│   └── schemas/                       # Travel credential schemas
```

### 🏢 **Travlr-ID Witness Network Database**
```
travlr-id-prod_travlr-witnesses-config/
├── witness-1/                         # Travlr Witness 1 LMDB
├── witness-2/                         # Travlr Witness 2 LMDB  
├── witness-3/                         # Travlr Witness 3 LMDB
├── witness-4/                         # Travlr Witness 4 LMDB
├── witness-5/                         # Travlr Witness 5 LMDB
├── witness-6/                         # Travlr Witness 6 LMDB
└── witness-7/                         # Travlr Witness 7 LMDB
```

## Database Ownership & Control

### ✅ **Travlr-ID Owned Infrastructure**
- **Company:** Travlr-ID (Your Company)
- **Control:** Full administrative control
- **Data Sovereignty:** All data remains under Travlr-ID control
- **Infrastructure:** Self-hosted on Travlr-ID servers

### 🔐 **What's Stored in Travlr-ID LMDB**
1. **Employee KERI Identities**
   - Employee Autonomic Identifiers (AIDs)
   - Key rotation history
   - Current and next key commitments

2. **Travel Credentials (ACDC)**
   - Travel preference credentials
   - Context cards for company sharing
   - Credential schemas and metadata

3. **Consensus Receipts**
   - Witness signatures and confirmations
   - Multi-signature proofs
   - Event validation receipts

4. **Key Event Logs**
   - Complete cryptographic audit trail
   - Event ordering and sequence numbers
   - Digital signatures for all operations

## Architecture Benefits

### 🏢 **Centralized for Travlr-ID**
- **Single source of truth** for all employee travel identities
- **Unified management** of credentials and permissions
- **Company-wide policies** and compliance controls
- **Centralized backup** and disaster recovery

### 🔒 **Decentralized for Security**
- **No single point of failure** (7 witnesses provide redundancy)
- **Cryptographic verification** independent of central authority
- **Employee key sovereignty** (employees control their private keys)
- **Immutable audit trail** of all identity operations

### 📊 **Enterprise Features**
- **Analytics and reporting** on credential usage
- **Compliance monitoring** for travel policy adherence
- **Integration APIs** for enterprise travel systems
- **Audit trails** for regulatory compliance

## Database Locations

### **Production Deployment**
```bash
# Travlr-ID KERIA Database
Volume: travlr-id-prod_travlr-keria-data
Location: /var/lib/docker/volumes/travlr-id-prod_travlr-keria-data/_data

# Travlr-ID Witness Database
Volume: travlr-id-prod_travlr-witnesses-config  
Location: /var/lib/docker/volumes/travlr-id-prod_travlr-witnesses-config/_data

# Travlr-ID Business Database
Volume: travlr-id_postgres_data
Location: /var/lib/docker/volumes/travlr-id_postgres_data/_data
```

### **Database Access Control**
- **KERIA Admin API:** `localhost:3904` (Travlr-ID internal only)
- **KERIA Agent API:** `localhost:3905` (Employee mobile apps)
- **Witness Network:** Ports 5642-5648 (Consensus network)
- **Business Database:** `localhost:5432` (Travlr-ID backend only)

## Data Flow Architecture

```
Employee Mobile App (SignifyTS)
         ↓
Travlr-ID KERIA Agent (Port 3905)
         ↓
Travlr-ID LMDB Database (travlr-keria-data)
         ↓
Travlr-ID Witness Network (7 witnesses)
         ↓
Travlr-ID Witness LMDB Databases
         ↓
Travlr-ID Backend API (Business Logic)
         ↓
Travlr-ID PostgreSQL (Consent & Analytics)
```

## Key Differentiators

### **Travlr-ID vs. External KERI Services**
- ✅ **Own Infrastructure:** Travlr-ID controls all KERI infrastructure
- ✅ **Own Witness Network:** 7 dedicated Travlr-ID witnesses
- ✅ **Own LMDB Storage:** All cryptographic data on Travlr-ID servers
- ✅ **Own KERIA Agent:** Dedicated KERIA instance for Travlr-ID
- ✅ **Custom Configuration:** Tailored for travel industry needs

### **Enterprise Integration**
- **Scania Integration:** Direct API access to verified employee data
- **Travel Booking Systems:** Real-time preference retrieval
- **HR Systems:** Employee onboarding and offboarding
- **Compliance Systems:** Audit trails and policy enforcement

## Security & Compliance

### **Data Protection**
- **Cryptographic Storage:** All data cryptographically signed and verified
- **Key Rotation:** Automatic key rotation for security
- **Witness Consensus:** 3-of-7 witness threshold for all operations
- **Immutable Logs:** Tamper-proof audit trails

### **Compliance Features**
- **GDPR Compliance:** Employee consent management
- **SOX Compliance:** Immutable audit trails
- **Data Residency:** All data stored in controlled jurisdictions
- **Access Controls:** Role-based access to different data types

---

**Summary:** Travlr-ID operates its own centralized KERI infrastructure with dedicated LMDB databases, providing enterprise-grade identity management while maintaining the security benefits of decentralized cryptographic verification.