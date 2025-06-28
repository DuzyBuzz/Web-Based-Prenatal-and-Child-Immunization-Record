import { Component, OnInit } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Firestore, collectionData, collection } from '@angular/fire/firestore';

@Component({
  selector: 'app-appointments',
  standalone: false,
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss'],
})
export class AppointmentsComponent implements OnInit {
  calendarOptions!: CalendarOptions;
  showModal = false;
  selectedDate: Date | null = null;
  selectedEvents: any[] = [];
  allEvents: any[] = [];

  constructor(private firestore: Firestore) {}

  ngOnInit() {
    this.calendarOptions = {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {},
      editable: true,
      selectable: true,
      events: [],
      dateClick: this.onDateClick.bind(this), // <-- Add this
      eventClick: this.onEventClick.bind(this),
    };

    // Fetch and combine events as before, but store in this.allEvents
    const itrCollection = collection(this.firestore, 'itr');
    collectionData(itrCollection, { idField: 'id' }).subscribe((data: any[]) => {
      const itrEvents = data.map(itr => {
        const fullName = `${itr.firstName} ${itr.middleName} ${itr.lastName}`;
        const dateObj = new Date(itr.nextPrenatal);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;
        return {
          title: `${fullName} - Prenatal Checkup`,
          date: formattedDate,
          color: '#34D399',
        };
      });
      this.allEvents = [...this.allEvents, ...itrEvents];
      this.calendarOptions.events = [...this.allEvents];
    });

    const immunizationCollection = collection(this.firestore, 'immunization');
    collectionData(immunizationCollection, { idField: 'id' }).subscribe((data: any[]) => {
      const immunizationEvents = data.map(itr => {
        const fullName = `${itr.name}`;
        const dateObj = new Date(itr.SecondWednesdayNextMonth);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;
        return {
          title: `${fullName} - Immunization`,
          date: formattedDate,
          color: '#1E90FF',
        };
      });
      this.allEvents = [...this.allEvents, ...immunizationEvents];
      this.calendarOptions.events = [...this.allEvents];
    });
  }

  onDateClick(arg: any) {
    const clickedDate = arg.dateStr; // 'YYYY-MM-DD'
    this.selectedDate = new Date(clickedDate);
    this.selectedEvents = this.allEvents.filter(
      event => event.date === clickedDate
    );
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedDate = null;
    this.selectedEvents = [];
  }

  onEventClick(eventInfo: any) {
    // Optional: keep your existing event click logic
  }
}
