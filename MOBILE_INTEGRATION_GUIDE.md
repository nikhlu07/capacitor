# 📱 Travlr-ID Mobile App Integration Guide

## 🎯 **How Your Mobile App Works with PostgreSQL Backend**

Your mobile app is a **React Native** application that connects to the PostgreSQL-powered backend to manage employee travel identities and consent workflows.

---

## 🔄 **Complete Mobile Workflow**

### **1. Employee Registration & Identity Creation**
```javascript
// 1. Employee creates profile
const registration = {
  employee_id: "EMP001",
  full_name: "John Doe", 
  department: "Engineering",
  email: "john@company.com",
  phone: "+46123456789"
};

// 2. Mobile app calls backend
POST /api/v1/mobile/employee/register
// Backend creates employee record in PostgreSQL

// 3. Mobile app creates real KERI AID using SignifyTS
const keriResult = await signifyService.createEmployeeAID(employee_id, full_name);

// 4. Link AID to backend profile
PUT /api/v1/mobile/employee/{employee_id}/aid
{
  "aid": "EEmployeeAID123...",
  "oobi": "http://witness.com:5631/oobi/EEmployee..."
}
```

### **2. Travel Preferences Management**
```javascript
// Employee sets travel preferences in mobile app
const preferences = {
  flight_preferences: {
    preferred_airlines: ["SAS", "Lufthansa"],
    seating_preference: "Aisle",
    meal_preference: "Vegetarian"
  },
  hotel_preferences: {
    preferred_chains: ["Scandic", "Radisson"],
    room_type: "Standard"
  },
  emergency_contact: {
    name: "Jane Doe",
    phone: "+46987654321"
  }
};

// Mobile app saves to backend
POST /api/v1/mobile/credential/issue
// Backend stores encrypted credentials in PostgreSQL
```

---

## 🔔 **Consent Request Workflow**

### **Step 1: Company Requests Data**
```javascript
// Scania (or any company) requests employee data
POST /api/v1/consent/request
{
  "company_aid": "ECompanyScania123...",
  "employee_aid": "EEmployeeAID123...", 
  "requested_fields": ["dietary", "emergency_contact"],
  "purpose": "Business travel booking",
  "company_public_key": "company_x25519_key",
  "expires_hours": 24
}
// ✅ Result: Request stored in PostgreSQL, notification sent to mobile
```

### **Step 2: Mobile App Receives Notification**
```javascript
// 🔔 Mobile app polls for pending consent requests
GET /api/v1/consent/pending/{employee_aid}

// Response: List of pending requests
[
  {
    "request_id": "req-123",
    "company_aid": "ECompanyScania123...",
    "requested_fields": ["dietary", "emergency_contact"],
    "purpose": "Business travel booking",
    "created_at": "2024-01-15T10:00:00Z",
    "expires_at": "2024-01-16T10:00:00Z"
  }
]
```

### **Step 3: Employee Reviews & Approves**
```javascript
// Employee sees notification in mobile app
// Notification shows: "Scania requested access to your dietary preferences and emergency contact"

// Employee taps "Approve" and selects fields to share
const approval = {
  "request_id": "req-123",
  "approved_fields": ["dietary"], // Employee only approves dietary, not emergency contact
  "employee_signature": "employee_signature_hash",
  "context_card_said": "EContextCard123..."
};

POST /api/v1/consent/approve
// ✅ Result: Consent recorded in PostgreSQL, context card created
```

### **Step 4: Company Gets Data**
```javascript
// Company polls for consent status
GET /api/v1/consent/status/req-123
// Response: { "status": "approved", "approved_fields": ["dietary"] }

// Company retrieves approved data  
GET /api/v1/consent/data/req-123
// Response: { 
//   "context_card_said": "EContextCard123...",
//   "approved_fields": ["dietary"],
//   "employee_signature": "..."
// }

// Company gets available data
GET /api/v1/company/available-data
// Headers: { "X-API-Key": "company_api_key" }
```

---

## 📱 **Mobile App Key Features**

### **Current API Configuration:**
```javascript
// API Base URL (update IP for your network)
const API_BASE_URL = 'http://192.168.31.172:8000/api/v1'
```

### **Main Mobile Screens:**

1. **🆔 Registration Screen**
   - Employee enters personal info
   - Creates KERI AID using SignifyTS
   - Links identity to backend

