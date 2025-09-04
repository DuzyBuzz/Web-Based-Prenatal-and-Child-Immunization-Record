import { Component, ElementRef, OnChanges, OnDestroy, OnInit, Renderer2, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Firestore, collection, addDoc, collectionData, deleteDoc, doc, docData  } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { inject } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-prenatal',
  standalone: false,
  templateUrl: './prenatal.component.html',
  styleUrls: ['./prenatal.component.scss']
})
export class PrenatalComponent implements OnInit, OnDestroy, OnChanges {
  isModalOpen: boolean = false; // Flag to control modal visibility
  mothers: any[] = []; // This will now hold ITR records
  searchHospitalTerm: string = '';
  searchAttendantTerm: string = '';
  searchPatientTerm: string = '';
  filterByOwn: boolean = false;
  showContextMenu = false;
  showDeleteModal = false;
  confirmName: string = '';
  selectedMother: any = null;
  contextMenuPosition = { x: '0px', y: '0px' }; // To hold the position of the context menu
  showPermissionError = false;
  filteredMothersList: any[] = [];
  isSidebarHidden: boolean = false;
  selectedMotherId: string | null = null;
  motherId: string | null = null; // The input motherId (could be passed from a parent component)
  motherUid: string | null = null; // The UID of the mother
  userDetails: any = {}; // To store user details
  error: string | null = null;
  loading = true;
  noPatientFound = false;
  notificationMessage: string = '';
  notificationType: 'success' | 'error' = 'success';
  currentUserUid: string | null = null;
  navigating= false;
  spinnerMessage = '';
  emergencyForm: any;
  motherForm: any;
  showEmergency: boolean | undefined;

  toggleActionButtons(motherId: string) {
    this.selectedMotherId = this.selectedMotherId === motherId ? null : motherId;
  }

