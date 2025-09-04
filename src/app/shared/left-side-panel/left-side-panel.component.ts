import { Component, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
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
export class LeftSidePanelComponent implements OnInit {
  @Input() blur = false;
  mobileMenuOpen = false;
  user$: Observable<User | null>; // Observable for user state
  name: string | null = null;
  userName: string | null = null; // for mobile sidebar

  constructor(private http: HttpClient, private authService: AuthService, private auth: Auth, private firestore: Firestore) {
    this.user$ = this.authService.getCurrentUser();
  }

  async ngOnInit() {
    const user = this.auth.currentUser;
    if (user) {
      // Fetch from HCP collection, field is 'name'
      const docRef = doc(this.firestore, 'HCP', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        this.name = data['name'] || null;
        this.userName = data['name'] || null;
      }
    }

    this.authService.getCurrentUserName().then(name => {
      this.name = name;
    });
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
    if (confirm('Are you sure you want to sign out?')) {
      this.authService.logout();
    }
  }
}
