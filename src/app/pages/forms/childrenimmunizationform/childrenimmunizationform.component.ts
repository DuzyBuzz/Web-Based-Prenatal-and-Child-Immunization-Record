import { AuthService } from '../../../auth/auth.service';

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Firestore, collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from '@angular/fire/firestore';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SmsService } from '../../../services/sms.service';

@Component({
  selector: 'app-childrenimmunizationform',
  imports: [CommonModule, FormsModule],
  templateUrl: './childrenimmunizationform.component.html',
  styleUrl: './childrenimmunizationform.component.scss'
})
export class ChildrenimmunizationformComponent implements OnInit {
  formData: any = {}; // Holds all form values
  response = '';

  today = new Date();
  now: Date | undefined;
  showFormError = false;
  childId: string | null = null;
  message: string = '';
  messageType: 'info' | 'success' | 'warning' | 'error' = 'info';
  isLoading = false;
  showModal = false;
  modalMessage = '';
  modalType: 'info' | 'success' | 'warning' | 'error' = 'info';

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private smsService: SmsService
  ) {
    this.setBhwName();
  }

  async ngOnInit(): Promise<void> {
    this.showFormError = true;
    setInterval(() => {
      this.now = new Date();
    }, 1000);

    // Initialize vaccines
    this.formData.vaccines = this.formData.vaccines || {};
    for (const vaccine of this.vaccines) {
      if (!this.formData.vaccines[vaccine.id]) {
        this.formData.vaccines[vaccine.id] = [];
        for (let i = 0; i < vaccine.slots; i++) {
          this.formData.vaccines[vaccine.id][i] = { date: '', sig: '', remarks: '' };
        }
      }
    }

    // Load child record if editing
    this.childId = this.route.snapshot.paramMap.get('childId');
    if (this.childId) {
      const childDocRef = doc(this.firestore, 'immunization', this.childId);
      const childSnap = await getDoc(childDocRef);
      if (childSnap.exists()) {
        this.formData = { ...this.formData, ...childSnap.data() };
        // Re-init vaccines if missing
        this.formData.vaccines = this.formData.vaccines || {};
        for (const vaccine of this.vaccines) {
          if (!this.formData.vaccines[vaccine.id]) {
            this.formData.vaccines[vaccine.id] = [];
            for (let i = 0; i < vaccine.slots; i++) {
              this.formData.vaccines[vaccine.id][i] = { date: '', sig: '', remarks: '' };
            }
          }
        }
      }
    }
  }

  async setBhwName() {
    // Load HCP name into BHW input using logic similar to settings.component.ts
    const user = this.authService.getAuthUser();
    if (!user) return;
    const docRef = doc(this.firestore, user.role === 'admin' ? 'admin' : 'HCP', user.id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      this.formData.bhw = data['name'] || '';
    }
  }

  private showModalMessage(message: string, type: 'info' | 'success' | 'warning' | 'error') {
    this.modalMessage = message;
    this.modalType = type;
    this.showModal = true;
    setTimeout(() => {
      this.showModal = false;
    }, 3000);
  }

  markAllFieldsAsDirty(form: NgForm) {
    Object.values(form.controls).forEach(control => {
      control.markAsDirty();
      control.markAsTouched();
    });
  }
