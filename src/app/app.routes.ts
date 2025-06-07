import { Routes } from '@angular/router';
import { SetupUserComponent } from './auth/login/setup-user/setup-user.component';
import { PatientComponent } from './patient/patient.component';
export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'auth', loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes) },
  { path: 'HCP', loadChildren: () => import('./users/users.module').then(m => m.UsersModule)},
  { path: 'admin', loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule) },
  { path: 'patient', loadChildren: () => import('./patient/patient.module').then(m => m.PatientModule) },
  { path: 'setup-user', component: SetupUserComponent},
  { path: '**', redirectTo: 'auth/login' }
];
