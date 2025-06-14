import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItrRecordsComponent } from './itr-records.component';

describe('ItrRecordsComponent', () => {
  let component: ItrRecordsComponent;
  let fixture: ComponentFixture<ItrRecordsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItrRecordsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItrRecordsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
