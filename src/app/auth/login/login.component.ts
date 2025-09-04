import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { getDocs, query, where, collection } from '@angular/fire/firestore';
import { SharedModule } from '../../shared/shared.module';
import { SpinnnerComponent } from '../../shared/core/spinnner/spinnner.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule, SpinnnerComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  // Form data
  username = '';
  password = '';

  // State management
  loading = false;
  navigating = false;
  spinnerMessage = 'Preparing your dashboard...';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {}

  async loginWithEmail() {
    this.loading = true;
    try {
      // Check admin collection
      const adminQuery = query(
        collection(this.authService['firestore'], 'admin'),
        where('username', '==', this.username),
        where('password', '==', this.password)
      );
      const adminSnapshot = await getDocs(adminQuery);

      if (!adminSnapshot.empty) {
        // Save admin auth details
        const adminData = adminSnapshot.docs[0].data();
        this.authService.setAuthUser({
          id: adminSnapshot.docs[0].id,
          username: adminData['username'],
          name: adminData['name'],
          role: 'admin',
        });
        this.router.navigate(['/Admin']);
        return;
      }

      // Check HCP collection
      const hcpQuery = query(
        collection(this.authService['firestore'], 'HCP'),
        where('username', '==', this.username),
        where('password', '==', this.password)
      );
      const hcpSnapshot = await getDocs(hcpQuery);

      if (!hcpSnapshot.empty) {
        // Save HCP auth details
        const hcpData = hcpSnapshot.docs[0].data();
        this.authService.setAuthUser({
          id: hcpSnapshot.docs[0].id,
          username: hcpData['username'],
          name: hcpData['name'],
          role: 'hcp',
        });
        this.router.navigate(['/HCP']);
        return;
      }

      window.alert('Invalid username or password.');
    } catch (error) {
      window.alert('Login error: ' + (error as any).message);
    } finally {
      this.loading = false;
    }
  }
}
