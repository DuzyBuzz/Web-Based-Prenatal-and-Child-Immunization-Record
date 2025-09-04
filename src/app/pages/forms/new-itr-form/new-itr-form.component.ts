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
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  // ✅ Define form
  form: FormGroup = this.fb.group({
    familyName: ['', Validators.required],
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
  // Get the currently logged-in HCP from AuthService
  const authUser = this.authService.getAuthUser();
  if (authUser && authUser.role === 'hcp') {
    this.nurseName = authUser.name;
    console.log('Nurse Name from AuthService:', this.nurseName);
  } else {
    console.warn('No authenticated HCP found.');
  }

  // Then handle route params as before
  this.route.paramMap.subscribe(async params => {
    const id = params.get('id');
    if (id) {
      this.prenatalid = id;
      this.buttonLabel = 'Update & Print';

      // Fetch prenatal record
      const ref = doc(this.firestore, 'itr', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        this.form.patchValue(data);

        if (Array.isArray(data['visits'])) {
          this.visits.clear();
          data['visits'].forEach((visit: any) => this.visits.push(this.fb.group(visit)));

          while (this.visits.length < 5) this.addVisit();
          while (this.visits.length > 5) this.visits.removeAt(this.visits.length - 1);
        }
      }
    } else {
      this.prenatalid = null;
      this.buttonLabel = 'Save & Print';
      while (this.visits.length) this.visits.removeAt(0);
      while (this.visits.length < 5) this.addVisit();
    }
  });
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
