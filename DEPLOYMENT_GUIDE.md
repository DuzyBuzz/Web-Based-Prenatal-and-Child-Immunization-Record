# Deployment Guide

## Pre-Deployment Checklist

- [ ] All code committed to git
- [ ] SMS API token obtained from `sms.iprogtech.com`
- [ ] Firebase project created and configured
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged in to Firebase (`firebase login`)
- [ ] All TypeScript errors resolved (`ng build` or check errors in IDE)

## Step 1: Build Angular Application

Build the production-optimized application:

```bash
ng build
```

Expected output:
```
✔ Packages installed successfully.
✔ Build at: 2024-01-XX HH:MM:SS
✔ Generated output files: dist/pcirm/browser/
```

The built files are now ready in `dist/pcirm/browser/`.

---

## Step 2: Configure SMS API Token

Set the SMS API token in Firebase Functions config:

```bash
firebase functions:config:set sms.token="YOUR_ACTUAL_API_TOKEN_HERE"
```

**Important:** Replace `YOUR_ACTUAL_API_TOKEN_HERE` with your actual token from sms.iprogtech.com.

Verify the config was set:

```bash
firebase functions:config:get sms
```

Expected output:
```json
{
  "sms": {
    "token": "46a41b56a940789fc2ef1178f6151a79d8639ec4"
  }
}
```

---

## Step 3: Deploy Functions and Hosting

Deploy both Cloud Functions and Hosting in one command:

```bash
firebase deploy --only functions,hosting
```

This will:
1. Install function dependencies (`sms-functions/`)
2. Deploy the `api` Cloud Function
3. Deploy the Angular app to Hosting
4. Configure hosting rewrites (from `firebase.json`)

Expected output:
```
✔ functions[api]: Successful
✔ hosting[default]: file uploading complete

Hosting URL: https://YOUR-PROJECT.web.app
Functions URL: https://us-central1-YOUR-PROJECT.cloudfunctions.net/api
```

---

## Step 4: Verify Deployment

### Check Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. **Functions Tab:**
   - Verify `api` function is listed and has ✅ status
   - Check recent logs: Should see successful deployments
4. **Hosting Tab:**
   - Verify latest deployment is active
   - Check deployment history

### Test from Browser

1. Visit your hosted app: `https://YOUR-PROJECT.web.app`
2. Navigate to Login → Patient tab
3. Enter a test name and valid PH phone number (e.g., `09926105119`)
4. Click "Send OTP"
5. Check phone for SMS with OTP code
   - If SMS arrives → ✅ Backend SMS delivery working
   - If no SMS → Check Cloud Function logs (see troubleshooting below)

### Check Cloud Function Logs

```bash
firebase functions:log
```

Look for entries like:
```
[api] info: Processing SMS request...
[api] info: SMS sent successfully
```

---

## Alternative: Deploy Only Specific Components

If you only need to deploy certain components:

```bash
# Deploy only Cloud Functions
firebase deploy --only functions

# Deploy only Hosting
firebase deploy --only hosting

# Deploy specific function
firebase deploy --only functions:api
```

---

## Post-Deployment Testing

### Test Scenario 1: OTP Patient Login

**Steps:**
1. Visit `https://YOUR-PROJECT.web.app/auth/login`
2. Click "Patient" tab
3. Enter:
   - Name: "Test Patient"
   - Phone: Your actual phone number (format: 09XXXXXXXXX)
4. Click "Send OTP"
5. Wait for SMS (check phone)
6. Enter OTP in the field
7. Click "Verify"

**Expected Result:** Redirected to `/patient` dashboard

**If SMS doesn't arrive:**
- Check Cloud Function logs: `firebase functions:log`
- Verify phone number format (must start with 09, total 11 digits)
- Check SMS provider account balance/credits

### Test Scenario 2: Appointment Setting with Attendant

**Prerequisites:** Must be logged in as HCP

**Steps:**
1. Login as HCP (email/password or direct navigation if already logged in)
2. Navigate to Immunization → Select a child
3. Click "Set Appointment"
4. Observe:
   - Is `nurseName` field populated? ✅
   - Is SMS sent to parent? ✅
   - Does SMS include attendant name? ✅
5. Open Firebase Console → Firestore → `immunization` collection
6. Find the updated record and verify:
   - `nurseName` field populated ✅
   - `SecondWednesdayNextMonth` (or `nextPrenatal`) updated ✅

### Test Scenario 3: HCP Form Submission

**Steps:**
1. Login as HCP
2. Create/edit a child immunization record via form
3. Submit form
4. Check Firestore:
   - Record created with `nurseName` field ✅
   - Value matches logged-in HCP ✅

