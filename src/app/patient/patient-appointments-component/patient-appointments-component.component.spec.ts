import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientAppointmentsComponentComponent } from './patient-appointments-component.component';

describe('PatientAppointmentsComponentComponent', () => {
  let component: PatientAppointmentsComponentComponent;
  let fixture: ComponentFixture<PatientAppointmentsComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientAppointmentsComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientAppointmentsComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
