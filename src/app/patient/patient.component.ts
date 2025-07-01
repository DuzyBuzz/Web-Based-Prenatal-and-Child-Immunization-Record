import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment'; // Adjust the path as necessary
import { AuthService } from '../auth/auth.service';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../shared/footer/footer.component';
import { SharedModule } from '../shared/shared.module';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { RouterOutlet } from '@angular/router';
import { collection, getFirestore, query, where, getDocs } from 'firebase/firestore';

export interface Appointment {
  name: string;
  appointmentName: string;
  contactNumber: string;
  // add other fields if needed
}

@Component({
  selector: 'app-patient',
  standalone: false,
  templateUrl: './patient.component.html',
  styleUrl: './patient.component.scss'
})
export class PatientComponent implements OnInit {
  mobileMenuOpen = false;
  showChat = false; // <-- Add this line
  user$: Observable<User | null>; // Observable for user state
  appointments: Appointment[] = [];
  showDot = true;
  phoneNumber: string | null = null;

  constructor(private http: HttpClient, private authService: AuthService) {
    this.user$ = this.authService.getCurrentUser();
  }

  hideDot() {
    this.showDot = false;
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

  calendarOptions!: CalendarOptions;

  async ngOnInit() {
    this.user$.subscribe(async user => {
      if (user && user.phoneNumber) {
        // Remove '+63' if your Firestore stores numbers as '09...' instead of '+639...'
        let contactNumber = user.phoneNumber;
        if (contactNumber.startsWith('+63')) {
          contactNumber = '0' + contactNumber.slice(3);
        }

        const db = getFirestore();
        const q = query(
          collection(db, 'appointment'), // Change to your actual collection name if needed
          where('contactNumber', '==', contactNumber)
        );
        const querySnapshot = await getDocs(q);
        this.appointments = querySnapshot.docs.map(doc => doc.data() as Appointment);
      } else {
        this.appointments = [];
      }
    });
    this.authService.getCurrentUser().subscribe(user => {
      this.phoneNumber = user?.phoneNumber ?? null;
    });
  }

  onEventClick(eventInfo: any) {
    alert(`Appointment: ${eventInfo.event.title}\nDate: ${eventInfo.event.start.toISOString().split('T')[0]}`);
  }

  logout() {
    this.authService.logout();
  }
}
