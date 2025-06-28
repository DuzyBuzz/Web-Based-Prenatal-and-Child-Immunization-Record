import { Component, ElementRef, OnChanges, OnDestroy, OnInit, Renderer2, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Firestore, collection, addDoc, collectionData, deleteDoc, doc, docData  } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { inject } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { Router } from '@angular/router';
@Component({
  selector: 'app-immunization',
  standalone: false,
  templateUrl: './immunization.component.html',
  styleUrl: './immunization.component.scss'
})
export class ImmunizationComponent {
  isModalOpen: boolean = false; // Flag to control modal visibility
  children: any[] = [];
  search: string = '';
  searchAttendantTerm: string = '';
  searchPatientTerm: string = '';
  searchMotherTerm: string = '';
  filterByOwn: boolean = false;
  showContextMenu = false;
  showDeleteModal = false;
  confirmName: string = '';
  selectedChild: any = null;
  contextMenuPosition = { x: '0px', y: '0px' }; // To hold the position of the context menu
  showPermissionError = false;
  filteredChildrenList: any[] = [];
  isSidebarHidden: boolean = false;
  selectedChildId: string | null = null;
  userDetails: any = {}; // To store user details
  error: string | null = null;
  loading = true;
  noPatientFound = false;
  notificationMessage: string = '';
  notificationType: 'success' | 'error' = 'success';
  currentUserUid: string | null = null;
  navigating= false;
  spinnerMessage = '';



  toggleActionButtons(childId: string) {
    this.selectedChildId = this.selectedChildId === childId ? null : childId;
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
    this.fetchchildren();
    this.loadUserDetails();
    this.auth.onAuthStateChanged(user => {
      this.currentUserUid = user?.uid || null;
    });
    // Set timeout for 1 minute to show "no patient found"
    setTimeout(() => {
      if (this.loading && this.children.length === 0) {
        this.noPatientFound = true;
        this.loading = false;
      }
    }, 60000); // 60 seconds
    this.loadChildren();
    this.clickListener = this.renderer.listen('document', 'click', (event: MouseEvent) => this.onDocumentClick(event));
  }

  toggleFilterByOwn(): void {
    this.filterByOwn = !this.filterByOwn;
  }
  fetchchildren() {
    // Simulate async call (replace with actual Firestore call)
    setTimeout(() => {
      // this.children = []; // Test empty
      // this.children = [mock data]; // For testing with values
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
    openModal(childId: string): void {
      this.selectedChildId = childId; // Set the selected child ID
      this.isModalOpen = true; // Open the modal
    }

    // This method is called to close the modal
    closeModal(): void {
      this.isModalOpen = false; // Close the modal
      this.selectedChildId = null; // Optionally reset selectedChildId
    }
    // Set selectedChildId when a child is clicked
  selectChild(childId: string): void {
    this.selectedChildId = childId;
    console.log('Selected Child ID Child:', this.selectedChildId);
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


  openDeleteModal(child: any): void {
    const currentUserUid = this.auth.currentUser?.uid;
    if (child.uid !== currentUserUid) {
      this.showPermissionError = true;
      return;
    }
    this.selectedChild = child;
    this.showDeleteModal = true;
    this.showContextMenu = false;

  }

  // Load children from Firestore and populate user details
  loadChildren(): void {
    const ref = collection(this.firestore, 'immunization');
    collectionData(ref, { idField: 'id' }).subscribe((data: any[]) => {
      this.children = data;
      this.loadUserDetailsForChildren();
    });
  }
    // Load user details based on the UID in each child's document
    loadUserDetailsForChildren(): void {
      // Use forkJoin to fetch user details for all children concurrently
      const userDetailsObservables: Observable<any>[] = this.children.map(child => {
        const userRef = doc(this.firestore, `users/${child.uid}`);
        return docData(userRef);
      });

      forkJoin(userDetailsObservables).subscribe(userDetails => {
        this.children.forEach((child, index) => {
          child.userDetails = userDetails[index]; // Attach userDetails to the child object
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
    this.filteredChildrenList = this.filteredChildren();
  }

  filteredChildren() {
    const currentUserUid = this.auth.currentUser?.uid;

    let filtered = this.children;

    if (this.filterByOwn) {
      // Filter only the child's records belonging to the current user
      filtered = filtered.filter(child => child.uid === currentUserUid);
    }

    // Filter based on search terms if provided
    if (this.searchMotherTerm.trim()) {
      filtered = filtered.filter(child =>
        child.mother?.toLowerCase().includes(this.searchMotherTerm.toLowerCase())
      );
    }

    if (this.searchAttendantTerm.trim()) {
      filtered = filtered.filter(child =>
        child.nurseName?.toLowerCase().includes(this.searchAttendantTerm.toLowerCase())
      );
    }

    if (this.searchPatientTerm.trim()) {
      filtered = filtered.filter(child =>
        child.name.toLowerCase().includes(this.searchPatientTerm.toLowerCase())
      );
    }

    return filtered;
  }




  // Update the context menu position based on mouse event
  openContextMenu(event: MouseEvent, child: any): void {
    event.preventDefault(); // Prevent the default right-click context menu

    this.selectedChild = child;

    // Check if the logged-in user UID matches the child UID
    const currentUserUid = this.auth.currentUser?.uid;
    if (child.uid !== currentUserUid) {
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
      this.router.navigate(['/HCP/Immunization-Patients']).then(() => {
        this.navigating = false; // Reset after navigation completes
      });
    }, 4000);
  }

  async deleteChild(): Promise<void> {
    if (this.confirmName === this.selectedChild.name) {
      try {
        const ref = doc(this.firestore, 'immunization', this.selectedChild.id);
        await deleteDoc(ref);
        this.navigating= true;
        this.spinnerMessage = "Deleting Patient...";
        this.closeDeleteModal();
        this.selectedChildId = "";
        this.router.navigate(['/HCP/Immunization-Patients']);
        this.loadChildren();
      } catch (error) {
        console.error('Error deleting child:', error);
        alert('Failed to delete the record. Please try again.');
      }
    }
  }

  openEditForm(child: any): void {
    const currentUserUid = this.auth.currentUser?.uid;
    if (child.uid !== currentUserUid) {
      this.showPermissionError = true;
      return;
    }
    console.log('Edit', child);
    this.showContextMenu = false;
    // Implement edit logic here
  }

  // Close the permission error modal
  closePermissionError(): void {
    this.showPermissionError = false;
  }

}
