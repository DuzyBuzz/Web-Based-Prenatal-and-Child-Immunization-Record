import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Firestore, addDoc, collection, serverTimestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-new-itr-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './new-itr-form.component.html',
  styleUrls: ['./new-itr-form.component.scss'],
})
export class NewItrFormComponent {
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);

  form: FormGroup = this.fb.group({
    familyName: ['', Validators.required],
    firstName: ['', Validators.required],
    middleName: [''],
    address: ['', Validators.required],
    birthday: ['', Validators.required],
    age: [{ value: '', disabled: true }],
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
    visits: this.fb.array([] as FormGroup[]),
  });

  constructor() {
    // auto-calc age
    this.form.get('birthday')?.valueChanges.subscribe((isoDate: string) => {
      const age = this.calcAge(isoDate);
      this.form.get('age')?.setValue(age ?? '', { emitEvent: false });
    });

    // add first visit row
    this.addVisit();
  }

  // visits getter
  get visits(): FormArray {
    return this.form.get('visits') as FormArray;
  }

  // create a visit row
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

  addVisit() {
    this.visits.push(this.createVisit());
  }

  removeVisit(i: number) {
    this.visits.removeAt(i);
  }

  // calculate age
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

  // submit to Firestore
  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const data = { ...this.form.getRawValue(), createdAt: serverTimestamp() };
    await addDoc(collection(this.firestore, 'prenatalRecords'), data);
    alert('Saved to Firestore!');
    this.form.reset();
    while (this.visits.length) this.visits.removeAt(0);
    this.addVisit();
  }
}
