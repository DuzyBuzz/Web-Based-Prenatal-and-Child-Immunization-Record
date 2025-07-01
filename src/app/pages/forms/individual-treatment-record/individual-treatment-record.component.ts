import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Firestore, doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs } from '@angular/fire/firestore';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SmsService } from '../../../services/sms.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-individual-treatment-record',
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule, RouterLink],
  templateUrl: './individual-treatment-record.component.html',
  styleUrl: './individual-treatment-record.component.scss'
})
export class IndividualTreatmentRecordComponent implements OnInit {
  motherId: string | null = null;
  itr: any = {};
  itrDocId: string | null = null;
  showFormError = false;
  bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  successMessage: string | null = null;
  errorMessage: string | null = null;
  warningMessage: string | null = null;
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
  modalMessage: string = '';
  modalType: 'success' | 'error' | 'warning' = 'success';
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

  constructor(
    private authService: AuthService,
    private firestore: Firestore,
    private smsService: SmsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit() {
      this.showFormError = true;
    // Get current user UID
    const uid = await this.authService.getCurrentUserId();
    if (uid) {
      const userDocRef = doc(this.firestore, 'users', uid);
      const userSnap = await getDoc(userDocRef);
      let nurseName = '';
      if (userSnap.exists()) {
        nurseName = userSnap.data()['name'] || '';
        console.log('Logged in nurse name:', nurseName);
      }
      console.log(nurseName);
    }
    this.motherId = this.route.snapshot.paramMap.get('motherId');
    if (this.motherId) {
      // Fetch the ITR record by document ID
      const itrDocRef = doc(this.firestore, 'itr', this.motherId);
      getDoc(itrDocRef).then(snapshot => {
        if (snapshot.exists()) {
          this.itr = snapshot.data();
          this.itrDocId = snapshot.id;
        }
      });
    }
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
    this.showFormError = false;

    if (form && form.invalid) {
      this.showFormError = true;
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
        dateSaved: new Date().toISOString(),
      };

      await addDoc(collection(this.firestore, 'ITR'), record);

      // Compose SMS
      const name = this.itr.firstName ? `${this.itr.firstName} ${this.itr.lastName}` : 'Patient';
      const contact = this.itr.contact;
      const nextPrenatal = this.getSecondTuesdayNextMonth();
      const message =
        `Good day ${name}, ` +
        `Your Next Prenatal is on ${nextPrenatal}. ` +
        `Expect reminder on the day of your appointment.`;

      if (contact) {
        // 1. Send immediate SMS
        this.smsService.sendSms(contact, message).subscribe({
          next: () => {
            this.successMessage = 'Record saved and SMS notification sent successfully.';
            window.print();
            this.itr = {};
          },
          error: (err) => {
            this.successMessage = 'Record saved, but failed to send SMS notification.';
            this.errorMessage = 'SMS Error: ' + (err?.error?.message || 'Unknown error sending SMS.');
            window.print();
          }
        });

        // 2. Schedule SMS for the second Tuesday next month at 3 AM
        const scheduledAt = this.getSecondTuesdayNextMonthISO3AM(); // Make sure this returns "YYYY-MM-DD HH:mma"
        const scheduledMessage =
          `Reminder: Your Prenatal appointment is today (${nextPrenatal}). Please visit the health center.`;

        fetch(`https://sms.iprogtech.com/api/v1/message-reminders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_token: '46a41b56a940789fc2ef1178f6151a79d8639ec4', // <-- Your API token here
            phone_number: contact,
            scheduled_at: scheduledAt,
            message: scheduledMessage
          })
        })
        .then(res => res.json())
        .then(data => {
          // Optionally handle response
        })
        .catch(err => {
          // Optionally handle error
        });
      } else {
        this.successMessage = 'Record saved successfully. No contact number provided for SMS notification.';
        window.print();
      }

    } catch (error: any) {
      this.errorMessage = 'An error occurred while saving the record. Please try again.';
    }
  }

  // Add this helper method to your component:
  private getSecondTuesdayNextMonthISO3AM(): string {
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = (now.getMonth() + 1) % 12;
    let count = 0;
    for (let day = 1; day <= 15; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 2) { // 2 = Tuesday
        count++;
        if (count === 2) {
          date.setHours(3, 0, 0, 0); // Set to 3:00 AM
          return date.toISOString();
        }
      }
    }
    return '';
  }

  private showModalMessage(message: string, type: 'success' | 'error' | 'warning') {
    this.modalMessage = message;
    this.modalType = type;
    this.showModal = true;
    setTimeout(() => {
      this.showModal = false;
      this.router.navigate(['/HCP/Prenatal-Patients']);
    }, 3000);
  }

  async printAndSaveOrUpdateITR(form: any) {
    this.showFormError = false;
    if (form && form.invalid) {
      this.showFormError = true;
      Object.values(form.controls).forEach((control: any) => {
        control.markAsTouched();
        control.markAsDirty();
      });
      setTimeout(() => {
        const firstInvalid: HTMLElement | null = document.querySelector(
          'input.ng-invalid, select.ng-invalid, textarea.ng-invalid'
        );
        if (firstInvalid) {
          firstInvalid.focus();
        }
      }, 0);
      return;
    }

    // Duplicate check before printing or saving
    const itrCollection = collection(this.firestore, 'itr');
    const q = query(
      itrCollection,
      where('lastName', '==', this.itr.lastName),
      where('firstName', '==', this.itr.firstName),
      where('middleName', '==', this.itr.middleName)
    );
    const querySnapshot = await getDocs(q);

    // If editing, allow the same name for the current record
    if (!this.motherId && !querySnapshot.empty) {
      // Show modal after NOT printing
      this.showModalMessage(
        'A record for this patient already exists. Please use the search feature to find and update the existing record.',
        'warning'
      );
      return;
    }

    let printed = false;
    const afterPrintHandler = async () => {
      if (printed) {
        if (this.motherId) {
          await this.updateITR(this.itr);
          this.showModalMessage('Record updated successfully.', 'success');
        } else {
          await this.saveITR(this.itr, true);
        }
        window.removeEventListener('afterprint', afterPrintHandler);
      }
    };

    window.addEventListener('afterprint', afterPrintHandler);
    printed = true;
    window.print();
  }

  // Save ITR with nurse/midwife/incharge name in message
  async saveITR(itr: any, showModal = false) {
    // 1. Get current user UID
    const uid = await this.authService.getCurrentUserId();
    if (!uid) return;

    // 2. Check for duplicate by name
    const itrCollection = collection(this.firestore, 'itr');
    const q = query(
      itrCollection,
      where('lastName', '==', itr.lastName),
      where('firstName', '==', itr.firstName),
      where('middleName', '==', itr.middleName)
    );
    const querySnapshot = await getDocs(q);

    if (!this.motherId && !querySnapshot.empty) {
      this.showModalMessage(
        'Patient already exists. Please search for the patient and edit the details.',
        'warning'
      );
      return;
    }

    // 3. Get user name from users collection
    const userDocRef = doc(this.firestore, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    let nurseName = '';
    if (userSnap.exists()) {
      nurseName = userSnap.data()['name'] || '';
    }

    // 4. Add UID and nurseName to ITR
    const itrWithMeta = {
      ...itr,
      createdBy: uid,
      nurseName: nurseName,
      nextPrenatal: this.getSecondTuesdayNextMonth(),
      typeofConsultation: "Prenatal",
    };

    // 5. Save to Firestore
    await addDoc(itrCollection, itrWithMeta);
    if (showModal) {
      this.showModalMessage('Record saved successfully.', 'success');
    }
  }

  async updateITR(itr: any) {
    if (!this.itrDocId) return;
    const itrDocRef = doc(this.firestore, 'itr', this.itrDocId);
    await updateDoc(itrDocRef, itr);
    // Modal is shown in afterprint handler
  }

  async printAsPdfWithName() {
    const { lastName = '', firstName = '', middleName = '' } = this.itr;
    const filename = `${lastName}_${firstName}_${middleName}.pdf`.replace(/\s+/g, '_');
    const data = document.getElementById('print-section');
    if (data) {
      const canvas = await html2canvas(data);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(filename);
    }
  }

  // Add this method
  calculateAgeFromDob() {
    if (!this.itr.dob) {
      this.itr.age = null;
      return;
    }
    const today = new Date();
    const birthDate = new Date(this.itr.dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    this.itr.age = age;
  }
}
