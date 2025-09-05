import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Firestore, doc, getDoc, updateDoc, addDoc, collection } from '@angular/fire/firestore';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SmsService } from '../../../services/sms.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-individual-treatment-record-print-only',
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule, RouterLink],
  templateUrl: './individual-treatment-record-print-only.component.html',
  styleUrl: './individual-treatment-record-print-only.component.scss'
})
export class IndividualTreatmentRecordPrintOnlyComponent implements OnInit {
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

  constructor(
    private authService: AuthService,
    private firestore: Firestore,
    private smsService: SmsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
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
        dateSaved: new Date().toISOString(),
      };

      await addDoc(collection(this.firestore, 'ITR'), record);

      // Compose SMS (limit to 150 chars, professional)
      const name = this.itr.firstName ? `${this.itr.firstName} ${this.itr.lastName}` : 'Patient';
      const contact = this.itr.contact;
      const nextPrenatal = this.getSecondTuesdayNextMonth();
      let message = `Prenatal reminder: ${name}, next checkup on ${nextPrenatal}. Bring records. Reply for info.`;
      if (message.length > 150) message = message.slice(0, 147) + '...';

      // Scheduled SMS for 2nd Tuesday next month at 3AM
      const scheduledAt = this.getSecondTuesdayNextMonthAt3AMString();
      let scheduledMessage = `Reminder: ${name}, prenatal checkup today at health center. Bring records.`;
      if (scheduledMessage.length > 150) scheduledMessage = scheduledMessage.slice(0, 147) + '...';

      // Send SMS if contact is provided
      if (contact) {
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
        // Schedule SMS reminder ONLY for the 2nd Tuesday of next month at 3AM
        this.smsService.scheduleSmsReminder(contact, scheduledMessage, scheduledAt).subscribe({
          next: (res: any) => console.log('Scheduled SMS set:', res),
          error: (err: any) => console.error('Scheduled SMS failed:', err)
        });
      } else {
        this.successMessage = 'Record saved successfully. No contact number provided for SMS notification.';
        window.print();
      }

    } catch (error: any) {
      this.errorMessage = 'Error saving ITR: ' + (error?.message || 'Unknown error');
    }
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

  // Helper to get the 2nd Tuesday of next month at 3AM (YYYY-MM-DD HH:mmA)
  private getSecondTuesdayNextMonthAt3AMString(): string {
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = (now.getMonth() + 1) % 12;
    let count = 0;
    for (let day = 1; day <= 15; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 2) {
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
      nurseName: nurseName, // or midwife/incharge
      nextPrenatal: this.getSecondTuesdayNextMonth(),
      typeofConsultation: "Prenatal",
    };

    // 4. Save to Firestore
    await addDoc(collection(this.firestore, 'itr'), itrWithMeta);
    this.successMessage = 'Record saved successfully.';
    this.router.navigate(['/HCP/Prenatal-Patients']);
  }

  async updateITR(itr: any) {
    if (!this.itrDocId) return;
    const itrDocRef = doc(this.firestore, 'itr', this.itrDocId);
    await updateDoc(itrDocRef, itr);
    this.successMessage = 'Record updated successfully.';
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
}
