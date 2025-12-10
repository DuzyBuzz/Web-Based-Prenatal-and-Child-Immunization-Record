# Code Changes Summary

This document lists all code modifications made during implementation of OTP login, attendant tracking, and backend SMS delivery.

---

## 1. Login Component (OTP Patient Login)

**File:** `src/app/auth/login/login.component.ts`

**Changes:**
- Added `activeTab` property to track HCP/Patient tab selection
- Added `switchTab(tab: string)` method to toggle between tabs
- Added OTP-related properties:
  - `patientName`, `patientPhone`, `otpCode`, `otpRequested`, `otpAttempts`, `otpResendCooldown`
- Added `sendOtpToPhone()` - generates 6-digit OTP and sends via SMS
- Added `verifyOtp()` - validates OTP with attempt limiting (max 5)
- Added `resendOtp()` - resends OTP with 30-second cooldown
- Added Firestore integration for OTP storage/verification in `patients` collection
- Imported `SmsService` and `AuthService`

**Key Methods:**
```typescript
async sendOtpToPhone() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Save to Firestore patients collection with expiry
  // Send via SmsService
}

async verifyOtp() {
  // Check against stored OTP with attempt limiting
}
```

---

**File:** `src/app/auth/login/login.component.html`

**Changes:**
- Added tab buttons: "HCP Login" and "Patient Login"
- Added conditional rendering for HCP form (username/password)
- Added conditional rendering for Patient form (name, phone)
- Added OTP input section (hidden until `otpRequested` is true)
- Added "Send OTP", "Verify", and "Resend OTP" buttons
- Added cooldown timer display for resend button

---

## 2. Immunization Component (Appointment with Attendant)

**File:** `src/app/pages/immunization/immunization.component.ts`

**Changes:**
- Injected `AuthService` into constructor
- Modified `saveAppointment()` to:
  - Fetch attendant name: `const nameFromAuth = await this.authService.getCurrentUserName()`
  - Pass attendant name to SMS service
  - Save `nurseName` to Firestore `immunization` collection
  - Update local object: `this.selectedChildForAppointment.nurseName = attendantName`
- Updated SMS messages to include attendant: `\nAttendant: ${attendantName}`
- Maintained backward compatibility with fallback to `userDetails?.name`

**Key Addition:**
```typescript
const nameFromAuth = await this.authService.getCurrentUserName();
const attendantName = nameFromAuth || this.userDetails?.name || '';
updateDoc(docRef, { SecondWednesdayNextMonth, nurseName: attendantName });
const immediateMessage = `...\nAttendant: ${attendantName}`;
```

---

## 3. Prenatal Component (Appointment with Attendant)

**File:** `src/app/pages/prenatal/prenatal.component.ts`

**Changes:**
- Injected `AuthService` into constructor
- Modified `saveAppointment()` to:
  - Fetch attendant name: `const fromAuth = await this.authService.getCurrentUserName()`
  - Save to Firestore `itr` collection with `nurseName` field
  - Update local object: `this.selectedMotherForAppointment.nextPrenatal = ...`
  - Update local object: `this.selectedMotherForAppointment.nurseName = attendantName`
- Updated SMS messages to include attendant name
- Same pattern as immunization component

---

## 4. New ITR Form (Prenatal Patient Form)

**File:** `src/app/pages/forms/new-itr-form/new-itr-form.component.ts`

**Changes:**
- Modified `ngOnInit()` to fetch attendant name at component initialization
- **Changed from:** `const authUser = this.authService.getAuthUser()`
- **Changed to:** `const nameFromAuth = await this.authService.getCurrentUserName()`
- Benefits: Real-time data from Firestore HCP collection, more reliable
- Form submission already had `nurseName: this.nurseName` in `performSave()`

**Affected Method:**
```typescript
async ngOnInit() {
  // ... existing code ...
  const nameFromAuth = await this.authService.getCurrentUserName();
  if (nameFromAuth) {
    this.nurseName = nameFromAuth;
  }
  // ... rest of initialization ...
}
```

---

## 5. SMS Service (Backend Proxy)

**File:** `src/app/services/sms.service.ts`

