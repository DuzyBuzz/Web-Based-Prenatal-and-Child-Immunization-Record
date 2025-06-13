import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndividualTreatmentRecordComponent } from './individual-treatment-record.component';

describe('IndividualTreatmentRecordComponent', () => {
  let component: IndividualTreatmentRecordComponent;
  let fixture: ComponentFixture<IndividualTreatmentRecordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndividualTreatmentRecordComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IndividualTreatmentRecordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
