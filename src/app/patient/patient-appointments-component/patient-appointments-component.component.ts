import { PatientComponent } from './../patient.component';
import { Component } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
@Component({
  selector: 'app-patient-appointments-component',
  imports: [FullCalendarModule],
  templateUrl: './patient-appointments-component.component.html',
  styleUrl: './patient-appointments-component.component.scss'
})
export class PatientAppointmentsComponentComponent {
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: [
      { title: 'Event 1', date: '2023-10-01' },
      { title: 'Event 2', date: '2023-10-02' }
    ]
  };
}