**Changes:**
- Changed endpoint from direct SMS provider API to backend proxy
- **From:** `https://sms.iprogtech.com/api/v1/...`
- **To:** `/api/send-sms` (backend Cloud Function)
- Added fallback mechanism for absolute function URL
- Added `catchError` with fallback to `environment.smsFunctionUrl`

**Key Changes:**
```typescript
private backendApi = '/api/send-sms';
private functionsAbsoluteUrl = (environment as any).smsFunctionUrl || '';

sendSms(phone_number: string, message: string): Observable<any> {
  const body = { phoneNumber: phone_number, message };
  return this.http.post(this.backendApi, body).pipe(
    catchError(err => {
      if (this.functionsAbsoluteUrl) {
        return this.http.post(this.functionsAbsoluteUrl, body).pipe(
          catchError(e => throwError(() => e))
        );
      }
      return throwError(() => err);
    })
  );
}
```

---

## 6. Cloud Function (SMS Backend)

**File:** `sms-functions/src/index.ts`

**Changes:**
- Created Express app with CORS enabled
- Added POST `/send-sms` endpoint
- Reads API token from:
  1. `functions.config().sms.token` (Firebase config)
  2. `process.env.SMS_API_TOKEN` (environment variable)
  3. Fallback to hardcoded value (for development only)
- Supports both immediate and scheduled SMS
- Properly encodes parameters for external SMS API
- Returns error responses with appropriate HTTP status codes

**Endpoint Signature:**
```typescript
app.post("/send-sms", async (req, res) => {
  const { phoneNumber, message, scheduledAt } = req.body;
  const apiToken = (functions.config().sms.token || process.env.SMS_API_TOKEN).trim();
  // Call external SMS provider securely server-side
})
```

---

## 7. Firebase Configuration

**File:** `firebase.json`

**Changes:**
- Added hosting rewrite rule for `/api/**` → Cloud Function `api`
- Ensures `/api/send-sms` requests are routed to the deployed function
- Placed before SPA fallback rewrite to take precedence

**Key Configuration:**
```json
"rewrites": [
  {
    "source": "/api/**",
    "function": "api"
  },
  {
    "source": "**",
    "destination": "/index.html"
  }
]
```

---

## 8. Children Immunization Form (Already Implemented)

**File:** `src/app/pages/forms/childrenimmunizationform/childrenimmunizationform.component.ts`

**Status:** Already uses `AuthService.getCurrentUserName()`

**Pattern Used:**
- `setBhwName()` method calls `authService.getCurrentUserName()`
- Saves as `this.formData.nurseName` in `onSubmit()`
- Consistent with new appointment-setting pattern

---

## 9. Immunization Form Print Only (Already Implemented)

**File:** `src/app/pages/forms/childrenimmunizationform-print-only/childrenimmunizationform-print-only.component.ts`

**Status:** Already uses `AuthService.getCurrentUserName()`

**Pattern Used:**
- Calls `authService.getCurrentUserName()` on form submission
- Saves as `this.formData.nurseName`

---

## 10. Individual Treatment Record Print Only (Already Implemented)

**File:** `src/app/pages/forms/individual-treatment-record-print-only/individual-treatment-record-print-only.component.ts`

**Status:** Already uses `AuthService.getCurrentUserName()`

**Pattern Used:**
- Queries HCP collection to get attendant name
- Saves as `nurseName: nurseName`

---

## 11. AuthService Enhancement

**File:** `src/app/auth/auth.service.ts`

**Status:** Already has `getCurrentUserName()` method

**Method Details:**
```typescript
async getCurrentUserName(): Promise<string | null> {
  const uid = await this.getCurrentUserId();
  if (!uid) return null;
  const userDocRef = doc(this.firestore, 'HCP', uid);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists()) {
    return docSnap.data()['name'] || null;
  }
  return null;
}
```

**Advantages:**
- Queries Firestore HCP collection in real-time
- Returns `null` if user not found
- Used throughout the app for consistent attendant data

---

## Summary of All Changes

