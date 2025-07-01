import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { AdminUsersComponent } from './pages/admin-users/admin-users.component';
import { AdminReportsComponent } from './pages/admin-reports/admin-reports.component';

export const adminRoutes: Routes = [
  { path: '', component: AdminComponent, children: [
    { path: '', redirectTo: 'Dashboard', pathMatch: 'full' },
    { path: 'Dashboard', component: AdminDashboardComponent },
    { path: 'Users', component: AdminUsersComponent },
    { path: 'Reports', component: AdminReportsComponent }
  ] }
];