  private clickListener!: () => void;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private renderer: Renderer2,
    private el: ElementRef,
    private auth: Auth,
    private router: Router

  ) {}
  ngOnChanges(): void {
  }

  ngOnInit(): void {
    this.fetchITRRecords();
    this.loadUserDetails();
    this.auth.onAuthStateChanged(user => {
      this.currentUserUid = user?.uid || null;
    });
    setTimeout(() => {
      if (this.loading && this.mothers.length === 0) {
        this.noPatientFound = true;
        this.loading = false;
      }
    }, 60000);
    // Remove motherForm and emergencyForm if not needed for ITR
    this.loadITRRecords();
    this.clickListener = this.renderer.listen('document', 'click', (event: MouseEvent) => this.onDocumentClick(event));
  }
  loadITRRecords() {
    throw new Error('Method not implemented.');
  }

  // Fetch all ITR records
  fetchITRRecords() {
    const ref = collection(this.firestore, 'itr');
    collectionData(ref, { idField: 'id' }).subscribe((data: any[]) => {
      this.mothers = data;
      this.loading = false;
    });
  }

  toggleFilterByOwn(): void {
    this.filterByOwn = !this.filterByOwn;
  }
  fetchMothers() {
    // Simulate async call (replace with actual Firestore call)
    setTimeout(() => {
      // this.mothers = []; // Test empty
      // this.mothers = [mock data]; // For testing with values
      this.loading = false;
    }, 2000); // simulate fetch delay
  }
  loadUserDetails(): void {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    const userDoc = doc(this.firestore, 'users', uid);
    docData(userDoc).subscribe(data => {
      this.userDetails = data;
    });
  }
  ngOnDestroy(): void {
    if (this.clickListener) {
      this.clickListener();
    }
  }
    // This method is called when the 'Edit' button is clicked
    openModal(motherId: string): void {
      this.selectedMotherId = motherId; // Set the selected mother ID
      this.isModalOpen = true; // Open the modal
    }

    // This method is called to close the modal
    closeModal(): void {
      this.isModalOpen = false; // Close the modal
      this.selectedMotherId = null; // Optionally reset selectedMotherId
    }
    // Set selectedMotherId when a mother is clicked
  selectMother(motherId: string): void {
    this.selectedMotherId = motherId;
    console.log('Selected Mother ID parent:', this.selectedMotherId);
    console.log('User ID:', this.userDetails);

    this.isSidebarHidden = true; // hide the sidebar and show pregnancy record component
  }

  // Method to toggle the sidebar visibility
  toggleSidebar(): void {
    this.isSidebarHidden = !this.isSidebarHidden;

  }

  // Add a method to prevent closing when clicking inside the context menu
  onContextMenuClick(event: MouseEvent): void {
    event.stopPropagation(); // Prevents click from propagating to the document click listener
  }

  onDocumentClick(event: MouseEvent): void {
    const contextMenuElement = this.el.nativeElement.querySelector('.absolute');
    if (contextMenuElement && !contextMenuElement.contains(event.target as Node)) {
      this.closeContextMenu();
    }
  }

  atLeastOneEmergency(): boolean {
    const { spouseContact, parentContact, fatherContact } = this.emergencyForm.value;
    return spouseContact || parentContact || fatherContact;
  }

  async submitMother() {
    if (this.motherForm.valid) {
      this.showEmergency = true;
    }
  }

  async submitAll() {
    if (this.atLeastOneEmergency()) {
      const motherInfo = this.motherForm.value;
      const emergencyInfo = this.emergencyForm.value;
      const data = { ...motherInfo, ...emergencyInfo };

      try {
        this.navigating = true;
        this.spinnerMessage = 'Saving Patient Information...'
        const ref = collection(this.firestore, 'itr');
        await addDoc(ref, data);

        this.notificationMessage = 'Mother and emergency info saved successfully!';
        this.notificationType = 'success';

        this.motherForm.reset();
        this.emergencyForm.reset();
        this.showEmergency = false;

        this.loadMothers();
      } catch (error) {
        console.error(error);
        this.notificationMessage = 'Failed to save data. Please try again.';
        this.notificationType = 'error';
      }
    } else {
      this.notificationMessage = 'Please provide at least one emergency contact.';
      this.notificationType = 'error';
    }

    // Clear the message after 4 seconds
    setTimeout(() => {
      this.notificationMessage = '';
    }, 4000);
  }

  openDeleteModal(mother: any): void {
    this.selectedMother = mother;
    this.showDeleteModal = true;
    this.showContextMenu = false;
  }

  // Load mothers from Firestore and populate user details
  loadMothers(): void {
    const ref = collection(this.firestore, 'itr');
    collectionData(ref, { idField: 'id' }).subscribe((data: any[]) => {
      this.mothers = data;
      this.loadUserDetailsForMothers();
    });
  }
    // Load user details based on the UID in each mother's document
    loadUserDetailsForMothers(): void {
      // Use forkJoin to fetch user details for all mothers concurrently
      const userDetailsObservables: Observable<any>[] = this.mothers.map(mother => {
        const userRef = doc(this.firestore, `users/${mother.createdBy}`);
        return docData(userRef);
      });

      forkJoin(userDetailsObservables).subscribe(userDetails => {
        this.mothers.forEach((mother, index) => {
          mother.userDetails = userDetails[index]; // Attach userDetails to the mother object
        });
        this.loading = false;
      });
    }

  async fetchUserDetails(uid: string): Promise<any> {
    const userDoc = doc(this.firestore, 'users', uid);
    const userData = await docData(userDoc).toPromise();
    return userData; // Return the user details for the given uid
  }
  // Method to handle filter changes
  onFilterChange(): void {
    this.filteredMothersList = this.filteredMothers();
  }

  filteredMothers() {
    const currentUserUid = this.auth.currentUser?.uid;
    let filtered = this.mothers;

    if (this.filterByOwn) {
      filtered = filtered.filter(itr => itr.createdBy === currentUserUid);
    }

    if (this.searchAttendantTerm.trim()) {
      filtered = filtered.filter(itr =>
        (itr.nurseName || '').toLowerCase().includes(this.searchAttendantTerm.toLowerCase())
      );
    }

    if (this.searchPatientTerm.trim()) {
      filtered = filtered.filter(itr =>
        (`${itr.lastName || ''} ${itr.firstName || ''} ${itr.middleName || ''}`.toLowerCase()
        .includes(this.searchPatientTerm.toLowerCase()))
      );
    }

    return filtered;
  }




  // Update the context menu position based on mouse event
  openContextMenu(event: MouseEvent, mother: any): void {
    event.preventDefault(); // Prevent the default right-click context menu

    this.selectedMother = mother;

    // Check if the logged-in user UID matches the mother UID
    const currentUserUid = this.auth.currentUser?.uid;
    if (mother.createdBy !== currentUserUid) {
      this.showPermissionError = true;
      return;
    }

    this.showContextMenu = true;

    // Set the position of the context menu
    this.contextMenuPosition = {
      x: `${event.pageX + 5}px`, // 5px offset to the right of the cursor
      y: `${event.pageY + 5}px`, // 5px offset below the cursor
    };
  }

  closeContextMenu(): void {
    this.showContextMenu = false;
  }

  closeDeleteModal(): void {

    this.showDeleteModal = false;
    this.confirmName = '';


    setTimeout(() => {
      this.router.navigate(['/HCP/Prenatal-Patients']).then(() => {
        this.navigating = false; // Reset after navigation completes
      });
    }, 4000);
  }

  async deleteMother(): Promise<void> {
    if (this.confirmName === this.selectedMother.firstName + ' ' + this.selectedMother.middleName + ' ' + this.selectedMother.lastName) {
      try {
        const ref = doc(this.firestore, 'itr', this.selectedMother.id);
        await deleteDoc(ref);
        this.navigating= true;
        this.spinnerMessage = "Deleting Patient...";
        this.closeDeleteModal();
        this.selectedMotherId = "";
        this.router.navigate(['/HCP/Prenatal-Patients']);
        this.loadMothers();
      } catch (error) {
        console.error('Error deleting mother:', error);
        alert('Failed to delete the record. Please try again.');
      }
    }
  }

  openEditForm(mother: any): void {
    // Permission check removed, always allow edit
    console.log('Edit', mother);
    this.showContextMenu = false;
    // Implement edit logic here
  }

  // Remove showPermissionError and closePermissionError logic
}
