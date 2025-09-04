import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewItrFormComponent } from './new-itr-form.component';

describe('NewItrFormComponent', () => {
  let component: NewItrFormComponent;
  let fixture: ComponentFixture<NewItrFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewItrFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewItrFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