---

## Troubleshooting

### Issue: SMS Not Sending

**Error Message in logs:**
```
Error: 401 Unauthorized
```

**Solution:**
```bash
# Check if token is set
firebase functions:config:get sms

# If not set or wrong, reconfigure
firebase functions:config:set sms.token="CORRECT_TOKEN"

# Redeploy
firebase deploy --only functions
```

**Alternative:** Test token directly with SMS provider:
```bash
curl "https://sms.iprogtech.com/api/v1/sms_messages?api_token=YOUR_TOKEN&message=Test&phone_number=09926105119"
```

---

### Issue: Hosting Rewrite Not Working (404 on `/api/send-sms`)

**Symptoms:** SMS calls fail with 404, even though function is deployed

**Solution:**
1. Verify `firebase.json` has correct rewrite rule:
   ```json
   "rewrites": [
     { "source": "/api/**", "function": "api" },
     { "source": "**", "destination": "/index.html" }
   ]
   ```
2. Rebuild and redeploy hosting:
   ```bash
   ng build
   firebase deploy --only hosting
   ```
3. Clear browser cache (Ctrl+Shift+Delete)
4. Test again in incognito/private window

---

### Issue: Attendant Name Not Saving

**Check:**
1. Is user logged in as HCP?
   ```typescript
   // In browser console
   console.log(localStorage.getItem('authUser'));
   ```
   Should show HCP user object with `role: 'hcp'`

2. Does HCP document exist in Firestore?
   - Firebase Console → Firestore → `HCP` collection
   - Check if document with user's UID exists
   - Verify document has `name` field

3. Check component logs for errors:
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for error messages when clicking "Set Appointment"

**If AuthService returns null:**
```bash
# Force re-login
localStorage.removeItem('authUser');
# Then login again
```

---

### Issue: Build Fails

**Run diagnostics:**
```bash
# Check for TypeScript errors
ng build --configuration development

# See detailed error messages
ng build --verbose
```

**Common causes:**
- Missing dependencies: `npm install`
- TypeScript version mismatch: `npm upgrade`
- Import path errors: Check file paths in error messages

---

## Rollback Procedure

If deployment causes issues:

```bash
# List recent deployments
firebase hosting:releases

# Rollback to previous version
firebase hosting:rollback <VERSION_ID>

# Or redeploy specific branch
git checkout <PREVIOUS_COMMIT>
ng build
firebase deploy --only hosting
```

---

## Performance Monitoring

Monitor your deployment:

```bash
# View function execution time and costs
firebase functions:log --limit 50

# Check real-time analytics
firebase analytics --version
```

Monitor from Firebase Console:
- **Functions:** Performance, CPU time, memory usage, error rate
- **Hosting:** Requests, response time, error rate, traffic

---

## Environment-Specific Deployment

### Production Deployment
```bash
ng build --configuration production
firebase deploy --only functions,hosting
```

### Staging Deployment (if needed)
```bash
# Create staging Firebase project first
firebase deploy --only functions,hosting --project=YOUR-PROJECT-STAGING
```

---

## Continuous Integration (Optional)

To automate deployments via GitHub Actions:

**Create `.github/workflows/deploy.yml`:**
```yaml
name: Deploy to Firebase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: YOUR-PROJECT-ID
```

Then add Firebase Service Account JSON to GitHub Secrets.

---

## Post-Deployment Verification Checklist

- [ ] App loads without errors at `https://YOUR-PROJECT.web.app`
- [ ] Login page displays with HCP and Patient tabs
- [ ] Patient OTP login sends SMS successfully
- [ ] OTP verification works
- [ ] Appointment setting populates attendant name
- [ ] Appointment SMS includes attendant name
- [ ] Firestore records have `nurseName` field populated
- [ ] Cloud Function logs show successful executions
- [ ] No 404 or CORS errors in browser console

---

## Support & Troubleshooting Resources

- [Firebase Functions Troubleshooting](https://firebase.google.com/docs/functions/troubleshooting)
- [Firebase Hosting Troubleshooting](https://firebase.google.com/docs/hosting/troubleshooting)
- [SMS Provider Documentation](https://sms.iprogtech.com/docs)
- [Angular Deployment Guide](https://angular.io/guide/build)

---

## Notes

- **Deployment time:** ~2-5 minutes (depending on bundle size and function compilation)
- **Function cold start:** ~1-2 seconds on first request after deploy
- **SMS delivery time:** 1-30 seconds (via provider)
- **Costs:** Monitor Functions usage; idle functions are free, billed per invocation

For questions or issues, check logs:
```bash
firebase functions:log
firebase hosting:log
```
