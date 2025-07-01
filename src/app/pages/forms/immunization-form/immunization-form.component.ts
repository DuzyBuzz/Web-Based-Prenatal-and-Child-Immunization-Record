import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Firestore, collection, addDoc, doc, getDoc, query, where, getDocs } from '@angular/fire/firestore';
import { SpinnnerComponent } from '../../../shared/core/spinnner/spinnner.component';
import { BusinessAddressMapComponent } from '../../../shared/core/business-address-map/business-address-map.component';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-immunization-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './immunization-form.component.html',
  styleUrls: ['./immunization-form.component.scss'] // ✅ fixed typo here
})
export class ImmunizationFormComponent {
  immunizationForm: FormGroup;
  isSubmitting = false;
  childId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private router: Router,
    private route: ActivatedRoute // Inject ActivatedRoute
  ) {
    // ✅ Initialize the form group with validations
    this.immunizationForm = this.fb.group({
      childName: ['', Validators.required],
      gender: ['', Validators.required],
      dob: ['', Validators.required],
      address: ['', Validators.required],
      birthWeight: [null, [Validators.required, Validators.min(0.5)]],
      birthLength: [null, [Validators.required, Validators.min(10)]],
      birthHeadCircumference: [null, [Validators.required, Validators.min(10)]],
      motherName: ['', Validators.required],
      fatherName: ['', Validators.required],
      motherContact: ['', [Validators.required, Validators.pattern(/^09\d{9}$/)]],
      fatherContact: ['', [Validators.required, Validators.pattern(/^09\d{9}$/)]],
    });
  }

  async ngOnInit() {
    console.log(this.childId);
    // Get childId from route if present
    this.childId = this.route.snapshot.paramMap.get('id');
    if (this.childId) {
      // Fetch data from Firestore
      const childDocRef = doc(this.firestore, 'children', this.childId);
      const childSnap = await getDoc(childDocRef);
      if (childSnap.exists()) {
        this.immunizationForm.patchValue(childSnap.data());
      } else {
        alert('Child record not found.');
        this.router.navigate(['/HCP/immunization']);
      }
    }
  }

  // ✅ Check if a field is invalid and touched
  isInvalid(controlName: string): boolean {
    const control = this.immunizationForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  // ✅ Return error messages for fields
  getErrorMessage(controlName: string): string {
    const control = this.immunizationForm.get(controlName);
    if (control?.hasError('required')) return 'This field is required.';
    if (control?.hasError('min')) return 'Value is too low.';
    if (control?.hasError('pattern')) return 'Invalid format.';
    return '';
  }

  // ✅ Form submission handler
  async submitForm() {
    if (this.immunizationForm.valid) {
      this.isSubmitting = true;
      const formData = this.immunizationForm.value;

      try {
        // Check if patient with the same name exists
        const childrenCollection = collection(this.firestore, 'immunization');
        const q = query(childrenCollection, where('name', '==', formData.name));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          alert('Patient already exists. Please search for the patient and edit the details.');
          this.router.navigate(['/HCP/immunization']);
          this.isSubmitting = false;
          return;
        }

        await addDoc(childrenCollection, {
          ...formData,
          createdAt: new Date(),
          typeofConsultation: "Immunization",
        });

        alert('✅ Immunization record saved successfully!');
        this.immunizationForm.reset();
      } catch (error) {
        console.error('❌ Firestore error:', error);
        alert('❌ Failed to save record. Please try again.');
      } finally {
        this.isSubmitting = false;
        this.router.navigate(['/HCP/immunization']);
      }
    } else {
      this.immunizationForm.markAllAsTouched(); // Trigger validation
    }
  }
}
