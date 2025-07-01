import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminComponent } from './admin.component';
import { RouterModule, RouterOutlet } from '@angular/router';
import { adminRoutes } from './admin.routes';
import { AdminLeftSideBarComponent } from "./admin-left-side-bar/admin-left-side-bar.component";
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';

@NgModule({
  declarations: [
    AdminComponent,
    AdminLeftSideBarComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(adminRoutes),
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    FullCalendarModule,
    NgxChartsModule, 
  ],
  exports: [
    AdminComponent,
    AdminLeftSideBarComponent,
  ]
})
export class AdminModule { }
