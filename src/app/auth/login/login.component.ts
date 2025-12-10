import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { SmsService } from '../../services/sms.service';
import { firstValueFrom } from 'rxjs';
import { getDocs, query, where, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';
import { SharedModule } from '../../shared/shared.module';
import { SpinnnerComponent } from '../../shared/core/spinnner/spinnner.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule, SpinnnerComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  // Form data
  username = '';
  password = '';

  // State management
  loading = false;
  navigating = false;
  spinnerMessage = 'Preparing your dashboard...';
  // Patient quick access
  patientFullName = '';
  patientLoading = false;
  patientMessage = '';
  patientPhone = '';
  patientHasAccount = false;
  // OTP flow state
  otpRequested = false;
  otpInput = '';
  expectedOtp: string | null = null;
  pendingPatientId: string | null = null;
  pendingPatientName = '';
  pendingPatientPhone = '';
  otpSending = false;
  otpError = '';
  // OTP lifecycle
  otpPurpose: string | null = null; // e.g., 'patient-login'
  otpExpiresAt: number | null = null; // epoch ms when OTP becomes invalid
  otpValiditySeconds = 300; // OTP valid for 5 minutes by default
  // OTP controls
  otpAttempts = 0;
  maxOtpAttempts = 5;
  lastOtpSentAt: number | null = null; // epoch ms
  resendCooldownSeconds = 30;
  // UI: active tab: 'hcp' (default) or 'patient'
  activeTab: 'hcp' | 'patient' = 'hcp';

  constructor(private authService: AuthService, private router: Router, private smsService: SmsService) {}

  switchTab(tab: 'hcp' | 'patient') {
    this.activeTab = tab;
    // reset some transient patient/otp state when switching away
    if (tab === 'hcp') {
      this.otpRequested = false;
      this.otpInput = '';
      this.expectedOtp = null;
      this.pendingPatientId = null;
      this.otpError = '';
    }
  }

  ngOnInit() {}

  async loginWithEmail() {
    this.loading = true;
    try {
      // Check admin collection
      const adminQuery = query(
        collection(this.authService['firestore'], 'admin'),
        where('username', '==', this.username),
        where('password', '==', this.password)
      );
      const adminSnapshot = await getDocs(adminQuery);

      if (!adminSnapshot.empty) {
        // Save admin auth details
        const adminData = adminSnapshot.docs[0].data();
        this.authService.setAuthUser({
          id: adminSnapshot.docs[0].id,
          username: adminData['username'],
          name: adminData['name'],
          role: 'admin',
        });
        this.router.navigate(['/Admin']);
        return;
      }

      // Check HCP collection
      const hcpQuery = query(
        collection(this.authService['firestore'], 'HCP'),
        where('username', '==', this.username),
        where('password', '==', this.password)
      );
      const hcpSnapshot = await getDocs(hcpQuery);

      if (!hcpSnapshot.empty) {
        // Save HCP auth details
        const hcpData = hcpSnapshot.docs[0].data();
        this.authService.setAuthUser({
          id: hcpSnapshot.docs[0].id,
          username: hcpData['username'],
          name: hcpData['name'],
          role: 'hcp',
        });
        this.router.navigate(['/HCP']);
        return;
      }

      window.alert('Invalid username or password.');
    } catch (error) {
      window.alert('Login error: ' + (error as any).message);
    } finally {
      this.loading = false;
    }
  }

  // Create or find a patient document and store a lightweight patient session in localStorage
  async continueAsPatient() {
    if (!this.patientFullName || !this.patientFullName.trim()) {
      this.patientMessage = 'Full name is required.';
      return;
    }
    if (!this.patientPhone || !this.patientPhone.trim()) {
      this.patientMessage = 'Phone number is required.';
      return;
    }
    // Start OTP flow: create or find patient, but require OTP verification before finalizing
    this.patientLoading = true;
    this.otpError = '';
    try {
      const db = this.authService['firestore'];
      let patientId: string | null = null;
      const nameLower = this.patientFullName.trim().toLowerCase();
      const phoneNorm = this.formatPHNumber(this.patientPhone.trim());
      if (!phoneNorm) {
        this.patientMessage = 'Phone number is invalid. Use 09XXXXXXXXX format.';
        return;
      }

      if (this.patientHasAccount) {
        // Sign-in: try by phone first, then by case-insensitive fullName
        const q1 = query(collection(db, 'patients'), where('phone', '==', phoneNorm));
        const snap1 = await getDocs(q1);
        if (!snap1.empty) {
          patientId = snap1.docs[0].id;
        } else {
          const q2 = query(collection(db, 'patients'));
          const snap2 = await getDocs(q2);
          const match = snap2.docs.find(doc => (doc.data()['fullName'] || '').toLowerCase() === nameLower);
          if (match) patientId = match.id;
        }
        if (!patientId) {
          this.patientMessage = 'No patient found with that name or phone.';
          return;
        }
      } else {
        // Sign-up: check if patient exists by phone or case-insensitive name
        const q1 = query(collection(db, 'patients'), where('phone', '==', phoneNorm));
        const snap1 = await getDocs(q1);
        if (!snap1.empty) {
          this.patientMessage = 'A patient with that phone already exists.';
          return;
        }
        const q2 = query(collection(db, 'patients'));
        const snap2 = await getDocs(q2);
        const match = snap2.docs.find(doc => (doc.data()['fullName'] || '').toLowerCase() === nameLower);
        if (match) {
          this.patientMessage = 'A patient with that name already exists.';
          return;
        }
        const newDoc = await addDoc(collection(db, 'patients'), {
          fullName: this.patientFullName.trim(),
          fullNameLower: nameLower,
          phone: phoneNorm,
          createdAt: serverTimestamp()
        } as any);
        patientId = newDoc.id;
      }

      if (patientId) {
        // Save pending values and send OTP (login-only purpose)
        this.pendingPatientId = patientId;
        this.pendingPatientName = this.patientFullName.trim();
        this.pendingPatientPhone = phoneNorm;
        await this.sendOtpToPhone(phoneNorm, 'patient-login');
        this.otpRequested = true;
        this.patientMessage = 'OTP sent to ' + phoneNorm + '. Enter it below to verify.';
      }
    } catch (err) {
      console.error('patient continue error', err);
      this.patientMessage = 'Unable to continue as patient. Please try again.';
    } finally {
      this.patientLoading = false;
    }
  }

  private async sendOtpToPhone(phone: string, purpose: string = 'patient-login') {
    try {
      this.otpSending = true;
      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      this.expectedOtp = code;
      const message = `Your verification code is ${code}. Do not share this code with anyone.`;
      // Normalize phone and send SMS using existing SmsService; backend may enforce rate-limits
      const formatted = this.formatPHNumber(phone);
      if (!formatted) {
        this.otpError = 'Invalid phone number.';
        return;
      }
      // Set purpose and expiry immediately so verify can check intent even if send is pending
      this.otpPurpose = purpose;
      this.otpExpiresAt = Date.now() + this.otpValiditySeconds * 1000;
      console.debug('[Login] sendOtpToPhone set otpPurpose and otpExpiresAt', { otpPurpose: this.otpPurpose, otpExpiresAt: this.otpExpiresAt });
      await firstValueFrom(this.smsService.sendSms(formatted, message));
      this.lastOtpSentAt = Date.now();
      console.info('[Login] sendOtpToPhone SMS sent', { phone: formatted, lastOtpSentAt: this.lastOtpSentAt });
      // reset verify attempts when a new OTP is issued
      this.otpAttempts = 0;
    } catch (err) {
      console.error('OTP send error', err);
      this.otpError = 'Failed to send OTP. Please try resend.';
      // clear purpose/expiry on failure to avoid stale state
      this.otpPurpose = null;
      this.otpExpiresAt = null;
    } finally {
      this.otpSending = false;
    }
  }

  async verifyOtp() {
    console.log('[Login] verifyOtp called', { otpInput: this.otpInput, expectedOtp: this.expectedOtp, otpPurpose: this.otpPurpose, otpExpiresAt: this.otpExpiresAt });
    if (!this.otpInput) {
      this.otpError = 'Please enter the OTP.';
      return;
    }
    if (!this.expectedOtp) {
      this.otpError = 'No OTP was issued. Request a new code.';
      return;
    }
    this.otpError = '';
    // Check expiry and purpose
    const now = Date.now();
    // If purpose mismatch AND purpose is set, reject. If purpose is missing (null) but expectedOtp exists,
    // allow a fallback (this handles race conditions where purpose wasn't set yet on send).
    if (this.otpPurpose && this.otpPurpose !== 'patient-login') {
      console.warn('[Login] otpPurpose mismatch', this.otpPurpose);
      this.otpError = 'This OTP is not valid for patient login.';
      return;
    }
    if (!this.otpPurpose) {
      console.warn('[Login] otpPurpose is missing — falling back to expectedOtp validation', { expectedOtp: this.expectedOtp });
    }
    if (this.otpExpiresAt && now > this.otpExpiresAt) {
      console.info('[Login] OTP expired', { now, otpExpiresAt: this.otpExpiresAt });
      this.otpError = 'OTP expired. Request a new code.';
      this.expectedOtp = null;
      this.otpRequested = false;
      this.otpPurpose = null;
      this.otpExpiresAt = null;
      return;
    }
    if (this.otpInput.trim() === this.expectedOtp) {
      // OTP correct — finalize session
      if (this.pendingPatientId) {
        localStorage.setItem('patientId', this.pendingPatientId);
        localStorage.setItem('patientFullName', this.pendingPatientName);
        localStorage.setItem('patientPhone', this.pendingPatientPhone);
        this.patientMessage = 'Verified. Redirecting...';
        // clear otp state
        this.expectedOtp = null;
        this.otpPurpose = null;
        this.otpExpiresAt = null;
        this.otpRequested = false;
        this.otpInput = '';
        console.log('[Login] OTP verified, navigating to /patient', { patientId: this.pendingPatientId });
        setTimeout(() => {
          this.router.navigate(['/patient'], { queryParams: { bare: true } });
        }, 600);
      }
    } else {
      this.otpAttempts++;
      if (this.otpAttempts >= this.maxOtpAttempts) {
        this.otpError = 'Too many invalid attempts. Request a new code.';
        // invalidate current OTP
        this.expectedOtp = null;
        this.otpRequested = false;
        this.otpPurpose = null;
        this.otpExpiresAt = null;
      } else {
        this.otpError = `Invalid code. ${this.maxOtpAttempts - this.otpAttempts} attempts left.`;
      }
    }
  }

  async resendOtp() {
    if (!this.pendingPatientPhone) return;
    // enforce cooldown
    const now = Date.now();
    if (this.lastOtpSentAt && now - this.lastOtpSentAt < this.resendCooldownSeconds * 1000) {
      const wait = Math.ceil((this.resendCooldownSeconds * 1000 - (now - this.lastOtpSentAt)) / 1000);
      this.otpError = `Please wait ${wait}s before resending.`;
      return;
    }
    // Only allow resend for patient-login purpose
    if (this.otpPurpose && this.otpPurpose !== 'patient-login') {
      this.otpError = 'OTP cannot be resent for this action.';
      return;
    }
    await this.sendOtpToPhone(this.pendingPatientPhone, 'patient-login');
    this.patientMessage = 'OTP resent.';
  }

  // Normalize Philippine mobile numbers to 11-digit format starting with 09
  private formatPHNumber(raw: any): string {
    if (!raw) return '';
    const str = String(raw).trim();
    const digits = str.replace(/\D/g, '');
    // If starts with 9 and 10 digits, add leading 0
    if (digits.length === 10 && digits.startsWith('9')) return '0' + digits;
    if (digits.length === 11 && digits.startsWith('09')) return digits;
    return '';
  }
}
