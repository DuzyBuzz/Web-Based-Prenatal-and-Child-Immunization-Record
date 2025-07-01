import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, firstValueFrom, map, switchMap, of } from 'rxjs';
import * as XLSX from 'xlsx';
import { AuthService } from '../../../auth/auth.service';


@Component({
  selector: 'app-admin-reports',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './admin-reports.component.html',
  styleUrl: './admin-reports.component.scss'
})
export class AdminReportsComponent implements OnInit {
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
    // Get current user UID and nurse name (optional, can be removed if not needed)
    const user = await firstValueFrom(this.authService.getCurrentUser());
    this.uid = user?.uid ?? null;
    this.nurseName = user?.displayName ?? null;

    // Get ALL ITR records
    const itrCollection = collection(this.firestore, 'itr');
    this.itrData$ = collectionData(itrCollection, { idField: 'id' });
    this.itrData$.subscribe(() => this.itrLoading = false);

    // Get ALL Immunization records
    const immunizationCollection = collection(this.firestore, 'immunization');
    this.immunizationData$ = collectionData(immunizationCollection, { idField: 'id' });
    this.immunizationData$.subscribe(() => this.immunizationLoading = false);
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
