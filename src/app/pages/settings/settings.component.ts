import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Firestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from '@angular/fire/firestore';
import { AuthService } from '../../auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  accountForm: FormGroup;
  loading = false;
  userId: string | null = null;
  userRole: 'admin' | 'hcp' | null = null;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private authService: AuthService,
    private router: Router
  ) {
    this.accountForm = this.fb.group({
      username: ['', Validators.required],
      name: ['', Validators.required],
      newPassword: [''],
      confirmPassword: [''],
      currentPassword: ['', Validators.required]
    });
  }

  async ngOnInit() {
    const user = this.authService.getAuthUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.userId = user.id;
    this.userRole = user.role;
    // Fetch current user data
    const docRef = doc(this.firestore, user.role === 'admin' ? 'admin' : 'HCP', this.userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      this.accountForm.patchValue({
        username: data['username'] || '',
        name: data['name'] || ''
      });
    }
  }

  async updateAccount() {
    if (this.accountForm.invalid) return;
    const { username, name, newPassword, confirmPassword, currentPassword } = this.accountForm.value;
    this.loading = true;

    try {
      // 1. Verify current password
      const userCollection = collection(this.firestore, this.userRole === 'admin' ? 'admin' : 'HCP');
      const userQuery = query(
        userCollection,
        where('username', '==', username),
        where('password', '==', currentPassword)
      );
      const userSnapshot = await getDocs(userQuery);
      if (userSnapshot.empty) {
        alert('Current password is incorrect.');
        this.loading = false;
        return;
      }

      // 2. Check new password confirmation
      if (newPassword && newPassword !== confirmPassword) {
        alert('New password and confirmation do not match.');
        this.loading = false;
        return;
      }

      // 3. Update user document
      const userDoc = doc(this.firestore, this.userRole === 'admin' ? 'admin' : 'HCP', this.userId!);
      const updateData: any = { username, name };
      if (newPassword) updateData.password = newPassword;
      await updateDoc(userDoc, updateData);

      alert('Account updated successfully. Please log in again.');
      this.authService.clearAuthUser();
      this.router.navigate(['/login']);
    } catch (error) {
      alert('Error updating account: ' + (error as any).message);
    } finally {
      this.loading = false;
    }
  }
}
