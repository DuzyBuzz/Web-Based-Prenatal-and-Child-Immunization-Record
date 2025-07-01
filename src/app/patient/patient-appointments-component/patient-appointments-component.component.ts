import { Component, OnInit } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { AuthService } from '../../auth/auth.service';
import { CalendarApi, EventApi } from '@fullcalendar/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-patient-appointments-component',
  imports: [FullCalendarModule, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './patient-appointments-component.component.html',
  styleUrl: './patient-appointments-component.component.scss'
})
export class PatientAppointmentsComponentComponent implements OnInit {
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: [],
    dateClick: this.handleDateClick.bind(this),
    eventClick: this.handleEventClick.bind(this)
  };

  selectedDateEvents: any[] = [];
  showEventsModal = false;
  selectedDate: string = '';

  constructor(private authService: AuthService) {}

  async ngOnInit() {
    this.authService.getCurrentUser().subscribe(async user => {
      if (!user || !user.phoneNumber) {
        this.calendarOptions.events = [];
        return;
      }

      // Convert '+639...' to '09...'
      let contactNumber = user.phoneNumber;
      if (contactNumber.startsWith('+63')) {
        contactNumber = '0' + contactNumber.slice(3);
      }

      const db = getFirestore();

      // Query immunization collection
      const immunizationQuery = query(
        collection(db, 'immunization'),
        where('contact', '==', contactNumber)
      );
      const immunizationSnapshot = await getDocs(immunizationQuery);
      const immunizationEvents = immunizationSnapshot.docs.map(doc => {
        const data = doc.data();
        const dateObj = new Date(data['SecondWednesdayNextMonth']);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;
        return {
          title: `${data['name']} - Immunization`,
          date: formattedDate,
          color: '#1E90FF',
          type: 'Immunization',
          name: data['name'],
          contact: data['contact'],
          raw: data
        };
      });

      // Query itr collection
      const itrQuery = query(
        collection(db, 'itr'),
        where('contact', '==', contactNumber)
      );
      const itrSnapshot = await getDocs(itrQuery);
      const itrEvents = itrSnapshot.docs.map(doc => {
        const data = doc.data();
        const dateObj = new Date(data['nextPrenatal']);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;
        const fullName = `${data['firstName']} ${data['middleName']} ${data['lastName']}`;
        return {
          title: `${fullName} - Prenatal Checkup`,
          date: formattedDate,
          color: '#34D399',
          type: 'Prenatal',
          name: fullName,
          contact: data['contact'],
          raw: data
        };
      });

      // Combine and set events
      this.calendarOptions = {
        ...this.calendarOptions,
        events: [...immunizationEvents, ...itrEvents]
      };
    });
  }

  handleDateClick(arg: any) {
    // Get all events for the clicked date
    const clickedDate = arg.dateStr;
    const allEvents = (this.calendarOptions.events as any[]) || [];
    this.selectedDateEvents = allEvents.filter(ev => ev.date === clickedDate);
    this.selectedDate = clickedDate;
    this.showEventsModal = this.selectedDateEvents.length > 0;
  }

  handleEventClick(arg: any) {
    // Show all events for the clicked date, not just the clicked event
    const clickedDate = arg.event.startStr;
    const allEvents = (this.calendarOptions.events as any[]) || [];
    this.selectedDateEvents = allEvents.filter(ev => ev.date === clickedDate);
    this.selectedDate = clickedDate;
    this.showEventsModal = this.selectedDateEvents.length > 0;
  }

  closeModal() {
    this.showEventsModal = false;
    this.selectedDateEvents = [];
  }
}
