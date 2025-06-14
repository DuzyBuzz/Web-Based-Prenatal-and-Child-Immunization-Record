import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, updateDoc, addDoc } from '@angular/fire/firestore';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SmsService } from '../../../services/sms.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
@Component({
  selector: 'app-itr-records',
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule],
  templateUrl: './itr-records.component.html',
  styleUrls: ['./itr-records.component.scss']
})
export class ItrRecordsComponent implements OnInit {
  motherId: string | null = null;
  itr: any = {};
  itrDocId: string | null = null;
  showFormError = false;
  bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  successMessage: string | null = null;
  errorMessage: string | null = null;
  now = new Date();
  today = new Date();
  consultationOptions = [
    'Prenatal',
    'Dental Care/ Consultation',
    'Postpartum',
    'Family Planning',
    'TB',
    'Leprosy',
    'Sick Children',
    'Child Immunization',
    'Child Care',
    'Child Nutrition'
  ];
  showModal = false;
  invalidFields: string[] = [];

  // Map field names to user-friendly labels
  private fieldLabels: { [key: string]: string } = {
    lastName: 'Last Name',
    firstName: 'First Name',
    age: 'Age',
    sex: 'Sex',
    civilStatus: 'Civil Status',
    citizenship: 'Citizenship',
    address: 'Address',
    bloodType: 'Blood Type',
    dob: 'Date of Birth',
    zipCode: 'Zip Code',
    contact: 'Contact Number',
    diagnosis: 'Diagnosis',
    consultation1: 'Consultation 1',
  };
  isTTValid: any;
  isConsultationValid: any;
  diagnosis: any;
  itrs: any[] = [];
  filteredItrs: any[] = [];

  constructor(
    private authService: AuthService,
    private firestore: Firestore,
    private smsService: SmsService,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    // Get all ITRs
    const querySnapshot = await getDocs(collection(this.firestore, 'itr'));
    this.itrs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get query params
    this.route.queryParams.subscribe(params => {
      const firstName = (params['firstName'] || '').trim().toLowerCase();
      const middleName = (params['middleName'] || '').trim().toLowerCase();
      const lastName = (params['lastName'] || '').trim().toLowerCase();

      if (firstName || middleName || lastName) {
        this.filteredItrs = this.itrs.filter(itr =>
          (itr.firstName || '').trim().toLowerCase() === firstName &&
          (itr.middleName || '').trim().toLowerCase() === middleName &&
          (itr.lastName || '').trim().toLowerCase() === lastName
        );
      } else {
        this.filteredItrs = this.itrs;
      }
    });

    setInterval(() => {
      this.now = new Date();
    }, 1000);
  }

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

  async onSubmit(form?: any) {
    this.successMessage = null;
    this.errorMessage = null;
    this.showFormError = false; // Reset error

    // If form is invalid, show error and mark fields
    if (form && form.invalid) {
      this.showFormError = true;
      // Optionally, scroll to first invalid field
      const firstInvalid = document.querySelector('.border-red-500');
      if (firstInvalid) {
        (firstInvalid as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      // Add today's date to the record
      const record = {
        ...this.itr,
        dateSaved: new Date().toISOString()
      };

      await addDoc(collection(this.firestore, 'ITR'), record);

      // Compose SMS
      const name = this.itr.firstName ? `${this.itr.firstName} ${this.itr.lastName}` : 'Patient';
      const contact = this.itr.contact;
      const nextPrenatal = this.getSecondTuesdayNextMonth();
      const message =
        `Good day, ${name}! ` +
        `Your next prenatal check-up is scheduled on ${nextPrenatal}. ` +
        `You will also receive a reminder on the day of your appointment. Thank you for prioritizing your health and your baby's well-being.`;

      // Send SMS if contact is provided
      if (contact) {
        /*
        this.smsService.sendSms(contact, message).subscribe({
          next: () => {
            this.successMessage = 'Record saved and SMS notification sent successfully.';
            window.print(); // Print the form after successful save and SMS
            this.itr = {}; // reset form
          },
          error: (err) => {
            this.successMessage = 'Record saved, but failed to send SMS notification.';
            this.errorMessage = 'SMS Error: ' + (err?.error?.message || 'Unknown error sending SMS.');
            window.print(); // Still print even if SMS fails
          }
        });
        */
        this.successMessage = 'Record saved successfully. SMS notification sending is currently disabled.';
        window.print(); // Print the form after successful save
      } else {
        this.successMessage = 'Record saved successfully. No contact number provided for SMS notification.';
        window.print(); // Print the form after successful save
      }

    } catch (error: any) {
      this.errorMessage = 'Error saving ITR: ' + (error?.message || 'Unknown error');
    }
  }

  printAndSaveOrUpdateITR(form: any) {
    if (form.invalid) {
      this.showFormError = true;
      return;
    }

    let printed = false;
    const afterPrintHandler = async () => {
      if (printed) {
        if (this.motherId) {
          await this.updateITR(this.itr);
        } else {
          await this.saveITR(this.itr);
        }
        window.removeEventListener('afterprint', afterPrintHandler);
      }
    };

    window.addEventListener('afterprint', afterPrintHandler);
    printed = true;
    window.print();
  }

  // Save ITR with nurse/midwife/incharge name in message
  async saveITR(itr: any) {
    // 1. Get current user UID
    const uid = await this.authService.getCurrentUserId();
    if (!uid) {
      // Handle not logged in
      return;
    }

    // 2. Get user name from users collection
    const userDocRef = doc(this.firestore, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    let nurseName = '';
    if (userSnap.exists()) {
      nurseName = userSnap.data()['name'] || '';
    }

    // 3. Add UID and nurseName to ITR
    const itrWithMeta = {
      ...itr,
      createdBy: uid,
      nurseName: nurseName // or midwife/incharge
    };

    // 4. Save to Firestore
    await addDoc(collection(this.firestore, 'itr'), itrWithMeta);
    this.successMessage = 'Record saved successfully.';
  }

  async updateITR(itr: any) {
    if (!this.itrDocId) return;
    const itrDocRef = doc(this.firestore, 'itr', this.itrDocId);
    await updateDoc(itrDocRef, itr);
    this.successMessage = 'Record updated successfully.';
  }
}
