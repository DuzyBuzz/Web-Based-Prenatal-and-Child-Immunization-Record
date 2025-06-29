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
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
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

  async ngOnInit() {
    // Get current user UID and nurse name
    const user = await firstValueFrom(this.authService.getCurrentUser());
    this.uid = user?.uid ?? null;
    this.nurseName = user?.displayName ?? null;

    // Filter ITR by createdBy == uid
    if (this.uid) {
      const itrCollection = collection(this.firestore, 'itr');
      this.itrData$ = collectionData(itrCollection, { idField: 'id' }).pipe(
        map(arr => arr.filter((item: any) => item.createdBy === this.uid))
      );
      this.itrData$.subscribe(() => this.itrLoading = false);
    } else {
      this.itrLoading = false;
    }

    // Filter Immunization by nurseName == displayName (or use uid if that's how it's stored)
    if (this.uid) {
      const immunizationCollection = collection(this.firestore, 'immunization');
      this.immunizationData$ = collectionData(immunizationCollection, { idField: 'id' }).pipe(
        map(arr => arr.filter((item: any) => item.uid === this.uid))
      );
      this.immunizationData$.subscribe(() => this.immunizationLoading = false);
    } else {
      this.immunizationLoading = false;
    }
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
