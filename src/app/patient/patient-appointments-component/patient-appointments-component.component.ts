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
      // Determine contact number: prefer authenticated user phone, fallback to localStorage patientPhone
      let contactNumber: string | null = null;
      if (user && user.phoneNumber) {
        contactNumber = user.phoneNumber;
        if (contactNumber.startsWith('+63')) {
          contactNumber = '0' + contactNumber.slice(3);
        }
      } else {
        const storedPhone = localStorage.getItem('patientPhone');
        if (storedPhone) contactNumber = storedPhone;
      }

      if (!contactNumber) {
        this.calendarOptions = { ...this.calendarOptions, events: [] };
        return;
      }

      const db = getFirestore();

      // Query immunization collection and safely map dates
      const immunizationQuery = query(collection(db, 'immunization'), where('contact', '==', contactNumber));
      const immunizationSnapshot = await getDocs(immunizationQuery);
      const immunizationEvents = immunizationSnapshot.docs
        .map(doc => {
          const data = doc.data();
          const rawDate = data['SecondWednesdayNextMonth'];
          if (!rawDate) return null;
          const dateObj = new Date(rawDate);
          if (isNaN(dateObj.getTime())) return null;
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          const formattedDate = `${yyyy}-${mm}-${dd}`;
          return {
            title: `${data['name'] || 'Patient'} - Immunization`,
            date: formattedDate,
            color: '#1E90FF',
            type: 'Immunization',
            name: data['name'],
            contact: data['contact'],
            raw: data
          };
        })
        .filter(Boolean) as any[];

      // Query itr collection and safely map dates
      const itrQuery = query(collection(db, 'itr'), where('contact', '==', contactNumber));
      const itrSnapshot = await getDocs(itrQuery);
      const itrEvents = itrSnapshot.docs
        .map(doc => {
          const data = doc.data();
          const rawDate = data['nextPrenatal'];
          if (!rawDate) return null;
          const dateObj = new Date(rawDate);
          if (isNaN(dateObj.getTime())) return null;
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          const formattedDate = `${yyyy}-${mm}-${dd}`;
          const fullName = `${data['firstName'] || ''} ${data['middleName'] || ''} ${data['lastName'] || ''}`.trim();
          return {
            title: `${fullName || 'Patient'} - Prenatal Checkup`,
            date: formattedDate,
            color: '#34D399',
            type: 'Prenatal',
            name: fullName || data['name'],
            contact: data['contact'],
            raw: data
          };
        })
        .filter(Boolean) as any[];

      // Combine and set events
      let allEvents: any[] = [...immunizationEvents, ...itrEvents];

      // Also query by patientId if available (for lightweight patient session)
      const patientId = localStorage.getItem('patientId');
      if (patientId) {
        try {
          // Query immunization by patientId
          const imByPatientQuery = query(collection(db, 'immunization'), where('patientId', '==', patientId));
          const imByPatientSnap = await getDocs(imByPatientQuery);
          const imByPatientEvents = imByPatientSnap.docs
            .map(doc => {
              const data = doc.data();
              const rawDate = data['SecondWednesdayNextMonth'];
              if (!rawDate) return null;
              const dateObj = new Date(rawDate);
              if (isNaN(dateObj.getTime())) return null;
              const yyyy = dateObj.getFullYear();
              const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
              const dd = String(dateObj.getDate()).padStart(2, '0');
              const formattedDate = `${yyyy}-${mm}-${dd}`;
              return {
                title: `${data['name'] || 'Patient'} - Immunization (Record)`,
                date: formattedDate,
                color: '#1E90FF',
                type: 'Immunization',
                name: data['name'],
                raw: data
              };
            })
            .filter(Boolean) as any[];

          // Query itr by patientId
          const itrByPatientQuery = query(collection(db, 'itr'), where('patientId', '==', patientId));
          const itrByPatientSnap = await getDocs(itrByPatientQuery);
          const itrByPatientEvents = itrByPatientSnap.docs
            .map(doc => {
              const data = doc.data();
              const rawDate = data['nextPrenatal'];
              if (!rawDate) return null;
              const dateObj = new Date(rawDate);
              if (isNaN(dateObj.getTime())) return null;
              const yyyy = dateObj.getFullYear();
              const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
              const dd = String(dateObj.getDate()).padStart(2, '0');
              const formattedDate = `${yyyy}-${mm}-${dd}`;
              const fullName = `${data['firstName'] || ''} ${data['middleName'] || ''} ${data['lastName'] || ''}`.trim();
              return {
                title: `${fullName || 'Patient'} - Prenatal (Record)`,
                date: formattedDate,
                color: '#34D399',
                type: 'Prenatal',
                name: fullName || data['name'],
                raw: data
              };
            })
            .filter(Boolean) as any[];

          // Merge and deduplicate events by date and title
          allEvents = [...allEvents, ...imByPatientEvents, ...itrByPatientEvents];
          const uniqueEvents = Array.from(
            new Map(allEvents.map(e => [`${e.date}-${e.title}`, e])).values()
          );
          allEvents = uniqueEvents;
        } catch (err) {
          console.error('Error loading records by patientId', err);
        }
      }

      this.calendarOptions = {
        ...this.calendarOptions,
        events: allEvents
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
