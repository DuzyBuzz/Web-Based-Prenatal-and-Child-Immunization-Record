import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';

// Import all required Firebase functions and types
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
  async loginWithPhone() {
    this.showPhoneAuth = true;

    const auth: Auth = getAuth(); // ✅ Ensure it's the correct Auth object

    // Delay to allow UI rendering
    setTimeout(() => {
      if (!this.recaptchaVerifier) {
        this.recaptchaVerifier = new RecaptchaVerifier(
          getAuth(),
          'recaptcha-container',
          {
            size: 'normal',
            callback: (response: any) => {
              console.log('reCAPTCHA solved. Response:', response);
            },
            'expired-callback': () => {
              console.warn('reCAPTCHA expired.');
            }
          },
        );

        // Render reCAPTCHA widget
        this.recaptchaVerifier.render().then((widgetId: number) => {
          console.log('reCAPTCHA rendered with ID:', widgetId);
        });
      }
    });
  }

  // 📤 Send OTP to phone number
  async sendOtp() {
    if (!/^(\+63|0)9\d{9}$/.test(this.phoneNumber)) {
      window.alert('Please enter a valid Philippine phone number.');
      return;
    }
    this.loading = true;
    const auth: Auth = getAuth();

    try {
      if (!this.recaptchaVerifier) throw new Error('reCAPTCHA not initialized');

      this.confirmationResult = await signInWithPhoneNumber(
        auth,
        this.phoneNumber,
        this.recaptchaVerifier
      );

      this.otpSent = true;
    } catch (error) {
      window.alert('Failed to send OTP: ' + (error as any).message);
    } finally {
      this.loading = false;
    }
  }

  // ✅ Verify OTP
  async verifyOtp() {
    if (!this.confirmationResult) return;

    this.loading = true;

    try {
      const result = await this.confirmationResult.confirm(this.otp);
      this.loading = false;

      // Optional: save user info or fetch data from Firestore

      this.router.navigate(['/patient-dashboard']);
    } catch (error) {
      this.loading = false;
      window.alert('Invalid OTP: ' + (error as any).message);
    }
  }

  // 🎯 Role-based redirection
  private redirectUser(email: string | null): void {
    if (!email) return;

    if (email === this.authService.getAdminEmail()) {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/HCP']);
      this.navigating = false;
    }
  }
}
