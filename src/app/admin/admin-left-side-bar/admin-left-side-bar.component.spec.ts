import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminLeftSideBarComponent } from './admin-left-side-bar.component';

describe('AdminLeftSideBarComponent', () => {
  let component: AdminLeftSideBarComponent;
  let fixture: ComponentFixture<AdminLeftSideBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLeftSideBarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminLeftSideBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
