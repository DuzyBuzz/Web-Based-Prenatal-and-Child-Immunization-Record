import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChildrenimmunizationformPrintOnlyComponent } from './childrenimmunizationform-print-only.component';

describe('ChildrenimmunizationformPrintOnlyComponent', () => {
  let component: ChildrenimmunizationformPrintOnlyComponent;
  let fixture: ComponentFixture<ChildrenimmunizationformPrintOnlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChildrenimmunizationformPrintOnlyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChildrenimmunizationformPrintOnlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
