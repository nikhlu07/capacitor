# 📱 Mobile Testing Guide - Travlr-ID Encrypted Flow

## 🚀 Quick Start Commands

### 1. Start Backend Services
```bash
# Terminal 1: Start Backend API
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Start KERIA (if needed)
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# Terminal 3: Start Mobile App
cd travlr-mobile
npx expo start
```

### 2. Test Backend First
```bash
# Run automated tests
python test_encrypted_flow.py

# Manual API test
curl http://localhost:8000/health
```

## 📱 Mobile App Testing Steps

### Step 1: Connect Phone to Development Server
1. **Install Expo Go** on your phone from App Store/Play Store
2. **Run** `npx expo start` in travlr-mobile directory
3. **Scan QR code** with Expo Go app
4. **Ensure** phone and computer are on same WiFi network

### Step 2: Test Encrypted Credential Flow
1. **Open** Travlr-ID app on phone
2. **Navigate** to Travel Preferences screen
3. **Fill in** travel preferences (seat, meal, etc.)
4. **Enter passcode** for encryption
5. **Save** preferences - this triggers encrypted credential issuance

### Step 3: Verify Backend Receives Encrypted Data
**Watch backend logs for:**
```
🔐 Issuing encrypted ACDC credential via backend...
✅ Encrypted credential stored in KERIA: EAbc123...
```

**Check API response:**
- `credential_said`: Unique credential identifier
- `storage`: "keria_lmdb_encrypted"
- `message`: "Encrypted credential issued successfully"

### Step 4: Test IPEX Presentation (QR Code)
1. **Generate QR code** for data sharing
2. **Verify** QR contains presentation request (not actual data)
3. **Check** backend logs show IPEX request creation

## 🔍 What to Verify

### ✅ Encryption Working
- [ ] Mobile app encrypts data before sending
- [ ] Backend receives `encrypted_credential_data`
- [ ] Backend never sees plain text travel preferences
- [ ] KERIA stores encrypted ACDC credentials

### ✅ Zero-Knowledge Flow
- [ ] No employee personal data in backend memory
- [ ] AID-based queries work without employee_id storage
- [ ] IPEX presentations contain requests, not data
- [ ] Backend validates encryption format only

### ✅ API Endpoints
- [ ] `POST /employee/register` - AID validation only
- [ ] `POST /credential/issue` - Encrypted data required
- [ ] `GET /credentials/{aid}` - Direct KERIA queries
- [ ] `POST /ipex/presentation-request` - Zero-knowledge QR

## 🐛 Troubleshooting

### Backend Not Starting
```bash
# Check if port 8000 is free
netstat -an | findstr :8000

# Install dependencies
cd backend
pip install -r requirements.txt
```

### Mobile App Connection Issues
```bash
# Check network connectivity
ipconfig  # Note your IP address
ping <your-ip>  # From phone browser

# Update API base URL in mobile app if needed
# File: travlr-mobile/src/config/api.ts
```

### KERIA Connection Issues
```bash
# Check KERIA status
curl http://localhost:3901/ping

# Restart KERIA
docker-compose restart keria
```

## 📊 Success Indicators

### Mobile App
- ✅ Travel preferences screen loads
- ✅ Encryption service initializes
- ✅ Credential issuance succeeds
- ✅ QR code generation works

### Backend API
- ✅ Receives encrypted payloads only
- ✅ Validates encryption format
- ✅ Stores credentials in KERIA LMDB
- ✅ Returns credential SAIDs

### KERIA Storage
- ✅ Encrypted ACDC credentials stored
- ✅ No plain text employee data
- ✅ Credential queries work by AID
- ✅ Witness receipts generated

## 🎬 Demo Flow

1. **Show** mobile app travel preferences screen
2. **Enter** sample travel data and passcode
3. **Save** - watch backend logs for encryption
4. **Generate** QR code for company sharing
5. **Verify** QR contains presentation request only
6. **Check** KERIA database has encrypted credential

This validates the complete zero-knowledge, encrypted flow!
