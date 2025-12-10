import {  Routes } from '@angular/router';
import { PatientAppointmentsComponentComponent } from './patient-appointments-component/patient-appointments-component.component';
import { PatientComponent } from './patient.component';
import { AskAiComponent } from './ask-ai/ask-ai.component';
import { PatientInfoFormComponent } from './patient-info-form/patient-info-form.component';
import { PatientRecordsComponent } from './patient-records/patient-records.component';


export const patientRoutes: Routes = [
  { path: '', component: PatientComponent, children: [
    { path: '', redirectTo: 'appointments', pathMatch: 'full' },
    { path: 'appointments', component: PatientAppointmentsComponentComponent },
    { path: 'dr-ai-assist', component: AskAiComponent },
    { path: 'patient-info', component: PatientInfoFormComponent },
    { path: 'records', component: PatientRecordsComponent }

  ]}
];
