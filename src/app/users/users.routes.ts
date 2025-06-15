import {  Routes } from '@angular/router';
import { UsersComponent } from './users.component';
import { AppointmentsComponent } from '../pages/appointments/appointments.component';
import { ChildrenComponent } from '../pages/children/children.component';
import { ChildFormComponent } from '../pages/forms/child-form/child-form.component';
import { PrenatalComponent } from '../pages/prenatal/prenatal.component';
import { PrenatalFormComponent } from '../pages/forms/prenatal-form/prenatal-form.component';
import { PrenatalEditFormComponent } from '../pages/forms/prenatal-edit-form/prenatal-edit-form.component';
import { ImmunizationComponent } from '../pages/immunization/immunization.component';
import { ImmunizationFormComponent } from '../pages/forms/immunization-form/immunization-form.component';
import { ChildrenimmunizationformComponent } from '../pages/forms/childrenimmunizationform/childrenimmunizationform.component';
import { IndividualTreatmentRecordComponent } from '../pages/forms/individual-treatment-record/individual-treatment-record.component';
import { ItrRecordsComponent } from '../pages/prenatal/itr-records/itr-records.component';


export const usersRoutes: Routes = [
  { path: '', component: UsersComponent, children: [
    { path: '', redirectTo: 'appointments', pathMatch: 'full' },
    { path: 'appointments', component: AppointmentsComponent },
    { path: 'child-immunization', component: ChildrenComponent },
    { path: 'immunization', component: ImmunizationComponent },
    { path: 'Prenatal-Patients', component: PrenatalComponent },
    { path: 'child-form/:motherId', component: ChildFormComponent },
    { path: 'immunization-form', component: ChildrenimmunizationformComponent },
    { path: 'immunization-form/:motherId', component: ChildrenimmunizationformComponent },
    { path: 'prenatal-form/:motherId', component: PrenatalFormComponent },
    { path: 'prenatal-edit-form/:id/:motherId', component: PrenatalEditFormComponent },
    { path: 'ITR-Edit-Form/:motherId', component: IndividualTreatmentRecordComponent },
    { path: 'ITR-Form', component: IndividualTreatmentRecordComponent },
    { path: 'ITR-Records', component: ItrRecordsComponent },
  ]}
];
