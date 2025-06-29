import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminComponent } from './admin.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { AdminSidebarComponent } from './pages/admin-sidebar/admin-sidebar.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    AdminComponent,
    AdminDashboardComponent,
    AdminSidebarComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    AdminDashboardComponent,
    AdminSidebarComponent
  ]
})
export class AdminModule { }
