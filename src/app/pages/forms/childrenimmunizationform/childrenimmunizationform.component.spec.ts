import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChildrenimmunizationformComponent } from './childrenimmunizationform.component';

describe('ChildrenimmunizationformComponent', () => {
  let component: ChildrenimmunizationformComponent;
  let fixture: ComponentFixture<ChildrenimmunizationformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChildrenimmunizationformComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChildrenimmunizationformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
