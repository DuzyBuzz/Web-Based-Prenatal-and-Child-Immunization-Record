import {  Routes } from '@angular/router';
import { PatientAppointmentsComponentComponent } from './patient-appointments-component/patient-appointments-component.component';
import { PatientComponent } from './patient.component';
import { AskAiComponent } from './ask-ai/ask-ai.component';


export const patientRoutes: Routes = [
  { path: '', component: PatientComponent, children: [
    { path: '', redirectTo: 'appointments', pathMatch: 'full' },
    { path: 'appointments', component: PatientAppointmentsComponentComponent },
    { path: 'ai', component: AskAiComponent }

  ]}
];
