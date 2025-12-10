import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Firestore, collection, collectionData, query, where } from '@angular/fire/firestore';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Observable, firstValueFrom, map, switchMap, of, Subscription } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reports',
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  // store raw and filtered arrays so we can show all columns dynamically
  itrFull: any[] = [];
  itrFiltered: any[] = [];
  immunizationFull: any[] = [];
  immunizationFiltered: any[] = [];
  itrLoading = true;
  immunizationLoading = true;
  uid: string | null = null;
  nurseName: string | null = null;

  // filter state
  dateField = 'createdDate'; // default field to filter by; users can change
  startDate: string | null = null; // ISO YYYY-MM-DD
  endDate: string | null = null; // ISO YYYY-MM-DD

  private subs: Subscription[] = [];

  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Always load full collections (show all data). Previously we filtered by the
    // logged-in user; per request, show all records and allow date filtering.
    const itrCollection = collection(this.firestore, 'itr');
    const itrSub = collectionData(itrCollection, { idField: 'id' }).subscribe((arr: any[]) => {
      this.itrFull = arr || [];
      this.applyFilters();
      this.itrLoading = false;
    }, err => {
      console.error('Error loading ITR records:', err);
      this.itrLoading = false;
    });
    this.subs.push(itrSub);

    const immunizationCollection = collection(this.firestore, 'immunization');
    const immSub = collectionData(immunizationCollection, { idField: 'id' }).subscribe((arr: any[]) => {
      this.immunizationFull = arr || [];
      this.applyFilters();
      this.immunizationLoading = false;
    }, err => {
      console.error('Error loading immunization records:', err);
      this.immunizationLoading = false;
    });
    this.subs.push(immSub);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // Apply date filters to both datasets
  applyFilters() {
    this.itrFiltered = this.filterByDateField(this.itrFull, this.dateField, this.startDate, this.endDate);
    this.immunizationFiltered = this.filterByDateField(this.immunizationFull, this.dateField, this.startDate, this.endDate);
  }

  clearFilters() {
    this.startDate = null;
    this.endDate = null;
    this.dateField = 'createdDate';
    this.applyFilters();
  }

  private filterByDateField(arr: any[], field: string, start?: string | null, end?: string | null) {
    if ((!start && !end) || !arr || arr.length === 0) return arr.slice();
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    return arr.filter(item => {
      let val: any = item[field] ?? item[field === 'createdDate' ? 'createdAt' : field];
      if (!val) return false;
      // Handle Firestore Timestamp
      if (val && typeof val.toDate === 'function') {
        val = val.toDate();
      } else if (typeof val === 'string') {
        val = new Date(val);
      } else if (typeof val === 'number') {
        val = new Date(val);
      }
      if (!(val instanceof Date) || isNaN(val.getTime())) return false;
      if (s && val < s) return false;
      if (e) {
        // include the end day fully
        const endOfDay = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
        if (val > endOfDay) return false;
      }
      return true;
    });
  }

  async downloadExcel(type: 'itr' | 'immunization') {
    // Export all columns except the `id` field for the selected dataset
    let data: any[] = [];
    if (type === 'itr') {
      data = this.itrFiltered.slice();
    } else {
      data = this.immunizationFiltered.slice();
    }

    // Normalize items: remove id only
    data = data.map(item => {
      const copy: any = {};
      Object.keys(item || {}).forEach(k => {
        if (k === 'id') return;
        copy[k] = item[k];
      });
      return copy;
    });
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
    XLSX.writeFile(workbook, `${type}-records.xlsx`);
  }

  // Helpers used by template to render dynamic headers
  getItrHeaders(): string[] {
    if (!this.itrFiltered || this.itrFiltered.length === 0) return [];
    return Object.keys(this.itrFiltered[0]).filter(k => k !== 'id');
  }

  getImmunizationHeaders(): string[] {
    if (!this.immunizationFiltered || this.immunizationFiltered.length === 0) return [];
    return Object.keys(this.immunizationFiltered[0]).filter(k => k !== 'id');
  }

  // Convert raw key to a presentable header label
  headerLabel(key: string): string {
    if (!key) return '';
    const special: any = {
      createdAt: 'Created Date',
      createdDate: 'Created Date',
      nextPrenatal: 'Prenatal Schedule',
      SecondWednesdayNextMonth: 'Immunization Schedule',
      firstName: 'First Name',
      lastName: 'Last Name',
      middleName: 'Middle Name',
      nurseName: 'Nurse',
      birthday: 'Birthday'
    };
    if (special[key]) return special[key];
    // Insert spaces before capitals and underscores, then Title Case
    const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-]+/g, ' ');
    return spaced.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // Format cell values. Dates are shown as "Month d, YYYY" (e.g. November 3, 2002)
  formatCell(value: any): string {
    if (value === null || value === undefined) return '';
    // Firestore Timestamp
    if (value && typeof value.toDate === 'function') {
      const d = value.toDate();
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    // ISO date string or YYYY-MM-DD
    if (typeof value === 'string') {
      // quick heuristic: looks like ISO date or yyyy-mm-dd
      const iso = /^\d{4}-\d{2}-\d{2}(T.*)?$/;
      if (iso.test(value)) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
      }
    }
    // numeric timestamp
    if (typeof value === 'number') {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    }
    // default: return as-is (string/number)
    return String(value);
  }
}
