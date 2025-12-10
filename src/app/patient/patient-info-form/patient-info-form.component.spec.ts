import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientInfoFormComponent } from './patient-info-form.component';

describe('PatientInfoFormComponent', () => {
  let component: PatientInfoFormComponent;
  let fixture: ComponentFixture<PatientInfoFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientInfoFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientInfoFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