// ✅ Print + Save
async printAndSaveOrUpdateITR(form: NgForm): Promise<void> {
  // Ensure form is passed properly
  if (!form) return;

  // Call save method first
  await this.onSubmit(form);

  // Then print
  window.print();
}


  async onSubmit(form: NgForm) {
    this.showFormError = false;
    if (form && form.invalid) {
      form.control.markAllAsTouched();
      this.showFormError = true;
      return;
    }

    this.isLoading = true;
    try {
      const immunizationCollection = collection(this.firestore, 'immunization');
      const q = query(immunizationCollection, where('name', '==', this.formData.name));
      const querySnapshot = await getDocs(q);

      if (!this.childId && !querySnapshot.empty) {
        this.showModalMessage('A record for this patient already exists. Please use the search feature to find and update the existing record.', 'warning');
        this.isLoading = false;
        return;
      }

      // Prepare metadata and save directly
      this.formData.createdDate = new Date().toISOString();
      this.formData.uid = await this.authService.getCurrentUserId();
      this.formData.nurseName = this.formData.bhw;

      // Save directly without appointment modal
      if (this.childId) {
        await this.updateImmunization(this.childId, this.formData, true);
      } else {
        await this.saveImmunization(this.formData, true);
      }
      this.isLoading = false;
      return;
    } catch (error) {
      this.showModalMessage('An error occurred while saving the record. Please try again.', 'error');
      this.isLoading = false;
      return;
    }
  }



  private async saveImmunization(data: any, showModal = false) {
    if (!data.nurseName) {
      data.nurseName = await this.authService.getCurrentUserName();
    }
    if (!data.uid) {
      data.uid = await this.authService.getCurrentUserId();
    }
    // Use default next Wednesday; appointment can be set later from listing
    data.SecondWednesdayNextMonth = this.getSecondWednesdayNextMonth();
    await addDoc(collection(this.firestore, 'immunization'), data);

    // Send SMS if contact is available (immediate + scheduled reminder)
    try {
      const rawContact = data.contact || data.contactNumber || data.phone || data.motherContact || data.motherPhone;
      const contact = this.formatPHNumber(rawContact);
      if (contact) {
        const patientName = data.name || '';
        const motherName = data.mother || '';
        const nextDate = data.SecondWednesdayNextMonth;
        let immediateMessage = `Good day ${motherName || patientName}, Next Immunization for ${patientName} is on ${nextDate}. Expect reminder on the day of your appointment.`;
        if (immediateMessage.length > 150) immediateMessage = immediateMessage.slice(0, 147) + '...';

        this.smsService.sendSms(contact, immediateMessage).subscribe({
          next: () => console.log('Immediate SMS sent.'),
          error: (err) => console.error('SMS Error:', err)
        });

        const scheduledAt = this.getSecondWednesdayNextMonthAt3AM();
        const scheduledMessage = `Reminder: Immunization for ${patientName} is today (${nextDate}). Please visit the health center.`;
        if (scheduledAt) {
          this.smsService.scheduleSmsReminder(contact, scheduledMessage, scheduledAt).subscribe({
            next: (res: any) => console.log('Scheduled SMS reminder set:', res),
            error: (err: any) => console.error('Scheduled SMS reminder failed:', err)
          });
        }
      }
    } catch (err) {
      console.error('SMS error:', err);
    }

    if (showModal) {
      this.showModalMessage('Immunization record saved successfully!', 'success');
    }
  }

  private async updateImmunization(id: string, data: any, showModal = false) {
    if (!data.nurseName) {
      data.nurseName = await this.authService.getCurrentUserName();
    }
    if (!data.uid) {
      data.uid = await this.authService.getCurrentUserId();
    }
    // Use default next Wednesday; appointment can be set later from listing
    data.SecondWednesdayNextMonth = this.getSecondWednesdayNextMonth();
    const docRef = doc(this.firestore, 'immunization', id);
    await updateDoc(docRef, data);

    // Send SMS on update if contact is available
    try {
      const rawContact = data.contact || data.contactNumber || data.phone || data.motherContact || data.motherPhone;
      const contact = this.formatPHNumber(rawContact);
      if (contact) {
        const patientName = data.name || '';
        const motherName = data.mother || '';
        const nextDate = data.SecondWednesdayNextMonth;
        let immediateMessage = `Good day ${motherName || patientName}, Next Immunization for ${patientName} is on ${nextDate}. Expect reminder on the day of your appointment.`;
        if (immediateMessage.length > 150) immediateMessage = immediateMessage.slice(0, 147) + '...';

        this.smsService.sendSms(contact, immediateMessage).subscribe({
          next: () => console.log('Immediate SMS sent on update.'),
          error: (err) => console.error('SMS Error on update:', err)
        });

        const scheduledAt = this.getSecondWednesdayNextMonthAt3AM();
        const scheduledMessage = `Reminder: Immunization for ${patientName} is today (${nextDate}). Please visit the health center.`;
        if (scheduledAt) {
          this.smsService.scheduleSmsReminder(contact, scheduledMessage, scheduledAt).subscribe({
            next: (res: any) => console.log('Scheduled SMS reminder set on update:', res),
            error: (err: any) => console.error('Scheduled SMS reminder failed on update:', err)
          });
        }
      }
    } catch (err) {
      console.error('SMS error on update:', err);
    }

    if (showModal) {
      this.showModalMessage('Immunization record updated successfully!', 'success');
    }
  }

  // Vaccine definitions
  vaccines = [
    { name: 'BCG', schedule: '(at birth)', slots: 2, id: 'bcg' },
    { name: 'PENTA', schedule: '(6wks,10wks,14wks)', slots: 3, id: 'penta' },
    { name: 'OPV', schedule: '(6wks,10wks,14wks)', slots: 3, id: 'opv' },
    { name: 'PCV', schedule: '(6wks,10wks,14wks)', slots: 2, id: 'pcv' },
    { name: 'IPV', schedule: '(6wks,10wks,14wks)', slots: 2, id: 'ipv' }
  ];

  // Age calculator
  calculateAgeFromBirthday() {
    if (!this.formData.birthday) {
      this.formData.ageYears = null;
      this.formData.ageMonths = null;
      return;
    }
    const today = new Date();
    const birthDate = new Date(this.formData.birthday);
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    const days = today.getDate() - birthDate.getDate();

    if (days < 0) months--;
    if (months < 0) {
      years--;
      months += 12;
    }
    this.formData.ageYears = years >= 0 ? years : 0;
    this.formData.ageMonths = months >= 0 ? months : 0;
  }

  // Get next 2nd Wednesday
  private getSecondWednesdayNextMonth(): string {
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = (now.getMonth() + 1) % 12;
    let count = 0;
    for (let day = 1; day <= 15; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 3) {
        count++;
        if (count === 2) {
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
      }
    }
    return '';
  }

  /**
   * Return scheduled string for 3:00 AM on the second Wednesday of next month in format `YYYY-MM-DD hh:00AM`.
   */
  private getSecondWednesdayNextMonthAt3AM(): string {
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = (now.getMonth() + 1) % 12;
    let count = 0;
    for (let day = 1; day <= 21; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 3) { // Wednesday
        count++;
        if (count === 2) {
          date.setHours(3, 0, 0, 0);
          const y = date.getFullYear();
          const m = (date.getMonth() + 1).toString().padStart(2, '0');
          const d = date.getDate().toString().padStart(2, '0');
          let h = date.getHours();
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12;
          if (h === 0) h = 12;
          const hh = h.toString().padStart(2, '0');
          return `${y}-${m}-${d} ${hh}:00${ampm}`;
        }
      }
    }
    return '';
  }

  // Simple PH phone formatter
  private formatPHNumber(raw: any): string {
    if (!raw) return '';
    const str = String(raw).trim();
    const digits = str.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('9')) return '0' + digits;
    if (digits.length === 11 && digits.startsWith('09')) return digits;
    if (str.startsWith('+63')) return '0' + str.slice(3).replace(/\D/g, '');
    return '';
  }

  // no SMS scheduling helper in the form component
  
}
