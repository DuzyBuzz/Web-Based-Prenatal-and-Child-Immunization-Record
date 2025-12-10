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

  private async loadForEdit(id: string, type: 'itr' | 'immunization') {
    try {
      const collName = type === 'immunization' ? 'immunization' : 'itr';
      const docRef = doc(this.firestore, collName, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        this.form.patchValue({
          firstName: data['firstName'] || '',
          middleName: data['middleName'] || '',
          lastName: data['lastName'] || '',
          sex: data['sex'] || '',
          birthDate: data['birthDate'] || '',
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
      const data: any = { ...this.form.value };
      const id = this.route.snapshot.queryParams['id'];
      const collName = this.type === 'immunization' ? 'immunization' : 'itr';

      // Attach patient session info if present (from quick patient login)
      const patientId = localStorage.getItem('patientId');
      const patientFullName = localStorage.getItem('patientFullName');
      if (patientId) data.patientId = patientId;
      if (patientFullName) data.patientFullName = patientFullName;

      if (id) {
        // update
        const docRef = doc(this.firestore, collName, id);
        data.updatedAt = serverTimestamp();
        await updateDoc(docRef, data);
        this.message = 'Your information was updated.';
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(this.firestore, collName), data);
        this.message = 'Thank you — your information was submitted successfully.';
      }
      // Small delay then navigate back to patient home or clear form
      setTimeout(() => {
        this.router.navigate(['/patient'], { queryParams: { bare: true } });
      }, 1200);
    } catch (err: any) {
      console.error('submit error', err);
      this.message = 'There was an error submitting your information. Please try again later.';
    } finally {
      this.submitting = false;
    }
  }
}
