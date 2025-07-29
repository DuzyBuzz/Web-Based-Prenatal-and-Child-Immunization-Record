import { AuthService } from '../../../auth/auth.service';
import { SmsService } from './../../../services/sms.service';
import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit } from '@angular/core';
import { Firestore, collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from '@angular/fire/firestore';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';

@Component(
  {
  selector: 'app-childrenimmunizationform',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './childrenimmunizationform.component.html',
  styleUrl: './childrenimmunizationform.component.scss'
})
export class ChildrenimmunizationformComponent implements OnInit {
  formData: any = {}; // Holds all form values
  response = '';

  // Allow only numeric input for contact number field
  allowOnlyNumbers(event: KeyboardEvent): void {
    const charCode = event.which ? event.which : event.keyCode;
    // Allow only numbers (0-9)
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  today = new Date();
  now: Date | undefined;
  showFormError = false;
  childId: string | null = null;
  message: string = '';
  messageType: 'info' | 'success' | 'warning' | 'error' = 'info';
  isLoading = false; // Add loading state
  showModal = false;
  modalMessage = '';
  modalType: 'info' | 'success' | 'warning' | 'error' = 'info';

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
    this.showFormError = true; // Mark all required fields as red on load
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

  private showModalMessage(message: string, type: 'info' | 'success' | 'warning' | 'error') {
    this.modalMessage = message;
    this.modalType = type;
    this.showModal = true;
    setTimeout(() => {
      this.showModal = false;
      this.router.navigate(['/HCP/Immunization-Patients']);
    }, 3000);
  }

  markAllFieldsAsDirty(form: NgForm) {
    Object.values(form.controls).forEach(control => {
      control.markAsDirty();
      control.markAsTouched();
    });
  }

  async printAndSaveOrUpdateITR(form: NgForm) {
    this.markAllFieldsAsDirty(form);
    this.showFormError = false;
    if (form && form.invalid) {
      form.control.markAllAsTouched();
      this.showFormError = true;

      // Focus all invalid inputs
      setTimeout(() => {
        const invalidInputs = document.querySelectorAll(
          'input.ng-invalid, select.ng-invalid, textarea.ng-invalid'
        );
        invalidInputs.forEach((input: Element) => {
          (input as HTMLElement).focus();
        });
      }, 0);

      return;
    }

    try {
      const immunizationCollection = collection(this.firestore, 'immunization');
      const q = query(immunizationCollection, where('name', '==', this.formData.name));
      const querySnapshot = await getDocs(q);

      if (!this.childId && !querySnapshot.empty) {
        this.showModalMessage('Patient already exists. Please search for the patient and edit the details.', 'warning');
        this.isLoading = false;
        return;
      }

      let printed = false;
      const afterPrintHandler = async () => {
        if (!printed) return;
        window.removeEventListener('afterprint', afterPrintHandler);

        try {
          if (this.childId) {
            await this.updateImmunization(this.childId, this.formData, false);
            this.showModalMessage('Immunization record updated successfully!', 'success');
          } else {
            await this.saveImmunization(this.formData, false);
            this.showModalMessage('Immunization record saved successfully!', 'success');
          }
        } catch (error) {
          this.showModalMessage('An error occurred while saving the record. Please try again.', 'error');
        }
      };

      window.addEventListener('afterprint', afterPrintHandler);
      printed = true;
      window.print();
    } catch (error) {
      this.showModalMessage('Error checking for duplicate: ' + (error as any).message, 'error');
      this.isLoading = false;
    }
  }

  // Update your onSubmit to NOT print, just save
  async onSubmit(form: any) {
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

      if (!querySnapshot.empty) {
        this.showModalMessage('A record for this patient already exists. Please use the search feature to find and update the existing record.', 'warning');
        this.isLoading = false;
        return;
      }

      const uid = await this.authService.getCurrentUserId();
      const nurseName = await this.authService.getCurrentUserName();

      this.formData.SecondWednesdayNextMonth = this.getSecondWednesdayNextMonth();
      this.formData.createdDate = new Date().toISOString();
      this.formData.uid = uid;
      this.formData.nurseName = nurseName;

      await addDoc(immunizationCollection, this.formData);

      // Compose SMS
      const contact = this.formData.contact;
      const nextImmunization = this.getSecondWednesdayNextMonth();
      const message =
        `Good day ${this.formData.mother}, ` +
        `Next Immunization for ${this.formData.name} is on ${nextImmunization}. ` +
        `Expect reminder on the day of your appointment.`;

      if (contact) {
        // 1. Send immediate SMS
        this.smsService.sendSms(contact, message).subscribe({
          next: (res: any) => {
            this.response = `Success: ${JSON.stringify(res)}`;
            console.log("Immediate SMS sent successfully:", res);
          },
          error: (err: { error: any; }) => {
            this.response = `Error: ${JSON.stringify(err.error)}`;
            console.error("Immediate SMS failed:", err.error);
          }
        });

        // 2. Schedule SMS for SecondWednesdayNextMonth at 3 AM
        const scheduledAt = this.getSecondWednesdayNextMonthAt3AMString();
        const scheduledMessage =
          `Reminder: Immunization for ${this.formData.name} is today (${nextImmunization}). Please visit the health center.`;

        this.smsService.sendSms(contact, scheduledMessage, scheduledAt).subscribe({
          next: (res: any) => {
            console.log("Scheduled SMS sent successfully:", res);
          },
          error: (err: { error: any; }) => {
            console.error("Scheduled SMS failed:", err.error);
          }
        });
      }

      this.showModalMessage('Immunization record saved successfully!', 'success');
      this.isLoading = false;
    } catch (error) {
      this.showModalMessage('An error occurred while saving the record. Please try again.', 'error');
      this.isLoading = false;
    }
  }

  private async saveImmunization(data: any, showModal = false) {
    if (!data.nurseName) {
      data.nurseName = await this.authService.getCurrentUserName();
    }
    if (!data.uid) {
      data.uid = await this.authService.getCurrentUserId();
    }
    data.SecondWednesdayNextMonth = this.getSecondWednesdayNextMonth();
    await addDoc(collection(this.firestore, 'immunization'), data);

    // --- SMS sending logic here ---
    const contact = data.contact;
    const nextImmunization = this.getSecondWednesdayNextMonth();
    const message =
      `Good day ${data.mother}, ` +
      `Next Immunization for ${data.name} is on ${nextImmunization}. ` +
      `Expect reminder on the day of your appointment.`;

    if (contact) {
      // 1. Send immediate SMS
      this.smsService.sendSms(contact, message).subscribe({
        next: (res: any) => {
          console.log("Immediate SMS sent successfully:", res);
        },
        error: (err: { error: any; }) => {
          console.error("Immediate SMS failed:", err.error);
        }
      });

      // 2. Schedule SMS for SecondWednesdayNextMonth at 3 AM
      const scheduledAt = this.getSecondWednesdayNextMonthAt3AMString();
      const scheduledMessage =
        `Reminder: Immunization for ${data.name} is today (${nextImmunization}). Please visit the health center.`;

      this.smsService.sendSms(contact, scheduledMessage, scheduledAt).subscribe({
        next: (res: any) => {
          console.log("Scheduled SMS sent successfully:", res);
        },
        error: (err: { error: any; }) => {
          console.error("Scheduled SMS failed:", err.error);
        }
      });
    }
    // --- end SMS logic ---

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
    data.SecondWednesdayNextMonth = this.getSecondWednesdayNextMonth();
    const docRef = doc(this.firestore, 'immunization', id);
    await updateDoc(docRef, data);

    // --- SMS sending logic here ---
    const contact = data.contact;
    const nextImmunization = this.getSecondWednesdayNextMonth();
    const message =
      `Good day ${data.mother}, ` +
      `Next Immunization for ${data.name} is on ${nextImmunization}. ` +
      `Expect reminder on the day of your appointment.`;

    if (contact) {
      // 1. Send immediate SMS
      this.smsService.sendSms(contact, message).subscribe({
        next: (res: any) => {
          console.log("Immediate SMS sent successfully:", res);
        },
        error: (err: { error: any; }) => {
          console.error("Immediate SMS failed:", err.error);
        }
      });

      // 2. Schedule SMS for SecondWednesdayNextMonth at 3 AM
      const scheduledAt = this.getSecondWednesdayNextMonthAt3AMString();
      const scheduledMessage =
        `Reminder: Immunization for ${data.name} is today (${nextImmunization}). Please visit the health center.`;

      this.smsService.sendSms(contact, scheduledMessage, scheduledAt).subscribe({
        next: (res: any) => {
          console.log("Scheduled SMS sent successfully:", res);
        },
        error: (err: { error: any; }) => {
          console.error("Scheduled SMS failed:", err.error);
        }
      });
    }
    // --- end SMS logic ---

    if (showModal) {
      this.showModalMessage('Immunization record updated successfully!', 'success');
    }
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
    const phoneNumber = this.formData.contact;
    const message = '';
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
          // This returns "July 9, 2025" format
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
      }
    }
    return '';
  }

  printSection() {
    window.print();
  }

  // Add this method
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

    if (days < 0) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    this.formData.ageYears = years >= 0 ? years : 0;
    this.formData.ageMonths = months >= 0 ? months : 0;
  }

  // Helper to get ISO string for scheduled SMS
  private getSecondWednesdayNextMonthISO(): string {
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = (now.getMonth() + 1) % 12;
    let count = 0;
    for (let day = 1; day <= 15; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 3) { // 3 = Wednesday
        count++;
        if (count === 2) {
          // Return ISO string for scheduling
          date.setHours(8, 0, 0, 0); // Set to 8:00 AM, adjust as needed
          return date.toISOString();
        }
      }
    }
    return '';
  }

  // Add this helper method to your component:
  private getSecondWednesdayNextMonthISO3AM(): string {
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = (now.getMonth() + 1) % 12;
    let count = 0;
    for (let day = 1; day <= 15; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 3) { // 3 = Wednesday
        count++;
        if (count === 2) {
          date.setHours(3, 0, 0, 0); // Set to 3:00 AM
          return date.toISOString();
        }
      }
    }
    return '';
  }

  // Add this helper to your component
  private getSecondWednesdayNextMonthAt3AMString(): string {
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = (now.getMonth() + 1) % 12;
    let count = 0;
    for (let day = 1; day <= 15; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 3) { // 3 = Wednesday
        count++;
        if (count === 2) {
          date.setHours(3, 0, 0, 0); // Set to 3:00 AM
          // Format: YYYY-MM-DD HH:mma
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
}
