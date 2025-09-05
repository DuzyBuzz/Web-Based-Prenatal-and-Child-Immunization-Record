import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormsModule } from '@angular/forms';
import { Firestore, addDoc, collection, serverTimestamp, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { AuthService } from '../../../auth/auth.service';
import { ActivatedRoute } from '@angular/router';
import { SmsService } from '../../../services/sms.service';

@Component({
  selector: 'app-new-itr-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './new-itr-form.component.html',
  styleUrls: ['./new-itr-form.component.scss'],
})
export class NewItrFormComponent implements OnInit {
  // Helper to check for duplicate patient name
  async checkDuplicateName(lastName: string, firstName: string, middleName: string): Promise<boolean> {
    // Query Firestore for existing patient with same name
    const itrCollection = collection(this.firestore, 'itr');
    // Use where queries for lastName, firstName, middleName
    // Firestore web SDK v9 modular: import { query, where, getDocs } from '@angular/fire/firestore';
    // But only import what you need
    const { query, where, getDocs } = await import('firebase/firestore');
    const q = query(itrCollection,
      where('lastName', '==', lastName),
      where('firstName', '==', firstName),
      where('middleName', '==', middleName)
    );
    const snapshot = await getDocs(q);
    // If editing, ignore current record
    if (this.prenatalid) {
      return snapshot.docs.some(doc => doc.id !== this.prenatalid);
    }
    return !snapshot.empty;
  }
nows: Date = new Date();
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private smsService = inject(SmsService);
  now: Date | undefined;
  // ✅ Define form
  form: FormGroup = this.fb.group({
    lastName: ['', Validators.required],
    firstName: ['', Validators.required],
    middleName: [''],
    address: ['', Validators.required],
    birthday: ['', Validators.required],
    age: [{ value: '', disabled: true }], // auto-calculated
    contactNumber: [''],
    husbandsName: [''],
    lmp: [''],
    edc: [''],
    gp: [''],
    obScore: [''],
    tt1: [''],
    tt2: [''],
    tt3: [''],
    tt4: [''],
    tt5: [''],
    historyOfIllnesses: [''],
    philHealthNumber: [''],
    philHealthStatus: ['Member'],
    visits: this.fb.array([]), // ✅ cleaner init
  });

  prenatalid: string | null = null;
  buttonLabel = 'Save & Print';
  nurseName: string = '';

  constructor() {
    // auto-calc age from birthday
    this.form.get('birthday')?.valueChanges.subscribe((isoDate: string) => {
      const age = this.calcAge(isoDate);
      this.form.get('age')?.setValue(age ?? '', { emitEvent: false });
    });

    // Ensure exactly 5 visit rows exist on init
    while (this.visits.length < 5) {
      this.addVisit();
    }
  }
async ngOnInit() {
  // Update timestamp every second
  setInterval(() => {
    this.nows = new Date();
  }, 1000);
  // Get the currently logged-in HCP from AuthService
  const authUser = this.authService.getAuthUser();
  if (authUser && authUser.role === 'hcp') {
    this.nurseName = authUser.name;
    console.log('Nurse Name from AuthService:', this.nurseName);
  } else {
    console.warn('No authenticated HCP found.');
  }

  // One-time param fetch and document load
  const id = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('motherId');
  console.log('Route param id:', id);
  if (id) {
    this.prenatalid = id;
    this.buttonLabel = 'Update & Print';

    // Fetch prenatal record
    const ref = doc(this.firestore, 'itr', id);
    const snap = await getDoc(ref);
    console.log('Firestore doc snapshot:', snap.exists() ? snap.data() : 'No document found');
    if (snap.exists()) {
      const data = snap.data();
      // Patch all fields except visits, with fallback values
      const { visits } = data;
      this.form.patchValue({
        lastName: data['lastName'] || '',
        firstName: data['firstName'] || '',
        middleName: data['middleName'] || '',
        address: data['address'] || '',
        birthday: data['birthday'] || '',
        age: data['age'] || '',
        contactNumber: data['contactNumber'] || '',
        husbandsName: data['husbandsName'] || '',
        lmp: data['lmp'] || '',
        edc: data['edc'] || '',
        gp: data['gp'] || '',
        obScore: data['obScore'] || '',
        tt1: data['tt1'] || '',
        tt2: data['tt2'] || '',
        tt3: data['tt3'] || '',
        tt4: data['tt4'] || '',
        tt5: data['tt5'] || '',
        historyOfIllnesses: data['historyOfIllnesses'] || '',
        philHealthNumber: data['philHealthNumber'] || '',
        philHealthStatus: data['philHealthStatus'] || 'Member',
      });

      // Patch disabled field (age) if present
      if (data['age'] !== undefined) {
        this.form.get('age')?.setValue(data['age']);
      }

      // Patch visits array
      if (Array.isArray(visits)) {
        this.visits.clear();
        visits.forEach((visit: any) => this.visits.push(this.fb.group(visit)));
        while (this.visits.length < 5) this.addVisit();
        while (this.visits.length > 5) this.visits.removeAt(this.visits.length - 1);
      }
      console.log('Form patched with Firestore data:', this.form.value);
    }
  } else {
    this.prenatalid = null;
    this.buttonLabel = 'Save & Print';
    while (this.visits.length) this.visits.removeAt(0);
    while (this.visits.length < 5) this.addVisit();
  }
      console.log('Patched form value:', this.form.value);

}


  // ✅ visits getter
  get visits(): FormArray {
    return this.form.get('visits') as FormArray;
  }

  // ✅ create visit row
  private createVisit(): FormGroup {
    return this.fb.group({
      date: [''],
      aog: [''],
      weight: [''],
      bp: [''],
      hr: [''],
      rr: [''],
      temp: [''],
      o2sat: [''],
      fh: [''],
      fhb: [''],
      pres: [''],
      l1: [''],
      l2: [''],
      l3: [''],
      l4: [''],
      vagBleeding: [''],
      pallor: [''],
      fever: [''],
      edema: [''],
      notes: [''],
    });
  }

  // ✅ add/remove visits
  addVisit() {
    this.visits.push(this.createVisit());
  }

  removeVisit(i: number) {
    this.visits.removeAt(i);
  }

  // ✅ calculate age
  private calcAge(isoDate: string | null): number | null {
    if (!isoDate) return null;
    const dob = new Date(isoDate);
    if (isNaN(dob.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const beforeBirthday =
      today.getMonth() < dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());

    if (beforeBirthday) age--;
    return age;
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

  // Helper to format PH mobile number (returns valid 11-digit number or empty string)
  private formatPHNumber(raw: any): string {
    // Convert to string and trim
    const str = (raw ?? '').toString().trim();
    // Remove all non-digit characters
    const digits = str.replace(/\D/g, '');
    // Debug log
    console.log('Raw contact input:', raw, 'Digits:', digits);
    // Must start with '09' and be 11 digits
    if (digits.length === 11 && digits.startsWith('09')) {
      return digits;
    }
    return '';
  }

  // ✅ submit form
  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    console.log('Form submission:', this.form.getRawValue(), 'prenatalid:', this.prenatalid, 'nurseName:', this.nurseName);

    const lastName = (this.form.get('lastName')?.value ?? '').toString().trim();
    const firstName = (this.form.get('firstName')?.value ?? '').toString().trim();
    const middleName = (this.form.get('middleName')?.value ?? '').toString().trim();

    // Format contact number as PH mobile number
    const rawContact = this.form.get('contactNumber')?.value;
    const contact = this.formatPHNumber(rawContact);

    // Do not proceed if contact number is invalid
    if (!contact) {
      alert('Please enter a valid PH mobile number (e.g., 09926105119).');
      return;
    }

    if (lastName && firstName) {
      const isDuplicate = await this.checkDuplicateName(lastName, firstName, middleName);
      if (isDuplicate) {
        alert('A patient with this name already exists. Please check for duplicates.');
        return;
      }
    }

    try {
      if (!this.nurseName || this.nurseName.trim() === '') {
        alert('HCP name not found. Please complete your profile.');
        return;
      }
      const data = { ...this.form.getRawValue(), nurseName: this.nurseName, updatedAt: serverTimestamp() };

      if (this.prenatalid) {
        const ref = doc(this.firestore, 'itr', this.prenatalid);
        await updateDoc(ref, data);
        alert('Record updated!');
      } else {
        await addDoc(collection(this.firestore, 'itr'), { ...data, createdAt: serverTimestamp() });
        alert('Saved to Firestore!');
      }

      // --- SMS Logic ---
      const name = firstName ? `${firstName} ${lastName}` : 'Patient';
      const nextPrenatal = this.getSecondTuesdayNextMonth();
      let message = `Prenatal reminder: ${name}, next checkup on ${nextPrenatal}. Bring records. Reply for info.`;
      if (message.length > 150) message = message.slice(0, 147) + '...';

      const scheduledAt = this.getSecondTuesdayNextMonthAt3AMString();
      let scheduledMessage = `Reminder: ${name}, prenatal checkup today at health center. Bring records.`;
      if (scheduledMessage.length > 150) scheduledMessage = scheduledMessage.slice(0, 147) + '...';

      this.smsService.sendSms(contact, message).subscribe({
        next: () => {
          console.log('Immediate SMS sent.');
        },
        error: (err) => {
          console.error('SMS Error:', err);
        }
      });
      this.smsService.scheduleSmsReminder(contact, scheduledMessage, scheduledAt).subscribe({
        next: (res: any) => console.log('Scheduled SMS set:', res),
        error: (err: any) => console.error('Scheduled SMS failed:', err)
      });

      window.print();

      if (!this.prenatalid) {
        this.form.reset({ philHealthStatus: 'Member' });
        while (this.visits.length) this.visits.removeAt(0);
        while (this.visits.length < 5) this.addVisit();
      }

    } catch (error) {
      console.error('Error saving record:', error);
      alert('Failed to save. Please try again.');
    }
  }
}
