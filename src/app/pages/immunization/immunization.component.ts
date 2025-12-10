import { Component, ElementRef, OnChanges, OnDestroy, OnInit, Renderer2, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Firestore, collection, addDoc, collectionData, deleteDoc, doc, docData, updateDoc, getDoc  } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../../auth/auth.service';
import { inject } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { SmsService } from '../../services/sms.service';
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
  // Appointment modal state
  showAppointmentModal = false;
  selectedChildForAppointment: any = null;
  appointmentDate: string = '';



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
    private authService: AuthService,
    private router: Router,
    private smsService: SmsService

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
    console.log('Edit', child);
    this.showContextMenu = false;
    // Implement edit logic here
  }

  // Open appointment modal for a child
  openAppointmentModal(child: any): void {
    this.selectedChildForAppointment = child;
    this.appointmentDate = child.SecondWednesdayNextMonth || this.getSecondWednesdayNextMonth();
    this.showAppointmentModal = true;
    this.selectedChildId = null; // Close action buttons
  }

  // Close appointment modal
  closeAppointmentModal(): void {
    this.showAppointmentModal = false;
    this.selectedChildForAppointment = null;
    this.appointmentDate = '';
  }

  // Save appointment date
  async saveAppointment(): Promise<void> {
    if (!this.appointmentDate || !this.selectedChildForAppointment) {
      alert('Please select a date.');
      return;
    }

    try {
      const docRef = doc(this.firestore, 'immunization', this.selectedChildForAppointment.id);
      
      // Get HCP name from current login
      let attendantName = '';
      let userId = '';
      
      // First check Firebase Auth user
      const firebaseUser = this.auth.currentUser;
      if (firebaseUser?.uid) {
        userId = firebaseUser.uid;
        // Try to get from userDetails first (already loaded)
        if (this.userDetails?.name) {
          attendantName = this.userDetails.name;
          console.log('HCP name from userDetails (Firebase):', attendantName);
        } else {
          // If userDetails not available, fetch directly from users collection
          try {
            const userDocRef = doc(this.firestore, 'users', userId);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              attendantName = userDocSnap.data()['name'] || '';
              console.log('HCP name from users collection (Firebase):', attendantName);
            }
          } catch (err) {
            console.error('Error fetching HCP name from users collection:', err);
          }
        }
      } else {
        // Check custom auth user (stored in localStorage)
        const customAuthUser = this.authService.getAuthUser();
        if (customAuthUser) {
          attendantName = customAuthUser.name || '';
          userId = customAuthUser.id || '';
          console.log('HCP name from custom auth user:', attendantName);
        }
      }
      
      if (!attendantName) {
        console.warn('Warning: Could not fetch HCP name');
        alert('Error: Could not retrieve HCP information. Please refresh and try again.');
        return;
      }
      
      console.log('Saving appointment with nurseName:', attendantName, 'userId:', userId, 'for child:', this.selectedChildForAppointment.id);
      
      const updateData: any = { 
        SecondWednesdayNextMonth: this.appointmentDate, 
        nurseName: attendantName,
        updatedAt: new Date()
      };
      
      // Add HCP's user ID
      if (userId) {
        updateData.hcpUid = userId;
      }
      
      await updateDoc(docRef, updateData);
      console.log('✅ Successfully saved appointment to Firestore with nurseName:', attendantName);
      
      // Update local copy immediately
      if (this.selectedChildForAppointment) {
        this.selectedChildForAppointment.SecondWednesdayNextMonth = this.appointmentDate;
        this.selectedChildForAppointment.nurseName = attendantName;
        if (userId) {
          this.selectedChildForAppointment.hcpUid = userId;
        }
      }
      
      // Send SMS with attendant name (do not abort UI flow if no contact)
      try {
        const rawContact = this.selectedChildForAppointment?.contact || this.selectedChildForAppointment?.contactNumber || this.selectedChildForAppointment?.phone || this.selectedChildForAppointment?.motherContact || this.selectedChildForAppointment?.motherPhone;
        console.log('📱 Raw contact value:', rawContact);
        const contact = this.formatPHNumber(rawContact);
        console.log('📱 Formatted contact:', contact);

        const patientName = this.selectedChildForAppointment?.name || '';
        const motherName = this.selectedChildForAppointment?.mother || '';
        const nextDate = this.appointmentDate;
        const immediateMessage = `Good day ${motherName || patientName}, Next Immunization for ${patientName} is on ${nextDate}. Expect reminder on the day of your appointment.` + (attendantName ? `\nAttendant: ${attendantName}` : '');

        if (!contact) {
          console.warn('⚠️ WARNING: No valid phone number found for SMS');
        } else {
          console.log('📤 Sending immediate SMS to:', contact, 'Message:', immediateMessage);
          this.smsService.sendSms(contact, immediateMessage).subscribe({
            next: (res: any) => console.log('✅ Immediate SMS sent successfully:', res),
            error: (err: any) => {
              console.error('❌ Immediate SMS failed:', err);
              console.error('Error details:', err?.message, err?.status, err?.error);
            }
          });

          const scheduledAt = this.formatDateAt3AM(nextDate);
          const scheduledMessage = `Reminder: Immunization for ${patientName} is today (${nextDate}). Please visit the health center.` + (attendantName ? `\nAttendant: ${attendantName}` : '');
          if (scheduledAt) {
            console.log('📤 Scheduling reminder SMS for:', scheduledAt, 'To:', contact);
            this.smsService.scheduleSmsReminder(contact, scheduledMessage, scheduledAt).subscribe({
              next: (res: any) => console.log('✅ Scheduled SMS set successfully:', res),
              error: (err: any) => {
                console.error('❌ Scheduled SMS failed:', err);
                console.error('Error details:', err?.message, err?.status, err?.error);
              }
            });
          } else {
            console.warn('⚠️ Could not format scheduled date for reminder SMS');
          }
        }
      } catch (smsErr) {
        console.error('❌ SMS error:', smsErr);
      }

      this.notificationMessage = 'Appointment date updated successfully!';
      this.notificationType = 'success';
      this.closeAppointmentModal();
      
    } catch (error) {
      console.error('Error updating appointment:', error);
      this.notificationMessage = 'Failed to update appointment. Please try again.';
      this.notificationType = 'error';
    }

    setTimeout(() => {
      this.notificationMessage = '';
    }, 4000);
  }

  // Helper to get next second Wednesday
  private getSecondWednesdayNextMonth(): string {
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = (now.getMonth() + 1) % 12;
    let count = 0;
    for (let day = 1; day <= 15; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 3) {
        count++;
        if (count === 2) {
          return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
        }
      }
    }
    return '';
  }

  // Format a YYYY-MM-DD date string to API scheduled format at 03:00 AM (e.g. "YYYY-MM-DD 03:00AM")
  private formatDateAt3AM(dateStr: string): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T03:00:00');
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    let h = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    const hh = h.toString().padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:00${ampm}`;
  }

  // Normalize Philippine mobile numbers to 11-digit format starting with 09
  private formatPHNumber(raw: any): string {
    if (!raw) return '';
    const str = String(raw).trim();
    const digits = str.replace(/\D/g, '');
    // If starts with 9 and 10 digits, add leading 0
    if (digits.length === 10 && digits.startsWith('9')) return '0' + digits;
    if (digits.length === 11 && digits.startsWith('09')) return digits;
    return '';
  }
  // Removed permission error modal logic

}
