import { SmsService } from './../../../services/sms.service';
import { CommonModule } from '@angular/common';
import { Component, NgModule } from '@angular/core';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-childrenimmunizationform',
  imports: [CommonModule, FormsModule],
  templateUrl: './childrenimmunizationform.component.html',
  styleUrl: './childrenimmunizationform.component.scss'
})
export class ChildrenimmunizationformComponent {
  formData: any = {}; // Holds all form values
  response = '';
  constructor(private firestore: Firestore, private smsService: SmsService) {}

  async onSubmit() {
    try {
      await addDoc(collection(this.firestore, 'immunization'), this.formData);

      // Compose SMS
      const name = this.formData.name || 'Parent/Guardian';
      const contact = this.formData.contact;
      const nextImmunization = this.getSecondWednesdayNextMonth();
      const message =
        `Good day, ${name}! This is a reminder from Pototan RHU: ` +
        `Your child's next immunization schedule is every 2nd Wednesday of the month. ` +
        `The next session will be on ${nextImmunization}. ` +
        `You will also receive a reminder on the day of your appointment. Thank you for prioritizing your child's health.`;

      // Send SMS if contact is provided
      if (contact) {
        this.smsService.sendSms(contact, message).subscribe({
          next: (res: any) => this.response = `Success: ${JSON.stringify(res)}`,
          error: (err: { error: any; }) => this.response = `Error: ${JSON.stringify(err.error)}`
        });
      }

      alert('Immunization record saved!');
      this.formData = {}; // Reset form if desired
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
}
