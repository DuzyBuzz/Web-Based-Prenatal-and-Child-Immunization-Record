# SMS Appointments Debugging Guide

## Issue Overview
SMS messages are not being sent when setting appointments in the immunization and prenatal modules.

## Changes Made
Enhanced both `immunization.component.ts` and `prenatal.component.ts` with comprehensive logging to identify where SMS failures occur.

## Debugging Steps

### 1. **Open Browser Developer Tools**
- Press `F12` or Right-click → **Inspect**
- Go to **Console** tab

### 2. **Create an Appointment and Watch Console Logs**

When you set an appointment, look for these log messages in order:

#### **Phase 1: Phone Number Extraction**
```
📱 Raw contact value: [the phone number from database]
📱 Formatted contact: [formatted number like 09XXXXXXXXXX]
```

**If you see:**
- `⚠️ WARNING: No valid phone number found for SMS` → **Phone number is missing from the record**

**Action:** Check if the patient/mother record has one of these fields:
- `contact`
- `contactNumber`
- `phone`
- `motherContact`
- `motherPhone`

---

#### **Phase 2: SMS Sending**
```
📤 Sending immediate SMS to: 09XXXXXXXXXX Message: [message text]
```

Then you should see **ONE of these**:

**Success:**
```
✅ Immediate SMS sent successfully: {response from server}
```

**Failure:**
```
❌ Immediate SMS failed: [error object]
Error details: [error message] [HTTP status] [error body]
```

---

#### **Phase 3: Scheduled SMS (Reminder)**
```
📤 Scheduling reminder SMS for: [date string] To: 09XXXXXXXXXX
```

Then:
```
✅ Scheduled SMS set successfully: {response}
// or
❌ Scheduled SMS failed: [error]
```

---

## Common Issues & Solutions

### **Issue 1: "No valid phone number found for SMS"**
**Problem:** Patient/mother record doesn't have a phone number

**Solution:**
1. Check the patient/mother record in Firestore
2. Ensure one of these fields is populated:
   - `contact`
   - `contactNumber`
   - `phone`
   - `motherContact`
   - `motherPhone`
3. Must be in format: `09xxxxxxxxxx` or `9xxxxxxxxx` (10-11 digits)

### **Issue 2: "Immediate SMS failed"**
**Problem:** SMS API returned an error

**Check the error details:**
- **Status 400:** Bad request (phone number format issue)
  - Verify phone number is in correct format
- **Status 401:** Unauthorized (API token issue)
  - Check that `SMS_API_TOKEN` environment variable is set correctly
- **Status 500:** Server error
  - Check Cloud Function logs in Firebase Console
- **CORS error:** Network request blocked
  - Verify `firebase.json` rewrite is deployed:
    ```json
    {
      "source": "/api/**",
      "function": "api"
    }
    ```

### **Issue 3: "Scheduled SMS failed"**
**Problem:** Reminder SMS scheduling failed

**Possible causes:**
- `scheduledAt` date format is invalid
- Check the log message: `⚠️ Could not format scheduled date for reminder SMS`
  - This means `formatDateAt3AM()` returned null

### **Issue 4: SMS calls not appearing in console**
**Problem:** No log messages at all

**Check:**
1. **Appointment wasn't saved** - Look for earlier errors about nurseName or Firestore
2. **Phone number is empty** - Silent return before SMS attempt
3. **Console.log not working** - Refresh the page (F5)

---

## Testing Checklist

### ✅ Before Setting Appointment
- [ ] You are logged in as HCP
- [ ] Patient/Mother record is open
- [ ] Patient/Mother has a phone number in Firestore
- [ ] Appointment date is selected

### ✅ When Setting Appointment
- [ ] Open browser F12 Console
- [ ] Set the appointment and check appointment is saved to Firestore
- [ ] Watch console for SMS logs

### ✅ Expected Console Output (Successful)
```
HCP name from userDetails (Firebase): [name]
Saving appointment with nurseName: [name] userId: [uid] for child/mother: [id]
✅ Successfully saved appointment to Firestore with nurseName: [name]
📱 Raw contact value: 09XXXXXXXXXX
📱 Formatted contact: 09XXXXXXXXXX
📤 Sending immediate SMS to: 09XXXXXXXXXX Message: [message]
✅ Immediate SMS sent successfully: {success_response}
📤 Scheduling reminder SMS for: [date] To: 09XXXXXXXXXX
✅ Scheduled SMS set successfully: {success_response}
```

---

## Firestore Data Structure

Ensure your records have correct phone number fields:

**For Immunization (children):**
```
{
  id: "...",
  name: "Child Name",
  mother: "Mother Name",
  contact: "09XXXXXXXXXX",        // OR
  contactNumber: "09XXXXXXXXXX",  // OR
  phone: "09XXXXXXXXXX",          // OR
  motherContact: "09XXXXXXXXXX",  // OR
  motherPhone: "09XXXXXXXXXX"     // One of these is required
}
```

**For Prenatal (mothers/ITR):**
```
{
  id: "...",
  firstName: "First",
  middleName: "Middle",
  lastName: "Last",
  contact: "09XXXXXXXXXX",        // OR
  contactNumber: "09XXXXXXXXXX",  // OR
  phone: "09XXXXXXXXXX",          // OR
  motherContact: "09XXXXXXXXXX",  // OR
  motherPhone: "09XXXXXXXXXX"     // One of these is required
}
```

---

## Phone Number Format Rules

The `formatPHNumber()` method accepts:
- **10 digits starting with 9:** `9123456789` → converts to `09123456789`
- **11 digits starting with 09:** `09123456789` → accepts as-is
- **All other formats:** Returns empty string

**Valid formats:**
- ✅ `09123456789`
- ✅ `9123456789`
- ✅ `09-123-456-789` (hyphens removed automatically)
- ✅ `(09) 123 456-789` (all non-digits removed, then validated)

**Invalid formats:**
- ❌ `639123456789` (63 country code)
- ❌ `0912345678` (only 10 digits, doesn't start with 9)
- ❌ Empty or null
- ❌ Non-numeric characters after cleaning

---

## Cloud Function Logs

If SMS fails, check Firebase Console:

1. Go to: https://console.firebase.google.com
2. Select project: `prenatal-and-immunization`
3. Go to **Functions** → **Logs**
4. Filter by function: `api`
5. Look for POST `/send-sms` requests
6. Check the response and error details

---

## Quick Fix Checklist

If SMS stopped working after code changes:

- [ ] Verify phone numbers exist in Firestore records
- [ ] Check Cloud Function is deployed (`firebase deploy --only functions`)
- [ ] Verify Firebase Hosting rewrite is deployed (`firebase deploy --only hosting`)
- [ ] Check SMS API token in Cloud Function environment variables
- [ ] Verify SMS API endpoint is accessible: `https://sms.iprogtech.com/api/v1/sms_messages`
- [ ] Check browser console for error messages (F12)

---

## Support Information

**Files Modified:**
- `src/app/pages/immunization/immunization.component.ts`
- `src/app/pages/prenatal/prenatal.component.ts`

**New Logging Added:**
- Phone number extraction (📱)
- SMS sending attempts (📤)
- Success confirmations (✅)
- Error details (❌)

All logs are timestamped and include full error details for easy debugging.
