# Context Card Security & Privacy Architecture

## 🚨 CRITICAL SECURITY REQUIREMENTS

### **Context Card Data MUST NOT Be Stored in Travlr-ID Backend**

## ✅ **PROPER ARCHITECTURE**

### **1. Zero-Knowledge Context Cards**
```
Employee Mobile App (SignifyTS)
         ↓
Creates Context Card Locally (encrypted)
         ↓
Generates Time-Limited Access Token
         ↓
QR Code Contains ONLY:
  - Access Token (no data)
  - Expiration Time
  - Employee AID
  - OOBI Reference
```

### **2. Data Flow (Privacy-Preserving)**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Employee      │    │    Travlr-ID    │    │     Scania      │
│   Mobile App    │    │    Backend       │    │     System      │
│  (SignifyTS)    │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Create Context     │                       │
         │    Card (Local)       │                       │
         │                       │                       │
         │ 2. Generate QR with   │                       │
         │    Access Token       │                       │
         │                       │                       │
         │                       │ 3. Scan QR Code      │
         │                       │ ◄─────────────────────│
         │                       │                       │
         │                       │ 4. Request Access    │
         │                       │    (with token)       │
         │                       │ ──────────────────────►
         │                       │                       │
         │                       │ 5. Verify Token      │
         │                       │    (no data access)   │
         │                       │                       │
         │ 6. Direct P2P Data    │                       │
         │    Transfer (encrypted)│                       │
         │ ──────────────────────┼───────────────────────►
         │                       │                       │
```

### **3. What Travlr-ID Backend Should Store**
```json
{
  "context_sessions": {
    "session_id": "SESS_abc123",
    "employee_aid": "E1234...",
    "expires_at": "2024-01-01T12:00:00Z",
    "status": "active",
    "access_token_hash": "sha256_hash_only",
    "requester_info": {
      "company": "scania",
      "purpose": "travel_booking",
      "requested_at": "2024-01-01T11:00:00Z"
    }
  }
}
```

**NO PERSONAL DATA STORED - ONLY SESSION METADATA**

### **4. What Travlr-ID Backend MUST NOT Store**
❌ Employee travel preferences  
❌ Emergency contact information  
❌ Accessibility needs  
❌ Any context card data  
❌ Decrypted credential contents  

### **5. Encryption Requirements**

#### **Mobile App (SignifyTS) Encryption:**
```typescript
// Context card created locally on mobile
const contextCard = {
  employee_data: encrypt(travelPreferences, scania_public_key),
  signature: sign(contextCard, employee_private_key),
  expires_at: timestamp + (15 * 60 * 1000), // 15 minutes
  shared_fields: ["flight_prefs", "emergency_contact"]
};

// Only access token goes in QR
const qrData = {
  access_token: generateSecureToken(),
  employee_aid: employee.aid,
  oobi: employee.oobi,
  expires_at: contextCard.expires_at
};
```

#### **End-to-End Encryption:**
- **Mobile → Scania:** Direct encrypted transfer
- **Keys:** Scania public key encrypts, employee private key signs
- **Travlr-ID:** Never sees decrypted data

## ✅ **IMPLEMENTATION CHANGES NEEDED**

### **1. Remove Context Card Storage**
```python
# REMOVE THIS - NO CONTEXT CARD STORAGE
# context_cards[context_id] = { ... }  ← DELETE

# REPLACE WITH SESSION TRACKING ONLY
sessions[session_id] = {
    "employee_aid": employee_aid,
    "expires_at": expires_at,
    "token_hash": hash(access_token),
    "status": "active"
}
```

### **2. Update QR Generation**
```python
@router.post("/employee/{employee_id}/generate-session")
async def generate_sharing_session(employee_id: str, request: SharingRequest):
    """Generate sharing session (NO DATA STORAGE)"""
    
    # Generate secure access token
    access_token = secrets.token_urlsafe(32)
    session_id = secrets.token_urlsafe(16)
    
    # Store ONLY session metadata
    sessions[session_id] = {
        "employee_aid": employee["aid"],
        "expires_at": datetime.now() + timedelta(minutes=15),
        "token_hash": hashlib.sha256(access_token.encode()).hexdigest(),
        "requester": request.company,
        "purpose": request.purpose,
        "status": "active"
    }
    
    # QR contains NO personal data
    qr_data = {
        "access_token": access_token,
        "employee_aid": employee["aid"],
        "oobi": employee["oobi"],
        "session_id": session_id,
        "expires_at": expires_at.isoformat()
    }
    
    return {"qr_data": qr_data}  # No sensitive data
```

### **3. Data Access Verification**
```python
@router.post("/verify-access")
async def verify_access_token(token: str, session_id: str):
    """Verify access token (NO DATA PROVIDED)"""
    
    session = sessions.get(session_id)
    if not session or session["expires_at"] < datetime.now():
        raise HTTPException(403, "Session expired")
    
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    if session["token_hash"] != token_hash:
        raise HTTPException(403, "Invalid token")
    
    # Return ONLY verification status
    return {
        "verified": True,
        "employee_aid": session["employee_aid"],
        "oobi": f"http://keria:3902/oobi/{session['employee_aid']}",
        "message": "Token verified - connect directly to employee"
    }
```

## 🔒 **SECURITY GUARANTEES**

### **Privacy Protection:**
✅ **Zero-Knowledge Backend** - Travlr-ID never sees personal data  
✅ **End-to-End Encryption** - Data encrypted from mobile to company  
✅ **Time-Limited Access** - Sessions expire automatically  
✅ **Employee Control** - Employee generates and controls all data sharing  

### **Compliance:**
✅ **GDPR Compliance** - No personal data stored without explicit need  
✅ **Data Minimization** - Only session metadata stored  
✅ **Right to be Forgotten** - No persistent personal data storage  
✅ **Consent Management** - Employee controls all data sharing  

### **Enterprise Security:**
✅ **Audit Trails** - Session access logged without data content  
✅ **Token-Based Access** - Secure, time-limited access tokens  
✅ **Cryptographic Verification** - All access cryptographically verified  
✅ **No Data Breaches** - No sensitive data to be breached  

---

**CRITICAL:** Current implementation stores sensitive personal data in backend. This MUST be changed to zero-knowledge architecture for production deployment.