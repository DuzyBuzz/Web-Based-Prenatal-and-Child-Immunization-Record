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


export const usersRoutes: Routes = [
  { path: '', component: UsersComponent, children: [
    { path: '', redirectTo: 'appointments', pathMatch: 'full' },
    { path: 'appointments', component: AppointmentsComponent },
    { path: 'child-immunization', component: ChildrenComponent },
    { path: 'immunization', component: ImmunizationComponent },
    { path: 'prenatal', component: PrenatalComponent },
    { path: 'child-form', component: ChildFormComponent },
    { path: 'immunization-form', component: ImmunizationFormComponent },
    {path: 'prenatal-form', component: PrenatalFormComponent},
    { path: 'prenatal-edit-form/:id', component: PrenatalEditFormComponent },
    {path: 'childrenform', component: ChildrenimmunizationformComponent},

  ]}
];
