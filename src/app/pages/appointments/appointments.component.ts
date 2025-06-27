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

  constructor(private firestore: Firestore) {}

  ngOnInit() {
    this.calendarOptions = {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {
      },
      editable: true,
      selectable: true,
      events: [],
      eventClick: this.onEventClick.bind(this),
    };

    // Fetch ITR collection and map to events
    const itrCollection = collection(this.firestore, 'itr');
    collectionData(itrCollection, { idField: 'id' }).subscribe((data: any[]) => {
      this.calendarOptions.events = data.map(itr => {
        const fullName = `${itr.firstName} ${itr.middleName} ${itr.lastName}`;
        console.log('Full Name:', fullName, '| Next Prenatal:', itr.nextPrenatal);

        // Convert "July 8, 2025" to "2025-07-08"
        const dateObj = new Date(itr.nextPrenatal);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;

        return {
          title: `${fullName} - Prenatal Checkup`, // Show full name and label
          date: formattedDate,                  // Make sure this is in YYYY-MM-DD format
          color: '#34D399',
        };
      });
    });
  }

  onEventClick(eventInfo: any) {
    alert(`Appointment: ${eventInfo.event.title}\nDate: ${eventInfo.event.start.toISOString().split('T')[0]}`);
  }
}
