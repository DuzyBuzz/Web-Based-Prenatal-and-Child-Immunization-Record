import { AuthService } from '../../../auth/auth.service';
import { SmsService } from './../../../services/sms.service';
import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit } from '@angular/core';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

  constructor(
    private firestore: Firestore,
    private smsService: SmsService,
    private authService: AuthService, // Inject AuthService
    private router: Router // Inject Router for navigation
  ) {
    this.setBhwName();
  }
  ngOnInit(): void {
    setInterval(() => {
      this.now = new Date();
    }, 1000);
  }


  async setBhwName() {
    const name = await this.authService.getCurrentUserName();
    if (name) {
      this.formData.bhw = name;
    }
  }

  async onSubmit(form: any) {
    this.showFormError = false;
    if (form && form.invalid) {
      form.control.markAllAsTouched(); // Touch all fields
      this.showFormError = true;
      return;
    }

    try {
      // Add SecondWednesdayNextMonth, createdDate, and name to the record
      this.formData.SecondWednesdayNextMonth = this.getSecondWednesdayNextMonth();
      this.formData.createdDate = new Date().toISOString();

      // Optionally, add the name field if not already present
      // this.formData.name = this.formData.name || '';

      await addDoc(collection(this.firestore, 'children'), this.formData);

      // Compose SMS
      /*
      const name = this.formData.name || 'Parent/Guardian';
      const contact = this.formData.contact;
      const nextImmunization = this.getSecondWednesdayNextMonth();
      const message =
        `Good day, ${name}! ` +
        `Your child's next immunization schedule will be on ${nextImmunization}. ` +
        `You will also receive a reminder on the day of your appointment.`;

      // Send SMS if contact is provided
      if (contact) {
        this.smsService.sendSms(contact, message).subscribe({
          next: (res: any) => this.response = `Success: ${JSON.stringify(res)}`,
          error: (err: { error: any; }) => this.response = `Error: ${JSON.stringify(err.error)}`
        });
      }
      */

      alert('Immunization record saved!');
      this.router.navigate(['/HCP/immunization']);
    } catch (error) {
      alert('Error saving record: ' + (error as any).message);
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
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
      }
    }
    return '';
  }

  printSection() {
    window.print();
  }
}
