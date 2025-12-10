import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { SmsService } from '../../services/sms.service';
import { firstValueFrom } from 'rxjs';

// Import Firestore and helpers and use injected Firestore instance (prevents the "outside injection context" warning)
import {
  Firestore,
  getDocs,
  query,
  where,
  collection,
  addDoc,
  serverTimestamp
} from '@angular/fire/firestore';

import { SharedModule } from '../../shared/shared.module';
import { SpinnnerComponent } from '../../shared/core/spinnner/spinnner.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule, SpinnnerComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
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
  generatedOtp: string | null = null; // Client-generated OTP code
  pendingPatientId: string | null = null;
  pendingPatientName = '';
  pendingPatientPhone = '';
  otpSending = false;
  otpError = '';
  // OTP lifecycle
  otpExpiresAt: number | null = null; // epoch ms when OTP becomes invalid
  otpValiditySeconds = 300; // OTP valid for 5 minutes by default
  otpRemainingSeconds: number | null = null;
  private otpTimer: any = null;
  // OTP controls
  otpAttempts = 0;
  maxOtpAttempts = 5;
  lastOtpSentAt: number | null = null; // epoch ms
  resendCooldownSeconds = 30;

  // Helper to expose resend cooldown in UI
  resendCooldownRemaining(): number {
    if (!this.lastOtpSentAt) return 0;
    const elapsed = Date.now() - this.lastOtpSentAt;
    const remaining = Math.ceil((this.resendCooldownSeconds * 1000 - elapsed) / 1000);
    return remaining > 0 ? remaining : 0;
  }

  get isOtpExpired(): boolean {
    return this.otpRemainingSeconds !== null && this.otpRemainingSeconds <= 0;
  }
  // UI: active tab: 'hcp' (default) or 'patient'
  activeTab: 'hcp' | 'patient' = 'hcp';

  // Inject Firestore here (instead of using this.authService['firestore'])
  constructor(
    private authService: AuthService,
    private router: Router,
    private smsService: SmsService,
    private firestore: Firestore
  ) {}

  ngOnDestroy(): void {
    this.clearOtpTimer();
  }

  private clearOtpTimer() {
    if (this.otpTimer) {
      clearInterval(this.otpTimer);
      this.otpTimer = null;
    }
    this.otpRemainingSeconds = null;
  }

  switchTab(tab: 'hcp' | 'patient') {
    this.activeTab = tab;
    // reset some transient patient/otp state when switching away
    if (tab === 'hcp') {
      this.otpRequested = false;
      this.otpInput = '';
      this.pendingPatientId = null;
      this.otpError = '';
      this.generatedOtp = null;
      this.clearOtpTimer();
    }
  }

  ngOnInit() {}

  async loginWithEmail() {
    this.loading = true;
    try {
      // Use injected Firestore instance
      const adminQuery = query(
        collection(this.firestore, 'admin'),
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
        collection(this.firestore, 'HCP'),
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
      const db = this.firestore;
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
          const q2 = query(collection(db, 'patients'), where('fullNameLower', '==', nameLower));
          const snap2 = await getDocs(q2);
          if (!snap2.empty) patientId = snap2.docs[0].id;
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
        const q2 = query(collection(db, 'patients'), where('fullNameLower', '==', nameLower));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
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
        await this.sendOtpToPhone(phoneNorm);
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

  private async sendOtpToPhone(phone: string) {
    try {
      this.otpSending = true;
      const formatted = this.formatPHNumber(phone);
      if (!formatted) {
        this.otpError = 'Invalid phone number.';
        return;
      }

      // Generate a random 6-digit OTP on the client
      this.generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
      console.log('[Login] Generated OTP:', this.generatedOtp);

      // Set expiry time
      this.otpExpiresAt = Date.now() + this.otpValiditySeconds * 1000;
      this.otpRemainingSeconds = Math.ceil((this.otpExpiresAt - Date.now()) / 1000);

      // Start countdown timer
      this.clearOtpTimer();
      this.otpTimer = setInterval(() => {
        const now = Date.now();
        if (this.otpExpiresAt && now <= this.otpExpiresAt) {
          this.otpRemainingSeconds = Math.ceil((this.otpExpiresAt - now) / 1000);
        } else {
          this.otpRemainingSeconds = 0;
          this.clearOtpTimer();
          this.otpError = 'OTP expired. Request a new code.';
          this.otpRequested = false;
          this.generatedOtp = null;
          this.otpExpiresAt = null;
        }
      }, 1000);

      // Prepare friendly OTP message
      const shortName = this.pendingPatientName ? this.pendingPatientName.split(' ')[0] : '';
      const otpMessage = shortName
        ? `Good day ${shortName}, your verification code is ${this.generatedOtp}. Do not share this code.`
        : `Your verification code is ${this.generatedOtp}. Do not share this code.`;

      // Send OTP via SMS
      // IMPORTANT: do not wipe generatedOtp if the SMS send fails (e.g. due to CORS in dev).
      // Keep the OTP valid locally until expiry so user can still verify during dev or network issues.
      try {
        const resp: any = await firstValueFrom(this.smsService.sendSms(formatted, otpMessage));
        console.info('[Login] OTP sent successfully', resp);
        this.lastOtpSentAt = Date.now();
        this.otpAttempts = 0; // Reset verify attempts when a new OTP is issued
        this.otpError = '';
      } catch (err) {
        // Network/CORS/provider error — keep generatedOtp so the user can still use it in dev.
        console.warn('[Login] OTP send error (network/CORS/provider)', err);
        this.otpError = 'Failed to send OTP SMS (network/CORS). OTP is still valid locally until it expires.';
        // Do NOT set generatedOtp = null here — otherwise verifyOtp will see null.
        // Optionally: you can set a flag to prevent assuming SMS actually delivered.
      }
    } catch (err) {
      console.error('OTP send error', err);
      this.otpError = 'Failed to send OTP. Please try resend.';
      // keep generatedOtp handling above
    } finally {
      this.otpSending = false;
    }
  }

  async verifyOtp() {
    console.log('[Login] verifyOtp called', { otpInput: this.otpInput, generatedOtp: this.generatedOtp, otpExpiresAt: this.otpExpiresAt });

    if (!this.otpInput) {
      this.otpError = 'Please enter the OTP.';
      return;
    }

    this.otpError = '';
    const now = Date.now();

    // Prevent brute-force: check attempts
    if (this.otpAttempts >= this.maxOtpAttempts) {
      this.otpError = 'Maximum verification attempts reached. Request a new code.';
      return;
    }

    // Check if OTP has expired
    if (this.otpExpiresAt && now > this.otpExpiresAt) {
      console.info('[Login] OTP expired', { now, otpExpiresAt: this.otpExpiresAt });
      this.otpError = 'OTP expired. Request a new code.';
      this.otpRequested = false;
      this.generatedOtp = null;
      this.otpExpiresAt = null;
      this.clearOtpTimer();
      return;
    }

    // Compare user input with generated OTP
    const trimmedInput = this.otpInput.trim();
    if (trimmedInput === this.generatedOtp) {
      // OTP is correct
      if (this.pendingPatientId) {
        localStorage.setItem('patientId', this.pendingPatientId);
        localStorage.setItem('patientFullName', this.pendingPatientName);
        localStorage.setItem('patientPhone', this.pendingPatientPhone);
        this.patientMessage = 'Verified. Redirecting...';

        // Clear OTP state
        this.generatedOtp = null;
        this.otpExpiresAt = null;
        this.clearOtpTimer();
        this.otpRequested = false;
        this.otpInput = '';
        this.otpAttempts = 0;

        console.log('[Login] OTP verified, navigating to /patient', { patientId: this.pendingPatientId });
        setTimeout(() => {
          this.router.navigate(['/patient'], { queryParams: { bare: true } });
        }, 600);
      }
    } else {
      // OTP is incorrect
      this.otpAttempts++;
      if (this.otpAttempts >= this.maxOtpAttempts) {
        this.otpError = 'Maximum verification attempts reached. Request a new code.';
        this.otpRequested = false;
        this.clearOtpTimer();
        this.generatedOtp = null;
        this.otpExpiresAt = null;
      } else {
        this.otpError = `Incorrect OTP. You have ${this.maxOtpAttempts - this.otpAttempts} attempt(s) left.`;
      }
    }
  }

  async resendOtp() {
    if (!this.pendingPatientPhone) return;

    // Enforce cooldown
    const now = Date.now();
    if (this.lastOtpSentAt && now - this.lastOtpSentAt < this.resendCooldownSeconds * 1000) {
      const wait = Math.ceil((this.resendCooldownSeconds * 1000 - (now - this.lastOtpSentAt)) / 1000);
      this.otpError = `Please wait ${wait}s before resending.`;
      return;
    }

    // Prevent resending when attempts exceeded
    if (this.otpAttempts >= this.maxOtpAttempts) {
      this.otpError = 'Cannot resend: verification attempts exceeded. Request a new session.';
      return;
    }

    await this.sendOtpToPhone(this.pendingPatientPhone);
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
