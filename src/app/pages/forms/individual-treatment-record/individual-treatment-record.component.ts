import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { SmsService } from '../../../services/sms.service';
// Import your SMS service

@Component({
  selector: 'app-individual-treatment-record',
  imports: [CommonModule, FormsModule],
  templateUrl: './individual-treatment-record.component.html',
  styleUrl: './individual-treatment-record.component.scss'
})
export class IndividualTreatmentRecordComponent {
  itr: any = {};
  bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  constructor(private firestore: Firestore, private smsService: SmsService) {}

  // Helper to get the 2nd Tuesday of next month
  private getSecondTuesdayNextMonth(): string {
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = (now.getMonth() + 1) % 12;
    let count = 0;
    for (let day = 1; day <= 15; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 2) { // 2 = Tuesday
        count++;
        if (count === 2) {
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
      }
    }
    return '';
  }

  async onSubmit() {
    try {
      await addDoc(collection(this.firestore, 'ITR'), this.itr);

      // Compose SMS
      const name = this.itr.firstName ? `${this.itr.firstName} ${this.itr.lastName}` : 'Patient';
      const contact = this.itr.contact;
      const nextPrenatal = this.getSecondTuesdayNextMonth();
      const message =
        `Good day, ${name}! This is a reminder from Pototan RHU: ` +
        `Your next prenatal check-up is scheduled every 2nd Tuesday of the month. ` +
        `The next session will be on ${nextPrenatal}. ` +
        `You will also receive a reminder on the day of your appointment. Thank you for prioritizing your health and your baby's well-being.`;

      // Send SMS if contact is provided
      if (contact) {
        this.smsService.sendSms(contact, message).subscribe({
          next: () => {},
          error: () => {}
        });
      }

      alert('ITR record saved successfully!');
      this.itr = {}; // reset form
    } catch (error) {
      alert('Error saving ITR: ' + (error as any).message);
    }
  }
}
