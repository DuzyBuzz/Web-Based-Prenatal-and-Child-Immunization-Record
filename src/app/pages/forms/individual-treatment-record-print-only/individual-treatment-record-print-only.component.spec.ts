import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndividualTreatmentRecordPrintOnlyComponent } from './individual-treatment-record-print-only.component';

describe('IndividualTreatmentRecordPrintOnlyComponent', () => {
  let component: IndividualTreatmentRecordPrintOnlyComponent;
  let fixture: ComponentFixture<IndividualTreatmentRecordPrintOnlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndividualTreatmentRecordPrintOnlyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IndividualTreatmentRecordPrintOnlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
