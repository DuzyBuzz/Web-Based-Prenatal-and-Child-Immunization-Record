import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

interface HCPUser {
  id?: string;
  email: string;
  name: string;
  password?: string; // Add password field
}

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
  standalone: true,
  imports: [FormsModule,CommonModule, ReactiveFormsModule]
})
export class AdminUsersComponent implements OnInit {
  users$: Observable<HCPUser[]>;
  userForm: FormGroup;
  editingUser: HCPUser | null = null;
  loading = false;

  constructor(private firestore: Firestore, private fb: FormBuilder) {
    const hcpCollection = collection(this.firestore, 'HCP');
    this.users$ = collectionData(hcpCollection, { idField: 'id' }) as Observable<HCPUser[]>;
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      name: ['', Validators.required],
      password: ['', Validators.required] // Add password control
    });
  }

  ngOnInit(): void {}

  async addOrUpdateUser() {
    if (this.userForm.invalid) return;
    this.loading = true;
    const value = this.userForm.value;
    const hcpCollection = collection(this.firestore, 'HCP');
    try {
      if (this.editingUser) {
        // Update
        const userDoc = doc(this.firestore, 'HCP', this.editingUser.id!);
        await updateDoc(userDoc, { email: value.email, name: value.name, password: value.password });
      } else {
        // Add
        await addDoc(hcpCollection, { email: value.email, name: value.name, password: value.password });
      }
      this.cancelEdit();
    } finally {
      this.loading = false;
    }
  }

  editUser(user: HCPUser) {
    this.editingUser = user;
    this.userForm.setValue({ email: user.email, name: user.name, password: user.password ?? '' });
  }

  cancelEdit() {
    this.editingUser = null;
    this.userForm.reset();
  }

  async deleteUser(user: HCPUser) {
    if (!user.id) return;
    if (!confirm(`Delete user "${user.name}"?`)) return;
    this.loading = true;
    try {
      const userDoc = doc(this.firestore, 'HCP', user.id);
      await deleteDoc(userDoc);
    } finally {
      this.loading = false;
    }
  }
}
