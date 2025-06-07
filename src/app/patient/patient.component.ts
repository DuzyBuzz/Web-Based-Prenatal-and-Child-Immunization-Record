import { Component } from '@angular/core';
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
@Component({
  selector: 'app-patient',
standalone: false,
  templateUrl: './patient.component.html',
  styleUrl: './patient.component.scss'
})
export class PatientComponent {
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

    calendarOptions!: CalendarOptions;

  ngOnInit() {
    this.calendarOptions = {
      plugins: [dayGridPlugin, timeGridPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {
      },
      editable: true,
      selectable: true,
      events: [
        { title: 'Prenatal Checkup', date: '2025-04-05', color: '#34D399' },
        { title: '1st Hepatitis B Vaccine', date: '2025-04-10', color: '#F87171' },
        { title: 'BCG Vaccine', date: '2025-04-15', color: '#60A5FA' },
        { title: 'Polio Vaccine', date: '2025-04-20', color: '#FBBF24' },
        { title: 'MMR Vaccine', date: '2025-05-01', color: '#A78BFA' },
      ],
      eventClick: this.onEventClick.bind(this),
    };
  }

  onEventClick(eventInfo: any) {
    alert(`Appointment: ${eventInfo.event.title}\nDate: ${eventInfo.event.start.toISOString().split('T')[0]}`);
  }


    logout() {
    this.authService.logout();
  }
}
