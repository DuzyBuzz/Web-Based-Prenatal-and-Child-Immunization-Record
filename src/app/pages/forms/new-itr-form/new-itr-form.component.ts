import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormsModule } from '@angular/forms';
import { Firestore, addDoc, collection, serverTimestamp, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { AuthService } from '../../../auth/auth.service';
import { ActivatedRoute } from '@angular/router';

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

  // ✅ submit form
  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    console.log('Form submission:', this.form.getRawValue(), 'prenatalid:', this.prenatalid, 'nurseName:', this.nurseName);

    // Check for duplicate patient name
    const lastName = this.form.get('lastName')?.value?.trim();
    const firstName = this.form.get('firstName')?.value?.trim();
    const middleName = this.form.get('middleName')?.value?.trim() || '';
    if (lastName && firstName) {
      const isDuplicate = await this.checkDuplicateName(lastName, firstName, middleName);
      if (isDuplicate) {
        alert('A patient with this name already exists. Please check for duplicates.');
        return;
      }
    }

    try {
      // Use nurseName property from component
      if (!this.nurseName || this.nurseName.trim() === '') {
        alert('HCP name not found. Please complete your profile.');
        return;
      }
      const data = { ...this.form.getRawValue(), nurseName: this.nurseName, updatedAt: serverTimestamp() };

      if (this.prenatalid) {
        // Update existing record
        const ref = doc(this.firestore, 'itr', this.prenatalid);
        await updateDoc(ref, data);
        alert('Record updated!');
      } else {
        // Create new record
        await addDoc(collection(this.firestore, 'itr'), { ...data, createdAt: serverTimestamp() });
        alert('Saved to Firestore!');
      }

      // Print before resetting the form so the filled form is printed
      window.print();

      // Reset form for new entry
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