2. **🏠 Dashboard Screen** 
   - Shows employee identity status
   - Displays KERI AID 
   - Quick access to preferences

3. **📝 Travel Preferences Screen**
   - Flight preferences (airlines, seats, meals)
   - Hotel preferences (chains, room types)
   - Emergency contact info
   - Accessibility needs

4. **🔔 Notifications Screen**
   - **Shows consent requests from companies**
   - **"Scania requested access to your flight preferences"**
   - **Approve/Deny buttons**
   - **Field selection for partial approval**

5. **📊 Data Sharing Screen**
   - View active consents
   - Revoke access to specific companies
   - Data access history

---

## 🔄 **Real-Time Consent Flow**

### **Mobile App Polling:**
```javascript
// Mobile app checks for new consent requests every 30 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    if (employeeData?.aid) {
      try {
        const pending = await apiService.getPendingConsentRequests(employeeData.aid);
        if (pending.length > 0) {
          // Show notification badge
          // Update notifications list
          setNotifications(pending);
        }
      } catch (error) {
        console.warn('Failed to check pending requests:', error);
      }
    }
  }, 30000); // Check every 30 seconds

  return () => clearInterval(interval);
}, [employeeData]);
```

### **Consent Request Notification:**
```javascript
// When consent request appears in notifications
const ConsentRequestNotification = ({ request }) => (
  <View style={styles.notificationItem}>
    <Text style={styles.title}>🏢 Access Request</Text>
    <Text style={styles.description}>
      {request.company_name} requested access to your {request.requested_fields.join(', ')}
    </Text>
    <Text style={styles.purpose}>Purpose: {request.purpose}</Text>
    
    <View style={styles.actions}>
      <TouchableOpacity 
        style={styles.approveButton}
        onPress={() => handleApproveConsent(request)}
      >
        <Text style={styles.approveButtonText}>✅ Approve</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.denyButton}
        onPress={() => handleDenyConsent(request)}
      >
        <Text style={styles.denyButtonText}>❌ Deny</Text>
      </TouchableOpacity>
    </View>
  </View>
);
```

---

## 🔐 **Security & Privacy**

### **Data Encryption:**
- All travel data encrypted with **X25519** keys
- Context cards contain encrypted approved data only
- Employee controls what fields to share

### **KERI Identity:**
- Real KERI AIDs created using **SignifyTS**
- Cryptographic signatures for all consent decisions
- Witness network validates identity operations

### **Zero-Knowledge Backend:**
- Backend only stores encrypted metadata
- Cannot decrypt employee travel data
- Audit trail for all data access

---

## 🎯 **Testing Your Mobile App**

### **1. Start Mobile App:**
```bash
cd travlr-mobile
npm start
# or
expo start
```

### **2. Test Backend Connection:**
- Tap "🔍 Test Backend" in mobile app
- Should show: "Travlr-ID API is healthy"

### **3. Create Employee Identity:**
1. Fill registration form
2. Wait for KERI AID creation
3. Verify identity appears on dashboard

### **4. Test Consent Flow:**
```bash
# 1. Create consent request via API
curl -X POST "http://localhost:8000/api/v1/consent/request" \
  -H "Content-Type: application/json" \
  -d '{
    "company_aid": "EDemo1234567890123456789012345678901234567890",
    "employee_aid": "YOUR_EMPLOYEE_AID_FROM_MOBILE",
    "requested_fields": ["dietary", "emergency_contact"],
    "purpose": "Test consent request",
    "company_public_key": "test_key",
    "expires_hours": 24
  }'

# 2. Check mobile app notifications 
# 3. Approve/deny in mobile app
# 4. Verify in backend
curl "http://localhost:8000/api/v1/consent/debug/all"
```

---

## 🚀 **Production Deployment**

### **Mobile App Updates Needed:**
1. **Update API URL** to production server
2. **Configure push notifications** for real-time consent alerts  
3. **Add biometric authentication** for sensitive operations
4. **Implement offline mode** for travel data access

### **Backend Requirements:**
- ✅ PostgreSQL database (DONE)
- ✅ All APIs working (DONE) 
- ✅ Consent workflow (DONE)
- 🔄 Push notification service
- 🔄 Production KERI witnesses
- 🔄 SSL/TLS certificates

Your mobile app is ready to work with the PostgreSQL backend! The consent workflow will allow employees to receive and manage data sharing requests from companies in real-time.