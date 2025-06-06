import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment.development'; // Adjust the path as necessary
import { AuthService } from '../../auth/auth.service';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-left-side-panel',
  standalone: false,
  templateUrl: './left-side-panel.component.html',
  styleUrl: './left-side-panel.component.scss'
})
export class LeftSidePanelComponent {
  mobileMenuOpen = false;
    user$: Observable<User | null>; // Observable for user state

  constructor(private http: HttpClient, private authService: AuthService) {
        this.user$ = this.authService.getCurrentUser();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  onSwipeLeft(): void {
    if (this.mobileMenuOpen) {
      this.mobileMenuOpen = false;
    }
  }

  onSwipeRight(): void {
    if (!this.mobileMenuOpen) {
      this.mobileMenuOpen = true;
    }
  }

  sendSms(): void {
const url = 'http://127.0.0.1:5001/prenatal-and-immunization/us-central1/sendSms';

    const body = {
      to: '+639511365191',
      message: 'Hello Maria Belen, this is a reminder of your prenatal appointment scheduled on June 21, 2025 at 9:00 am. Please arrive 10 minutes early.'
    };

    this.http.post(url, body).subscribe({
      next: (response) => {
        alert('SMS sent successfully!');
        console.log('SMS sent:', response);
      },
      error: (error) => {
        alert('Failed to send SMS.');
        console.error('SMS error:', error);
      }
    });
  }


    logout() {
    this.authService.logout();
  }
}
