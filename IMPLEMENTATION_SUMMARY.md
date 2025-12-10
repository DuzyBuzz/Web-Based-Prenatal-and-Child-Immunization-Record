# PCIRM Implementation Summary

## Overview
This document summarizes all the changes made to implement OTP-based patient login, attendant tracking for appointments, and secure backend SMS delivery.

## Key Features Implemented

### 1. OTP-Based Patient Login
**Files Modified:**
- `src/app/auth/login/login.component.ts`
- `src/app/auth/login/login.component.html`

**Features:**
- Tabbed login UI separating HCP (username/password) and Patient (name/phone + OTP) login flows
- OTP generation: 6-digit random code (100000-999999)
- OTP delivery via SMS using backend Cloud Function
- OTP verification with attempt limiting (max 5 attempts)
- OTP resend with 30-second cooldown
- Patient phone number stored in Firebase Auth as credential
- OTP stored in Firestore `patients` collection for verification

**Key Code Pattern:**
```typescript
// Generate OTP
const otp = Math.floor(100000 + Math.random() * 900000).toString();

// Send via SMS Service (uses backend proxy)
await firstValueFrom(this.smsService.sendSms(phone, `Your OTP is: ${otp}`));

// Verify with attempt limiting
if (this.otpAttempts >= 5) {
  alert('Too many failed attempts. Please resend OTP.');
  return;
}
```

### 2. Attendant (HCP) Name Integration
**Files Modified:**
- `src/app/pages/immunization/immunization.component.ts`
- `src/app/pages/prenatal/prenatal.component.ts`
- `src/app/pages/forms/new-itr-form/new-itr-form.component.ts`
- `src/app/pages/forms/childrenimmunizationform/childrenimmunizationform.component.ts`
- `src/app/pages/forms/childrenimmunizationform-print-only/childrenimmunizationform-print-only.component.ts`
- `src/app/pages/forms/individual-treatment-record-print-only/individual-treatment-record-print-only.component.ts`

**Pattern Used:**
```typescript
// Fetch attendant name from AuthService (queries HCP collection by UID)
const attendantName = await this.authService.getCurrentUserName();

// Save to Firestore with appointment
updateDoc(docRef, { 
  SecondWednesdayNextMonth: newDate,
  nurseName: attendantName,
  updatedAt: serverTimestamp()
});

// Update local state for immediate UI reflection
this.selectedChildForAppointment.nurseName = attendantName;

// Include in SMS messages
const smsMessage = `...Appointment: ${newDate}\nAttendant: ${attendantName}`;
```

**Firestore Fields Populated:**
- Immunization records: `nurseName` field in `immunization` collection
- Prenatal records: `nurseName` field in `itr` collection
- Child immunization forms: `nurseName` field in `immunization` collection
- Mother prenatal forms: `nurseName` field in `itr` collection

### 3. Backend SMS Delivery (CORS Fix)
**Files Modified:**
- `src/app/services/sms.service.ts` - Client-side service
- `sms-functions/src/index.ts` - Cloud Function backend
- `firebase.json` - Hosting rewrite configuration
- `src/environments/environment.ts` - Optional fallback URL

**Architecture:**
```
Client (Angular) 
  ↓ 
POST /api/send-sms (via Hosting Rewrite)
  ↓
Cloud Function (Express.js)
  ↓
External SMS API (sms.iprogtech.com)
```

**Key Features:**
- Eliminates CORS errors by routing SMS through backend
- API token kept secure (never exposed to client)
- Supports both immediate and scheduled SMS
- Fallback mechanism: tries local rewrite first, then absolute function URL
- Error handling with proper status codes

**SMS Service Usage:**
```typescript
// Immediate SMS
this.smsService.sendSms(phoneNumber, message).subscribe(...);

// Scheduled SMS (reminder)
this.smsService.scheduleSmsReminder(phoneNumber, message, scheduledAt).subscribe(...);
```

### 4. AuthService Enhancement
**New Method:** `getCurrentUserName()`
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

**Advantage:** Queries HCP collection directly from Firestore, ensuring real-time data.

## Firestore Collections & Fields

### Updated Collections:

**`immunization`** (child immunization records):
- New Field: `nurseName` (string) - HCP name who set the appointment

**`itr`** (Individual Treatment Record - prenatal):
- New Field: `nurseName` (string) - HCP name who set the appointment

**`patients`** (OTP verification):
- New/Updated Fields:
  - `phone` (string) - Patient phone number
  - `otp` (string) - One-time password for verification
  - `otpExpiresAt` (timestamp) - OTP expiration time
  - `isVerified` (boolean) - OTP verification status

## Deployment Checklist

### Step 1: Set SMS API Token
```bash
firebase functions:config:set sms.token="YOUR_SMS_API_TOKEN_HERE"
```
Replace `YOUR_SMS_API_TOKEN_HERE` with your actual API token from `sms.iprogtech.com`.

