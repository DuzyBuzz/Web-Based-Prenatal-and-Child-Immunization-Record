import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';

import {
  getAuth,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  User,
  Auth
} from '@angular/fire/auth';

import { SharedModule } from '../../shared/shared.module';
import { SpinnnerComponent } from '../../shared/core/spinnner/spinnner.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SharedModule, SpinnnerComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  // Form data
  email = '';
  password = '';
  phoneNumber = '';
  otp = '';

  // State management
  loading = false;
  navigating = false;
  spinnerMessage = 'Preparing your dashboard...';
  showPhoneAuth = false;
  otpSent = false;
  showPhoneModal = false;
  showRecaptcha = false;

  // Firebase related
  recaptchaVerifier?: RecaptchaVerifier;
  confirmationResult?: ConfirmationResult;

  constructor(private authService: AuthService, private router: Router) {}

  // 🔐 Google Sign-In
  loginWithGoogle() {
    this.loading = true;
    this.authService.googleSignIn()
      .then(async (user: User) => {
        this.loading = false;
        const isComplete = await this.authService.isProfileComplete(user.uid);
        this.navigating = true;
        if (!isComplete) {
          this.router.navigate(['/auth/setup-user']);
        } else {
          this.redirectUser(user.email);
        }
      })
      .catch(errorMessage => {
        this.loading = false;
        window.alert(errorMessage);
      });
  }

  // 📱 Show phone input + render reCAPTCHA
  loginWithPhone() {
    this.showPhoneModal = true;
    this.phoneNumber = '';
    this.otp = '';
    this.otpSent = false;
    this.showRecaptcha = false;
    this.recaptchaVerifier = undefined;
  }

  closePhoneModal() {
    this.showPhoneModal = false;
    this.otpSent = false;
    this.showRecaptcha = false;
    this.phoneNumber = '';
    this.otp = '';
    this.recaptchaVerifier = undefined;
  }

  onPhoneInput() {
    // Remove non-digits and limit to 10 digits
    this.phoneNumber = this.phoneNumber.replace(/\D/g, '').slice(0, 10);
  }

  isPhoneValid(): boolean {
    return /^\d{10}$/.test(this.phoneNumber);
  }

  // 📤 Send OTP to phone number
  async sendOtp() {
    if (!this.isPhoneValid()) {
      window.alert('Please enter a valid Philippine phone number.');
      return;
    }
    this.loading = true;
    this.showRecaptcha = true;

    setTimeout(async () => {
      if (!this.recaptchaVerifier) {
        this.recaptchaVerifier = new RecaptchaVerifier(
          getAuth(),
          'recaptcha-container',
          {
            size: 'normal',
            callback: async (response: any) => {
              // reCAPTCHA solved, proceed to send OTP
              try {
                const fullPhone = '+63' + this.phoneNumber;
                const auth: Auth = getAuth();
                this.confirmationResult = await signInWithPhoneNumber(
                  auth,
                  fullPhone,
                  this.recaptchaVerifier!
                );
                this.otpSent = true;
                this.showRecaptcha = false;
              } catch (error) {
                window.alert('Failed to send OTP: ' + (error as any).message);
              } finally {
                this.loading = false;
              }
            },
            'expired-callback': () => {
              window.alert('reCAPTCHA expired. Please try again.');
              this.loading = false;
              this.showRecaptcha = false;
            }
          }
        );
        await this.recaptchaVerifier.render();
      }
    });
  }

  // ✅ Verify OTP
  async verifyOtp() {
    if (!this.confirmationResult) return;
    this.loading = true;
    try {
      await this.confirmationResult.confirm(this.otp);
      this.loading = false;
      this.closePhoneModal();
      this.router.navigate(['/patient']);
    } catch (error) {
      this.loading = false;
      window.alert('Invalid OTP: ' + (error as any).message);
    }
  }

  // 🎯 Role-based redirection
  private redirectUser(email: string | null): void {
    if (!email) return;

    // Only admins and HCPs use Google login, patients use phone login (handled in verifyOtp)
    if (email === this.authService.getAdminEmail()) {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/HCP']);
      this.navigating = false;
    }
  }
}
