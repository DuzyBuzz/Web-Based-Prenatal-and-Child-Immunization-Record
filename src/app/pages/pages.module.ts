import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { DashboardComponent } from './dashboard/dashboard.component';
import { AppointmentsComponent } from './appointments/appointments.component';
import { ChildrenComponent } from './children/children.component';
import { PrenatalComponent } from './prenatal/prenatal.component';
import { ChildFormComponent } from './forms/child-form/child-form.component';
import { MothersPregnancyRecordComponent } from "./prenatal/mothers-pregnancy-record/mothers-pregnancy-record.component";
import { PrenatalEditFormComponent } from "./forms/prenatal-edit-form/prenatal-edit-form.component";
import { SpinnnerComponent } from '../shared/core/spinnner/spinnner.component';
import { SharedModule } from '../shared/shared.module';
import { ImmunizationComponent } from './immunization/immunization.component';
import { LeftSidePanelComponent } from '../shared/left-side-panel/left-side-panel.component';


@NgModule({
  declarations: [

    DashboardComponent,
    AppointmentsComponent,
    ChildrenComponent,
    ChildFormComponent,
    PrenatalComponent,
    ImmunizationComponent

  ],
  imports: [
    CommonModule,
    FormsModule, // ✅ Added FormsModule for ngModel support
    ReactiveFormsModule,
    RouterModule,
    FullCalendarModule,
    NgxChartsModule,
    MothersPregnancyRecordComponent,
    PrenatalEditFormComponent,
    SpinnnerComponent,
    SharedModule
],
  exports: [
    DashboardComponent,
    AppointmentsComponent,
    NgxChartsModule,
    ChildrenComponent,
    ChildFormComponent,
    PrenatalComponent,
    ImmunizationComponent

  ],
})
export class PagesModule {}