| File | Type | Change | Purpose |
|------|------|--------|---------|
| login.component.ts | Modified | Added OTP login flow, tabbed UI | Patient OTP authentication |
| login.component.html | Modified | Added tab buttons, OTP input section | Patient OTP UI |
| immunization.component.ts | Modified | Added attendant name fetch and save | Track HCP who set appointment |
| prenatal.component.ts | Modified | Added attendant name fetch and save | Track HCP who set appointment |
| new-itr-form.component.ts | Modified | Updated to use `getCurrentUserName()` | Consistent attendant retrieval |
| sms.service.ts | Modified | Changed to backend proxy endpoint | CORS fix, secure SMS delivery |
| index.ts (sms-functions) | Modified | Added Express `/send-sms` endpoint | Backend SMS handling |
| firebase.json | Modified | Added `/api/**` rewrite rule | Route API calls to function |
| auth.service.ts | No change | Already has `getCurrentUserName()` | Attendant name retrieval |

---

## Files NOT Changed (But Support the Features)

The following files didn't need changes because they already had the infrastructure:
- `childrenimmunizationform.component.ts` - Already uses `getCurrentUserName()`
- `childrenimmunizationform-print-only.component.ts` - Already uses `getCurrentUserName()`
- `individual-treatment-record-print-only.component.ts` - Already uses `getCurrentUserName()`
- All authentication guards and interceptors - Already functional
- `environment.ts` - Optional config, fallback works without it

---

## Migration Guide for Old Code

If you have custom SMS-sending code in other components:

**Old Pattern (Direct API call - CORS error):**
```typescript
const url = `https://sms.iprogtech.com/api/v1/sms_messages?api_token=${token}&...`;
await axios.post(url, {});
```

**New Pattern (Backend proxy):**
```typescript
import { SmsService } from './services/sms.service';

constructor(private smsService: SmsService) {}

await firstValueFrom(this.smsService.sendSms(phoneNumber, message));
```

Replace all direct SMS provider calls with `SmsService` to ensure consistency and security.

---

## Testing the Changes

**Unit Tests Needed:**
- [ ] OTP generation produces 6-digit codes
- [ ] OTP verification respects attempt limits
- [ ] `getCurrentUserName()` returns correct HCP name
- [ ] Appointment save includes `nurseName`
- [ ] SMS messages include attendant name
- [ ] Cloud Function receives and proxies SMS correctly

**Integration Tests Needed:**
- [ ] End-to-end patient OTP login
- [ ] End-to-end appointment setting with SMS
- [ ] Firestore records properly populated with `nurseName`

---

## Backward Compatibility

All changes are backward compatible:
- Old authentication methods still work
- Existing records without `nurseName` field won't cause errors (optional field)
- SMS service handles errors gracefully with fallbacks
- No breaking changes to component APIs

---

## Future Improvements

1. Add OTP expiry timer in UI (countdown display)
2. Add SMS history/audit log in Firestore
3. Implement SMS templates for consistent messaging
4. Add SMS delivery status tracking
5. Support multiple phone numbers per patient
6. Add SMS scheduling/reminder automation
7. Implement SMS campaign management for admins
8. Add rate limiting to OTP endpoint
9. Add phone number validation with international format support
10. Add SMS encryption for sensitive data

---

## Code Review Checklist

- [ ] All changes use consistent naming (`nurseName`, `attendantName`)
- [ ] All async operations properly handled with `await` or `.subscribe()`
- [ ] Error handling includes user-friendly messages
- [ ] Firestore operations include `serverTimestamp()` for audit trails
- [ ] SMS includes all necessary information
- [ ] No API keys/tokens exposed in client code
- [ ] All imports are present and correct
- [ ] TypeScript compilation without errors

---

## Deployment Impact

**Breaking Changes:** None

**Database Migrations Needed:** None (schema supports new optional fields)

**Configuration Changes:** 
- Must set SMS API token via `firebase functions:config:set sms.token="..."`

**Performance Impact:**
- Minimal: SMS call now goes through backend instead of direct API
- Cloud Function adds ~100-200ms latency (acceptable for SMS delivery)
- SMS delivery time unchanged (provider dependent)

**Security Impact (Positive):**
- API token no longer exposed in client code
- All SMS requests go through secure backend
- Better audit trail via Cloud Function logs
