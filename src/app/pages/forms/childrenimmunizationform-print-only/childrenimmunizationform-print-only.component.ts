import { AuthService } from '../../../auth/auth.service';
import { SmsService } from './../../../services/sms.service';
import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit } from '@angular/core';
import { Firestore, collection, addDoc, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-childrenimmunizationform-print-only',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './childrenimmunizationform-print-only.component.html',
  styleUrl: './childrenimmunizationform-print-only.component.scss'
})
export class ChildrenimmunizationformPrintOnlyComponent implements OnInit{
  formData: any = {}; // Holds all form values
  response = '';
  today = new Date();
  now: Date | undefined; 
  showFormError = false;
  childId: string | null = null;

  constructor(
    private firestore: Firestore,
    private smsService: SmsService,
    private authService: AuthService, // Inject AuthService
    private router: Router, // Inject Router for navigation
    private route: ActivatedRoute
  ) {
    this.setBhwName();
  }
  async ngOnInit(): Promise<void> {
    setInterval(() => {
      this.now = new Date();
    }, 1000);

    // Initialize vaccines structure
    this.formData.vaccines = this.formData.vaccines || {};
    for (const vaccine of this.vaccines) {
      if (!this.formData.vaccines[vaccine.id]) {
        this.formData.vaccines[vaccine.id] = [];
        for (let i = 0; i < vaccine.slots; i++) {
          this.formData.vaccines[vaccine.id][i] = { date: '', sig: '', remarks: '' };
        }
      }
    }

    this.childId = this.route.snapshot.paramMap.get('childId');
    if (this.childId) {
      const childDocRef = doc(this.firestore, 'immunization', this.childId);
      const childSnap = await getDoc(childDocRef);
      if (childSnap.exists()) {
        this.formData = { ...this.formData, ...childSnap.data() };
        // Re-initialize vaccines if missing
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
    const name = await this.authService.getCurrentUserName();
    if (name) {
      this.formData.bhw = name;
    }
  }

  async printAndSaveOrUpdateITR(form?: any) {
    this.showFormError = false;
    if (form && form.invalid) {
      form.control.markAllAsTouched();
      this.showFormError = true;
      return;
    }

    let printed = false;
    const afterPrintHandler = async () => {
      if (printed) {
        if (this.childId) {
          await this.updateImmunization(this.childId, this.formData);
        } else {
          await this.saveImmunization(this.formData);
        }
        window.removeEventListener('afterprint', afterPrintHandler);
      }
    };

    window.addEventListener('afterprint', afterPrintHandler);
    printed = true;
    window.print();
  }

  // Update your onSubmit to NOT print, just save
  async onSubmit(form: any) {
    this.showFormError = false;
    if (form && form.invalid) {
      form.control.markAllAsTouched(); // Touch all fields
      this.showFormError = true;
      return;
    }

    try {
      // Get current user ID and name
      const uid = await this.authService.getCurrentUserId();
      const nurseName = await this.authService.getCurrentUserName();

      // Add fields to the record
      this.formData.SecondWednesdayNextMonth = this.getSecondWednesdayNextMonth();
      this.formData.createdDate = new Date().toISOString();
      this.formData.uid = uid;
      this.formData.nurseName = nurseName;

      await addDoc(collection(this.firestore, 'immunization'), this.formData);

      // Compose SMS
      
      const name = this.formData.name || 'Parent/Guardian';
      const rawContact = this.formData.contact;
      const contact = this.formatPHNumber(rawContact);
      const nextImmunization = this.getSecondWednesdayNextMonth();
      const message =
        `Good day ${this.formData.mother}, ` +
        `Next Immunization for ${this.formData.name} is on ${nextImmunization}. ` +
        `Expect reminder on the day of your appointment.`;

      // Send SMS if contact is valid after formatting
      if (contact) {
        this.smsService.sendSms(contact, message).subscribe({
          next: (res: any) => this.response = `Success: ${JSON.stringify(res)}`,
          error: (err: { error: any; }) => this.response = `Error: ${JSON.stringify(err.error)}`
        });

        // Schedule reminder for second Wednesday next month at 3AM
        const scheduledAt = this.getSecondWednesdayNextMonthAt3AM();
        if (scheduledAt) {
          this.smsService.scheduleSmsReminder(contact, message, scheduledAt).subscribe({
            next: (res: any) => console.log('Scheduled reminder response', res),
            error: (err: any) => console.warn('Failed to schedule reminder', err)
          });
        }
      }
      

      alert('Immunization record saved!');
      this.router.navigate(['/HCP/Immunization-Patients']);
    } catch (error) {
      alert('Error saving record: ' + (error as any).message);
    }
  }

  private async saveImmunization(data: any) {
    // Add your save logic here (addDoc)
    await addDoc(collection(this.firestore, 'immunization'), data);
    alert('Immunization record saved!');
    this.router.navigate(['/HCP/Immunization-Patients']);
  }

  private async updateImmunization(id: string, data: any) {
    // Add your update logic here (updateDoc)
    const docRef = doc(this.firestore, 'immunization', id);
    await updateDoc(docRef, data);
    alert('Immunization record updated!');
    this.router.navigate(['/HCP/Immunization-Patients']);
  }

  // Define your vaccines
vaccines = [
  {
    name: 'BCG',
    schedule: '(at birth)',
    slots: 2,
    id: 'bcg'
  },
  {
    name: 'PENTA',
    schedule: '(6wks,10 wks ,14 wks)',
    slots: 3,
    id: 'penta'
  },
  {
    name: 'OPV',
    schedule: '(6wks,10 wks ,14 wks)',
    slots: 3,
    id: 'opv'
  },
  {
    name: 'PCV',
    schedule: '(6wks,10 wks ,14 wks)',
    slots: 2,
    id: 'pcv'
  },
  {
    name: 'IPV',
    schedule: '(6wks,10 wks ,14 wks)',
    slots: 2,
    id: 'ipv'
  }
];
  send() {
    const phoneNumber = this.formatPHNumber(this.formData.contact);
    const message = '';
    if (!phoneNumber) {
      this.response = 'Error: invalid phone number';
      return;
    }
    this.smsService.sendSms(phoneNumber, message).subscribe({
      next: (res: any) => this.response = `Success: ${JSON.stringify(res)}`,
      error: (err: { error: any; }) => this.response = `Error: ${JSON.stringify(err.error)}`
    });
  }

  private getSecondWednesdayNextMonth(): string {
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = (now.getMonth() + 1) % 12;
    let count = 0;
    for (let day = 1; day <= 15; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 3) { // 3 = Wednesday
        count++;
        if (count === 2) {
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
      }
    }
    return '';
  }

  /**
   * Return ISO string for 3:00 AM on the second Wednesday of next month.
   * Returns empty string on failure.
   */
  private getSecondWednesdayNextMonthAt3AM(): string {
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = (now.getMonth() + 1) % 12; // next month
    let count = 0;
    for (let day = 1; day <= 21; day++) {
      const date = new Date(year, month, day, 3, 0, 0, 0);
      if (date.getDay() === 3) { // 3 = Wednesday
        count++;
        if (count === 2) {
          return date.toISOString();
        }
      }
    }
    return '';
  }

  /**
   * Normalize Philippine phone numbers to 11-digit starting with '09'.
   * Returns the formatted number or empty string if invalid.
   */
  private formatPHNumber(raw: any): string {
    if (!raw) return '';
    let s = String(raw).replace(/\s|\-|\(|\)/g, '');
    // Remove leading +63 and replace with 0
    if (s.startsWith('+63')) s = '0' + s.slice(3);
    if (s.startsWith('63') && s.length === 11) s = '0' + s.slice(2);
    // If starts with 9 and length 10, add leading 0
    if (/^9\d{9}$/.test(s)) s = '0' + s;
    if (/^0\d{10}$/.test(s)) return s;
    return '';
  }

  printSection() {
    window.print();
  }
}