### Step 2: Build Angular Application
```bash
ng build
```
This generates the optimized production build in `dist/pcirm/browser/`.

### Step 3: Deploy Functions and Hosting
```bash
firebase deploy --only functions,hosting
```

This will:
1. Deploy the Cloud Function (`api`) to Firebase Functions
2. Configure hosting with the rewrite rule (`/api/**` → `api` function)
3. Deploy the built Angular app to Firebase Hosting

### Step 4: Verify Deployment
1. Check Firebase Console → Functions → `api` function is deployed
2. Check Firebase Console → Hosting → Deployment is active
3. Test SMS sending from login OTP flow in production
4. Test appointment save with SMS delivery

## Testing Checklist

### OTP Login Flow
- [ ] Navigate to login page
- [ ] Click "Patient" tab
- [ ] Enter name and valid PH phone number (09XXXXXXXXX)
- [ ] Click "Send OTP"
- [ ] Verify SMS is received with OTP
- [ ] Enter OTP and click "Verify"
- [ ] Verify login redirects to `/patient` dashboard

### Appointment Setting with Attendant
- [ ] Login as HCP (immunization or prenatal staff)
- [ ] Navigate to child/mother records
- [ ] Click "Set Appointment"
- [ ] Verify `nurseName` is populated with current HCP name
- [ ] Verify SMS is sent with attendant name included
- [ ] Verify Firestore record includes `nurseName` field

### Existing HCP Login (Firebase Auth)
- [ ] Login as HCP with email/password
- [ ] Verify `getCurrentUserName()` resolves correctly
- [ ] Verify forms save `nurseName` on submission

## Technical Details

### OTP Flow Sequence
1. Patient enters name and phone → Click "Send OTP"
2. Frontend generates random 6-digit OTP
3. Frontend calls `SmsService.sendSms()` → Backend Cloud Function
4. Cloud Function calls external SMS provider API
5. SMS delivered to patient's phone
6. Patient enters OTP and clicks "Verify"
7. Frontend checks OTP against Firestore record
8. On success, patient is authenticated and redirected to `/patient`

### Appointment Setting Flow
1. HCP clicks "Set Appointment" on patient record
2. Frontend calls `AuthService.getCurrentUserName()` to fetch HCP name from Firestore HCP collection
3. Frontend updates Firestore document with `nurseName` and appointment date
4. Frontend updates local component state (UI refreshed immediately)
5. Frontend sends SMS to patient with appointment date and attendant name
6. Optional: Schedules reminder SMS for appointment day using `scheduleSmsReminder()`

### Firebase Hosting Rewrite Magic
When client makes POST to `/api/send-sms`:
1. Hosting rewrite rule catches request
2. Forwards to Cloud Function `api`
3. Function handles request and calls external SMS provider
4. Response returned to client
5. CORS bypassed because request is same-origin after rewrite

## Environment Configuration

### `environment.ts` (Optional)
Add fallback function URL (if needed for local testing):
```typescript
export const environment = {
  production: false,
  smsFunctionUrl: 'http://localhost:5001/pcirm/us-central1/api' // Local emulator
};
```

### `environment.development.ts`
Can remain empty or use development values.

## Security Considerations

1. **API Token**: Stored in Cloud Function config, never sent to client
2. **OTP**: Generated client-side, stored in Firestore with expiry
3. **Phone Verification**: OTP prevents unauthorized access with unverified phone
4. **SMS Service**: All sensitive operations happen server-side

## Troubleshooting

### SMS Not Sending
1. Check Cloud Function logs: `firebase functions:log`
2. Verify API token is set: `firebase functions:config:get sms`
3. Test external SMS provider connectivity: `curl https://sms.iprogtech.com/api/v1/sms_messages?...`

### OTP Not Received
1. Verify phone number format (must be 11 digits starting with 09)
2. Check Cloud Function logs for SMS delivery errors
3. Verify SMS provider account has sufficient balance/credits

### Attendant Name Not Saving
1. Check AuthService user context: Ensure `getCurrentUserName()` returns valid name
2. Verify Firestore HCP collection has records for logged-in user
3. Check browser console for async errors

### Hosting Rewrite Not Working
1. Ensure `/api/**` rewrite rule is in `firebase.json`
2. Rebuild: `ng build`
3. Redeploy: `firebase deploy --only hosting`

## Future Enhancements

1. Add SMS scheduling for automatic appointment reminders
2. Implement SMS history/audit log in Firestore
3. Add OTP expiry timer in UI (countdown)
4. Support multiple phone numbers per patient
5. Add SMS templates for consistency
6. Implement SMS delivery status tracking
7. Add admin dashboard for SMS campaign management

## References

- Firebase Cloud Functions: https://firebase.google.com/docs/functions
- Firebase Hosting: https://firebase.google.com/docs/hosting
- Angular 17+ Documentation: https://angular.io/guide/standalone-components
- RxJS Pattern Usage: `firstValueFrom()` for promise-based async/await with Observables
