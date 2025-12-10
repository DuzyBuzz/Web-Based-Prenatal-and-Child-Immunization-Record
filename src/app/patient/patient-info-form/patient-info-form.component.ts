import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Firestore, addDoc, collection, serverTimestamp, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-patient-info-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './patient-info-form.component.html',
  styleUrls: ['./patient-info-form.component.scss']
})
export class PatientInfoFormComponent implements OnInit {
  form: FormGroup;
  submitting = false;
  submitted = false;
  message = '';
  type: 'itr' | 'immunization' = 'itr';

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required]],
      middleName: [''],
      lastName: ['', [Validators.required]],
      sex: ['', [Validators.required]],
      birthDate: ['', [Validators.required]],
      address: [''],
      phone: ['', [Validators.required, Validators.minLength(7)]],
      guardianName: [''],
      notes: ['']
    });
  }

  get pageTitle() {
    return this.type === 'immunization' ? 'Immunization — Patient Information' : 'Prenatal / ITR — Patient Information';
  }

  private async loadForEdit(id: string, type: 'itr' | 'immunization') {
    try {
      const collName = type === 'immunization' ? 'immunization' : 'itr';
      const docRef = doc(this.firestore, collName, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as any;

        // birthDate may be stored as a Firestore Timestamp or as a string.
        let birthDateVal: string = '';
        const rawBirth = data['birthDate'];
        if (rawBirth && (rawBirth as any).toDate) {
          // Firestore Timestamp
          const d = (rawBirth as any).toDate();
          birthDateVal = d.toISOString().slice(0, 10); // yyyy-mm-dd for input[type=date]
        } else if (typeof rawBirth === 'string') {
          // attempt to normalize strings like YYYY-MM-DD or ISO
          const dd = new Date(rawBirth);
          if (!isNaN(dd.getTime())) birthDateVal = dd.toISOString().slice(0, 10);
          else birthDateVal = rawBirth;
        } else {
          birthDateVal = '';
        }

        this.form.patchValue({
          firstName: data['firstName'] || '',
          middleName: data['middleName'] || '',
          lastName: data['lastName'] || '',
          sex: data['sex'] || '',
          birthDate: birthDateVal,
          address: data['address'] || '',
          phone: data['phone'] || '',
          guardianName: data['guardianName'] || '',
          notes: data['notes'] || ''
        });
      }
    } catch (err) {
      console.error('loadForEdit error', err);
    }
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const t = params['type'];
      if (t === 'immunization') this.type = 'immunization';
      else this.type = 'itr';

      const id = params['id'];
      if (id) this.loadForEdit(id, this.type);
    });
  }

  get f() { return this.form.controls as any; }

  async onSubmit() {
    this.submitted = true;
    if (this.form.invalid) return;

    this.submitting = true;
    try {
      const raw = { ...this.form.value } as any;

      // Normalize birthDate: keep as YYYY-MM-DD string (you can adjust to Date/Timestamp if you prefer)
      if (raw.birthDate && typeof raw.birthDate === 'string') {
        raw.birthDate = raw.birthDate; // keep as string
      }

      // Attach patient session info if present (from quick patient login)
      const patientId = localStorage.getItem('patientId');
      const patientFullName = localStorage.getItem('patientFullName');
      if (patientId) raw.patientId = patientId;
      if (patientFullName) raw.patientFullName = patientFullName;

      // mark record type so other parts of app know which collection/type this is
      raw.recordType = this.type;

      const id = this.route.snapshot.queryParams['id'];
      const collName = this.type === 'immunization' ? 'immunization' : 'itr';

      if (id) {
        const docRef = doc(this.firestore, collName, id);
        raw.updatedAt = serverTimestamp();
        await updateDoc(docRef, raw);
        this.message = 'Your information was updated.';
      } else {
        raw.createdAt = serverTimestamp();
        await addDoc(collection(this.firestore, collName), raw);
        this.message = 'Thank you — your information was submitted successfully.';
      }

      // navigate back after short pause so user sees message
      setTimeout(() => {
        this.router.navigate(['/patient'], { queryParams: { bare: true } });
      }, 900);
    } catch (err: any) {
      console.error('submit error', err);
      this.message = 'There was an error submitting your information. Please try again later.';
    } finally {
      this.submitting = false;
    }
  }
}
