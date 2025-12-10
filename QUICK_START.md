# Quick Start: Deploy & Test

**Time to Deploy:** ~10 minutes  
**Time to Test:** ~5 minutes

---

## 1. Prepare (2 min)

### Get SMS API Token
Contact your SMS provider (sms.iprogtech.com) to get your API token. It should look like:
```
46a41b56a940789fc2ef1178f6151a79d8639ec4
```

### Ensure Prerequisites
```bash
# Check Node.js installed
node --version  # Should be v18+

# Check Angular CLI installed
ng version  # Should be v17+

# Check Firebase CLI installed
firebase --version  # Should be latest
```

If any are missing, install them.

### Login to Firebase
```bash
firebase login
# Opens browser, sign in with your Google account
```

---

## 2. Build (2 min)

```bash
# Navigate to project root
cd e:\Repositories\pcirmsduph

# Build the Angular app
ng build

# Expected output:
# ✔ Build complete
# ✔ Output files: dist/pcirm/browser/
```

If build fails, check `DEPLOYMENT_GUIDE.md` troubleshooting section.

---

## 3. Configure SMS Token (1 min)

```bash
# Set SMS API token in Firebase Functions
firebase functions:config:set sms.token="YOUR_TOKEN_HERE"
```

**Replace `YOUR_TOKEN_HERE`** with your actual SMS API token.

Verify it worked:
```bash
firebase functions:config:get sms
```

Should output:
```json
{
  "sms": {
    "token": "your-token-here"
  }
}
```

---

## 4. Deploy (3 min)

```bash
# Deploy everything (Functions + Hosting)
firebase deploy --only functions,hosting

# You should see:
# ✔ functions[api]: Successful
# ✔ hosting[default]: file uploading complete
# Hosting URL: https://YOUR-PROJECT.web.app
```

---

## 5. Test (5 min)

### Test 1: OTP Patient Login

1. Visit: `https://YOUR-PROJECT.web.app/auth/login`
2. Click **"Patient"** tab
3. Enter:
   - Name: Any name (e.g., "Test User")
   - Phone: Your real phone number (format: 09XXXXXXXXX)
4. Click **"Send OTP"**
5. **Wait for SMS** - should arrive within 30 seconds
6. Enter the 6-digit OTP code
7. Click **"Verify"**
8. **Expected:** Redirected to patient dashboard

**If SMS doesn't arrive:**
- Check phone format (must be `09XXXXXXXXX`)
- Check Cloud Function logs: `firebase functions:log`
- See DEPLOYMENT_GUIDE.md troubleshooting

### Test 2: Appointment with Attendant

1. Login as HCP (use email/password for existing HCP user)
2. Navigate to: **Immunization > [Select Child] > Set Appointment**
3. **Verify:**
   - ✅ `nurseName` field shows your HCP name
   - ✅ SMS sent to patient's phone with appointment date + attendant name
4. Open Firestore Console: **Firestore > immunization collection**
5. **Verify:**
   - ✅ `nurseName` field populated with HCP name
   - ✅ Appointment date saved

**Success Indicators:**
- SMS arrives to patient within 30 seconds
- SMS includes "Attendant: [Your Name]"
- Firestore record has `nurseName` field
- UI updates immediately without page reload

---

## Done! ✅

Your system is now live with:
- ✅ OTP patient login with SMS verification
- ✅ Attendant (HCP) name tracking on appointments
- ✅ Secure backend SMS delivery (CORS fixed)

---

## Common Issues & Quick Fixes

### Issue: SMS Not Received
```bash
# Check function logs
firebase functions:log

# Look for errors like "401 Unauthorized"
# If you see that, reconfigure token:
firebase functions:config:set sms.token="CORRECT_TOKEN"
firebase deploy --only functions
```

### Issue: Attendant Name Not Saving
```bash
# Check you're logged in as HCP
# Open browser console (F12) and type:
console.log(localStorage.getItem('authUser'))
# Should show HCP user with role: "hcp"

# If not, logout and login again
```

### Issue: "404 Not Found" on `/api/send-sms`
```bash
# Verify firebase.json has rewrite rule
# It should have:
# "rewrites": [
#   { "source": "/api/**", "function": "api" }
# ]

# Clear browser cache and try again
# In Chrome: Ctrl+Shift+Delete
```

---

## Monitoring After Deployment

**Check logs regularly:**
```bash
firebase functions:log
```

Look for:
- ✅ Successful SMS sends: `"status": 200`
- ❌ Errors: `"status": 5xx` or `"error"`

**Monitor Firestore:**
- Firebase Console > Firestore > Metrics
- Watch for quota warnings (shouldn't happen with normal usage)

---

## What's New in This Deployment

| Feature | Status | Where |
|---------|--------|-------|
| OTP Patient Login | ✅ Live | `/auth/login` - Patient tab |
| Attendant Tracking | ✅ Live | Appointment setting |
| Secure SMS Delivery | ✅ Live | Backend Cloud Function |
| `nurseName` Field | ✅ Live | Firestore records |

---

## Next: Read Documentation

For detailed information, see:
- **📋 IMPLEMENTATION_SUMMARY.md** - Full feature overview
- **📖 NURSENAME_REFERENCE.md** - How to use attendant name in code
- **🚀 DEPLOYMENT_GUIDE.md** - Detailed deployment steps
- **✅ FINAL_CHECKLIST.md** - Complete implementation status

---

## Questions?

1. **Deployment issues?** → DEPLOYMENT_GUIDE.md > Troubleshooting
2. **Code questions?** → CODE_CHANGES_SUMMARY.md
3. **Feature questions?** → IMPLEMENTATION_SUMMARY.md
4. **Usage examples?** → NURSENAME_REFERENCE.md

---

## Success! 🎉

Your PCIRM system now has:
- Modern OTP-based patient authentication
- Automatic attendant tracking for all appointments
- Secure SMS delivery without CORS issues
- Complete audit trail with timestamps

All changes are live and ready for users!
