import { Injectable } from '@angular/core';
import {
  Auth, User, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updateProfile
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {
    onAuthStateChanged(this.auth, async (user) => {
      this.userSubject.next(user);
      if (!user) {
        this.router.navigate(['/auth/login']);
      } else if (user.providerData.some(p => p.providerId === 'phone')) {
        // If logged in with phone, redirect to /patient
        this.router.navigate(['/patient']);
      } else {
        const isComplete = await this.isProfileComplete(user.uid);
        if (!isComplete) {
          this.router.navigate(['/auth/setup-user']);
        }
      }
    });
  }

  getCurrentUser(): Observable<User | null> {
    return this.userSubject.asObservable();
  }


  async getCurrentUserId(): Promise<string | null> {
    return this.userSubject.value?.uid ?? null;
  }

  async registerWithEmail(email: string, password: string, name: string): Promise<void> {
    this.loadingSubject.next(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email.trim(), password.trim());
      const user = userCredential.user;

      if (user) {
        await updateProfile(user, { displayName: name });
        await setDoc(doc(this.firestore, 'users', user.uid), {
          uid: user.uid,
          name,
          email,
          isFirstLogin: true
        });
        this.router.navigate(['/auth/setup-user']);
      }
    } catch (error) {
      throw this.handleAuthError(error);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async loginWithCredentials(email: string, password: string): Promise<void> {
    this.loadingSubject.next(true);
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email.trim(), password.trim());
      const user = userCredential.user;

      const isComplete = await this.isProfileComplete(user.uid);
      if (!isComplete) {
        this.router.navigate(['/auth/setup-user']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      throw this.handleAuthError(error);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async googleSignIn(): Promise<User> {
    this.loadingSubject.next(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);

      if (!result.user) throw new Error('Google login failed.');
      return result.user;
    } catch (error) {
      throw this.handleAuthError(error);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async logout(): Promise<void> {
    this.loadingSubject.next(true);
    try {
      await signOut(this.auth);
      this.router.navigate(['/auth/login']);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async isProfileComplete(uid: string): Promise<boolean> {
    const userDocRef = doc(this.firestore, 'users', uid);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) return false;

    const data = docSnap.data();
    return !!data['name'] && !!data['contactNumber'] && !!data['hospitalName'] && !!data['hospitalAddress'];
  }

  private handleAuthError(error: any): string {
    switch (error.code) {
      case 'auth/email-already-in-use': return 'Email is already in use.';
      case 'auth/invalid-email': return 'Invalid email format.';
      case 'auth/weak-password': return 'Password should be at least 6 characters.';
      case 'auth/wrong-password': return 'Incorrect password.';
      default: return 'Authentication failed.';
    }
  }

  getAdminEmail(): string {
    return environment.adminEmail;
  }

  getLoadingState(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }

  async checkObGyneData(uid: string): Promise<boolean> {
    const obGyneDocRef = doc(this.firestore, 'users', uid);
    const docSnap = await getDoc(obGyneDocRef);
    return docSnap.exists();
  }

  private async isFirstLogin(uid: string): Promise<boolean> {
    const userDocRef = doc(this.firestore, 'users', uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const userData = docSnap.data();
      return userData['isFirstLogin'] === true;
    }
    return false;
  }
}
