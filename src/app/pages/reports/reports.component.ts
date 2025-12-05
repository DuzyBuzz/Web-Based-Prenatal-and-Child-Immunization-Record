import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Firestore, collection, collectionData, query, where } from '@angular/fire/firestore';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, firstValueFrom, map, switchMap, of } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reports',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  itrData$: Observable<any[]> = of([]);
  immunizationData$: Observable<any[]> = of([]);
  itrLoading = true;
  immunizationLoading = true;
  uid: string | null = null;
  nurseName: string | null = null;

  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Subscribe to auth state. When user becomes available, use uid for filtering.
    // If no user is present yet, show all records so the reports page displays data.
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.uid = user?.uid ?? null;
        this.nurseName = user?.displayName ?? null;

        const itrCollection = collection(this.firestore, 'itr');
        this.itrData$ = collectionData(itrCollection, { idField: 'id' }).pipe(
          map(arr => this.uid ? arr.filter((item: any) => item.createdBy === this.uid) : arr)
        );
        this.itrData$.subscribe(() => this.itrLoading = false);

        const immunizationCollection = collection(this.firestore, 'immunization');
        this.immunizationData$ = collectionData(immunizationCollection, { idField: 'id' }).pipe(
          map(arr => this.uid ? arr.filter((item: any) => item.uid === this.uid) : arr)
        );
        this.immunizationData$.subscribe(() => this.immunizationLoading = false);
      },
      error: (err) => {
        console.error('Error getting auth user for reports:', err);
        // fall back to loading collections without filters
        const itrCollection = collection(this.firestore, 'itr');
        this.itrData$ = collectionData(itrCollection, { idField: 'id' });
        this.itrData$.subscribe(() => this.itrLoading = false);

        const immunizationCollection = collection(this.firestore, 'immunization');
        this.immunizationData$ = collectionData(immunizationCollection, { idField: 'id' });
        this.immunizationData$.subscribe(() => this.immunizationLoading = false);
      }
    });
  }

  async downloadExcel(type: 'itr' | 'immunization') {
    let data: any[] = [];
    if (type === 'itr') {
      data = await firstValueFrom(this.itrData$);
      data = data.map(item => ({
        Name: `${item.firstName} ${item.middleName} ${item.lastName}`,
        'Prenatal Schedule': item.nextPrenatal,
        Age: item.age,
        Address: item.address,
        Nurse: item.nurseName
      }));
    } else {
      data = await firstValueFrom(this.immunizationData$);
      data = data.map(item => ({
        Name: item.name,
        'Immunization Schedule': item.SecondWednesdayNextMonth,
        Birthday: item.birthday,
        Mother: item.mother,
        Address: item.address
      }));
    }
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
    XLSX.writeFile(workbook, `${type}-records.xlsx`);
  }
}
