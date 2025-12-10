import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, query, where, getDocs, deleteDoc, doc } from '@angular/fire/firestore';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-patient-records',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="p-4 max-w-3xl mx-auto">
    <h2 class="text-2xl font-semibold mb-4">My Records</h2>
    <div class="flex gap-2 mb-4">
<a
  [routerLink]="['/patient','patient-info']"
  [queryParams]="{ type: 'itr', bare: true }"
  class="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded transition"
>
  New Prenatal / ITR
</a>

<a
  [routerLink]="['/patient','patient-info']"
  [queryParams]="{ type: 'immunization', bare: true }"
  class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
>
  New Immunization
</a>

      <button (click)="refresh()" class="px-3 py-2 bg-gray-200 rounded">Refresh</button>
    </div>

    <div *ngIf="!patientId" class="text-red-600">No patient is signed in. Please sign in as a patient from the login page.</div>

    <div *ngIf="patientId">
      <h3 class="text-xl font-semibold mt-4">Prenatal / ITR</h3>
      <div *ngIf="itrRecords.length === 0" class="text-sm text-gray-600">No records yet.</div>
      <ul>
        <li *ngFor="let r of itrRecords" class="border rounded p-3 my-2 flex justify-between items-start">
          <div>
            <div class="font-semibold">{{ r.firstName }} {{ r.lastName }}</div>
            <div class="text-sm text-gray-600">{{ r.phone }} • {{ r.birthDate }}</div>
            <div *ngIf="r.nextPrenatal" class="mt-2"><span class="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded">Scheduled: {{ r.nextPrenatal | date:'MMMM d, y' }}</span></div>
            <div *ngIf="!r.nextPrenatal" class="mt-2"><span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">No schedule</span></div>
              <div *ngIf="appointmentsByRecordId[r.id]?.length" class="mt-3">
                <div class="text-sm text-gray-700 font-medium">Appointments</div>
                <ul class="mt-1">
                  <li *ngFor="let a of appointmentsByRecordId[r.id]" class="text-sm text-gray-600">
                    <div>
                      {{ a.name || 'Appointment' }}
                      <span *ngIf="a.displayDate" class="text-xs text-emerald-600"> — {{ a.displayDate | date:'MMMM d, y' }}</span>
                    </div>
                  </li>
                </ul>
              </div>
          </div>
          <div class="flex gap-2">
            <a [routerLink]="['/patient','patient-info']" [queryParams]="{ type: 'itr', id: r.id, bare: true }" class="px-2 py-1 bg-yellow-400 rounded">Edit</a>
            <button (click)="deleteRecord('itr', r.id)" class="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
          </div>
        </li>
      </ul>

      <h3 class="text-xl font-semibold mt-6">Immunization</h3>
      <div *ngIf="imRecords.length === 0" class="text-sm text-gray-600">No records yet.</div>
      <ul>
        <li *ngFor="let r of imRecords" class="border rounded p-3 my-2 flex justify-between items-start">
          <div>
            <div class="font-semibold">{{ r.firstName }} {{ r.lastName }}</div>
            <div class="text-sm text-gray-600">{{ r.phone }} • {{ r.birthDate }}</div>
            <div *ngIf="r.SecondWednesdayNextMonth" class="mt-2"><span class="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded">Scheduled: {{ r.SecondWednesdayNextMonth | date:'MMMM d, y' }}</span></div>
            <div *ngIf="!r.SecondWednesdayNextMonth" class="mt-2"><span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">No schedule</span></div>
              <div *ngIf="appointmentsByRecordId[r.id]?.length" class="mt-3">
                <div class="text-sm text-gray-700 font-medium">Appointments</div>
                <ul class="mt-1">
                  <li *ngFor="let a of appointmentsByRecordId[r.id]" class="text-sm text-gray-600">
                    <div>
                      {{ a.name || 'Appointment' }}
                      <span *ngIf="a.displayDate" class="text-xs text-emerald-600"> — {{ a.displayDate | date:'MMMM d, y' }}</span>
                    </div>
                  </li>
                </ul>
              </div>
          </div>
          <div class="flex gap-2">
            <a [routerLink]="['/patient','patient-info']" [queryParams]="{ type: 'immunization', id: r.id, bare: true }" class="px-2 py-1 bg-yellow-400 rounded">Edit</a>
            <button (click)="deleteRecord('immunization', r.id)" class="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
  `
})
export class PatientRecordsComponent implements OnInit {
  patientId: string | null = null;
  itrRecords: any[] = [];
  imRecords: any[] = [];
  appointmentsByRecordId: { [key: string]: any[] } = {};

  constructor(private firestore: Firestore, private router: Router) {}

  async ngOnInit() {
    this.patientId = localStorage.getItem('patientId');
    await this.refresh();
  }

  async refresh() {
    if (!this.patientId) return;
    // load itr
    try {
      const db = this.firestore as any;
      const q1 = query(collection(db, 'itr'), where('patientId', '==', this.patientId));
      const snap1 = await getDocs(q1);
      this.itrRecords = snap1.docs.map(d => ({ id: d.id, ...d.data() }));

      const q2 = query(collection(db, 'immunization'), where('patientId', '==', this.patientId));
      const snap2 = await getDocs(q2);
      this.imRecords = snap2.docs.map(d => ({ id: d.id, ...d.data() }));

      // For each record, load any appointments linked to the record (by phone/contact)
      const allRecords = [...this.itrRecords, ...this.imRecords];
      for (const rec of allRecords) {
        this.appointmentsByRecordId[rec.id] = await this.loadAppointmentsForRecord(rec);
      }
    } catch (err) {
      console.error('refresh error', err);
    }
  }

  private async loadAppointmentsForRecord(rec: any): Promise<any[]> {
    try {
      const db = this.firestore as any;
      // Determine a phone to query by: prefer `phone`, then `contact`, then patientPhone from localStorage
      let phone = rec.phone || rec.contact || localStorage.getItem('patientPhone') || null;
      if (!phone) return [];
      phone = String(phone).trim();
      // Normalize '+63' -> '0' and remove spaces/dashes
      if (phone.startsWith('+63')) phone = '0' + phone.slice(3);
      phone = phone.replace(/[^0-9]/g, '');

      const results: any[] = [];

      // Try appointment.contactNumber
      const qA = query(collection(db, 'appointment'), where('contactNumber', '==', phone));
      const snapA = await getDocs(qA);
      for (const d of snapA.docs) {
        const data = d.data();
        const apt = this.normalizeAppointmentData(data);
        results.push(apt);
      }

      // Try appointment.contact (some records use 'contact')
      const qB = query(collection(db, 'appointment'), where('contact', '==', phone));
      const snapB = await getDocs(qB);
      for (const d of snapB.docs) {
        const data = d.data();
        const apt = this.normalizeAppointmentData(data);
        // avoid duplicates by checking for same id/date/name
        if (!results.find(r => r._docId === d.id && r.displayDate?.getTime() === apt.displayDate?.getTime())) {
          results.push(apt);
        }
      }

      // Sort by date ascending
      results.sort((a, b) => {
        const da = a.displayDate ? a.displayDate.getTime() : Infinity;
        const dbt = b.displayDate ? b.displayDate.getTime() : Infinity;
        return da - dbt;
      });

      return results;
    } catch (err) {
      console.error('loadAppointmentsForRecord error', err);
      return [];
    }
  }

  private normalizeAppointmentData(data: any): any {
    // Extract a displayable date from common fields
    const raw = data.date || data.scheduledAt || data.appointmentDate || data.appointment || data.appointmentName || data.scheduled || null;
    let displayDate: Date | null = null;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) displayDate = d;
    }
    return {
      _docId: data.id || null,
      name: data.appointmentName || data.name || data.appointment || null,
      raw,
      displayDate,
      original: data
    };
  }

  async deleteRecord(collectionName: string, id: string) {
    if (!confirm('Delete this record?')) return;
    try {
      const db = this.firestore as any;
      await deleteDoc(doc(db, collectionName, id));
      this.refresh();
    } catch (err) {
      console.error('delete error', err);
      alert('Unable to delete record.');
    }
  }
}
