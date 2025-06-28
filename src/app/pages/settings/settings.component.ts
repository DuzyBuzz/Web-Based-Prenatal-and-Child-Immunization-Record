import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  settingsForm: FormGroup;
  uid: string | null = null;
  loading = false;
  userEmail: string = '';
  userPhotoUrl: string = ''; // <-- Add this

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private firestore: Firestore
  ) {
    this.settingsForm = this.fb.group({
      notificationEmail: [''],
      notificationSMS: [false],
      calendarView: ['month'],
      theme: ['light'],
      enableReminders: [true]
    });
  }

  async ngOnInit() {
    this.loading = true;

    // Get user from Auth
    const user = await firstValueFrom(this.authService.getCurrentUser());
    this.userEmail = user?.email ?? '';
    this.userPhotoUrl = user?.photoURL ?? ''; // <-- Set photoURL

    this.uid = user?.uid ?? null;
    if (this.uid) {
      const userDocRef = doc(this.firestore, 'users', this.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        this.settingsForm.patchValue({
          notificationEmail: this.userEmail, // Always use Auth email
          notificationSMS: data['notificationSMS'] ?? false,
          calendarView: data['calendarView'] || 'month',
          theme: data['theme'] || 'light',
          enableReminders: data['enableReminders'] ?? true
        });
      } else {
        // If no doc, still set the email
        this.settingsForm.patchValue({
          notificationEmail: this.userEmail
        });
      }
    }
    this.loading = false;
  }

  async saveSettings() {
    if (!this.uid) return;
    this.loading = true;
    const userDocRef = doc(this.firestore, 'users', this.uid);
    await setDoc(userDocRef, {
      ...this.settingsForm.value
    }, { merge: true });
    this.loading = false;
    alert('Settings saved and linked to your Google account!');
  }
}
