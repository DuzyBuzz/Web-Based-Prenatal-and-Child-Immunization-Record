# Quick Reference: How to Get `nurseName` (Attendant Name)

This document shows the standard pattern used throughout the application for obtaining and saving the attendant (HCP) name.

## Pattern 1: Direct Query from AuthService (Recommended)

**Best for:** Appointment-saving components, forms that need immediate name fetch.

```typescript
import { AuthService } from '../../auth/auth.service';

export class MyComponent {
  constructor(private authService: AuthService) {}

  async saveAppointment() {
    // Fetch attendant name from AuthService
    const attendantName = await this.authService.getCurrentUserName();
    
    if (attendantName) {
      // Use it in SMS message
      const smsMessage = `...Appointment set.\nAttendant: ${attendantName}`;
      
      // Save to Firestore
      updateDoc(docRef, {
        nurseName: attendantName,
        updatedAt: serverTimestamp()
      });
      
      // Update local state (UI reflects immediately)
      this.selectedRecord.nurseName = attendantName;
    }
  }
}
```

**What `getCurrentUserName()` does:**
1. Gets user ID via `getCurrentUserId()`
2. Queries Firestore `HCP` collection by UID
3. Extracts `name` field from HCP document
4. Returns name or `null` if not found

**When to use:**
- Appointment setting flows
- Quick access to current HCP name
- When you need real-time Firestore data

---

## Pattern 2: localStorage-backed AuthUser (Legacy)

**Note:** This pattern is less reliable. Use Pattern 1 instead.

```typescript
const authUser = this.authService.getAuthUser();
if (authUser && authUser.role === 'hcp') {
  this.nurseName = authUser.name;
}
```

**Issues:**
- Data cached in localStorage, may be stale
- Requires user to have logged in via HCP login
- Not reliable for patient-side operations

---

## Pattern 3: HCP Collection Direct Query (Used in Forms)

**Used in:** `childrenimmunizationform.component.ts`, form components.

```typescript
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

async setBhwName() {
  const user = this.authService.getAuthUser();
  if (user) {
    const docRef = doc(this.firestore, 'HCP', user.id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      this.formData.bhw = docSnap.data()['name'];
    }
  }
}

// Later in onSubmit():
onSubmit() {
  const data = this.form.getRawValue();
  data.nurseName = this.formData.bhw; // Assign form's HCP name to nurseName
  addDoc(collection(this.firestore, 'immunization'), data);
}
```

**When to use:**
- Complex forms with BHW selection UI
- When you want to show BHW name in form UI before saving
- When user might change HCP name during form editing

---

## Complete Example: Appointment Setting in a List Component

```typescript
import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { SmsService } from '../../services/sms.service';
import { Firestore, doc, updateDoc, serverTimestamp } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-my-appointments',
  template: `...`,
})
export class MyAppointmentsComponent implements OnInit {
  private authService = inject(AuthService);
  private smsService = inject(SmsService);
  private firestore = inject(Firestore);

  selectedRecord: any = {};

  async setAppointment() {
    // Step 1: Get attendant name
    const attendantName = await this.authService.getCurrentUserName();
    if (!attendantName) {
      alert('Could not get attendant name. Please try again.');
      return;
    }

    // Step 2: Calculate appointment date (e.g., 2nd Wednesday next month)
    const appointmentDate = this.calculateNextAppointment();

    // Step 3: Update Firestore document
    const docRef = doc(this.firestore, 'immunization', this.selectedRecord.id);
    await updateDoc(docRef, {
      SecondWednesdayNextMonth: appointmentDate,
      nurseName: attendantName,
      updatedAt: serverTimestamp()
    });

    // Step 4: Update local state (UI refreshes immediately)
    this.selectedRecord.SecondWednesdayNextMonth = appointmentDate;
    this.selectedRecord.nurseName = attendantName;

    // Step 5: Send SMS to patient with appointment details
    const patientPhone = this.selectedRecord.parentContact;
    const smsMessage = `Your appointment has been set for ${appointmentDate}.\nAttendant: ${attendantName}\nPlease come prepared.`;
    
    try {
      await firstValueFrom(this.smsService.sendSms(patientPhone, smsMessage));
      alert('Appointment set and SMS sent!');
    } catch (error) {
      console.error('SMS send failed:', error);
      alert('Appointment set, but SMS failed to send.');
    }
  }

  private calculateNextAppointment(): string {
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = (now.getMonth() + 1) % 12;
    let wednesdayCount = 0;
    
    for (let day = 1; day <= 31; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 3) { // 3 = Wednesday
        wednesdayCount++;
        if (wednesdayCount === 2) {
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
      }
    }
    return '';
  }
}
```

---

## SMS Service Usage

**To send SMS with attendant name:**

```typescript
import { SmsService } from '../../services/sms.service';
import { firstValueFrom } from 'rxjs';

// In your component
constructor(private smsService: SmsService) {}

async sendAppointmentSMS() {
  const phoneNumber = '09926105119'; // Patient's phone
  const attendantName = await this.authService.getCurrentUserName();
  const message = `Appointment set for ${appointmentDate}\nAttendant: ${attendantName}`;
  
  try {
    const result = await firstValueFrom(this.smsService.sendSms(phoneNumber, message));
    console.log('SMS sent:', result);
  } catch (error) {
    console.error('SMS failed:', error);
  }
}
```

---

## Firestore Field Naming Conventions

### Immunization Records (`immunization` collection):
- `nurseName` - HCP/nurse name who set appointment or created record
- `SecondWednesdayNextMonth` - Date of scheduled appointment
- `updatedAt` - Timestamp of last update
- `createdAt` - Timestamp of creation

### Prenatal Records (`itr` collection):
- `nurseName` - HCP/midwife name who set appointment or created record
- `nextPrenatal` - Date of scheduled next visit
- `updatedAt` - Timestamp of last update
- `createdAt` - Timestamp of creation

### Patient Records (`patients` collection):
- `phone` - Patient's phone number for OTP login
- `otp` - Current OTP code
- `otpExpiresAt` - When OTP expires
- `isVerified` - Whether patient verified OTP

---

## Error Handling Pattern

```typescript
async saveWithAttendant() {
  try {
    // Fetch attendant
    const attendantName = await this.authService.getCurrentUserName();
    if (!attendantName) {
      throw new Error('No attendant name available. Please ensure you are logged in as HCP.');
    }

    // Save with attendant
    await updateDoc(docRef, { nurseName: attendantName });

    // Send SMS
    await firstValueFrom(this.smsService.sendSms(phone, message));
    
    alert('Success!');
  } catch (error) {
    console.error('Error:', error);
    alert(`Failed: ${(error as Error).message}`);
  }
}
```

---

## Summary Table

| Method | Source | Real-time? | Use Case |
|--------|--------|-----------|----------|
| `getCurrentUserName()` | Firestore HCP collection | ✅ Yes | Appointment setting, immediate access |
| `getAuthUser()` | localStorage | ❌ No (cached) | Legacy, UI display only |
| Direct HCP collection query | Firestore | ✅ Yes | Complex forms, BHW selection |

**Recommendation:** Use `getCurrentUserName()` for all new code and appointment-related operations.
