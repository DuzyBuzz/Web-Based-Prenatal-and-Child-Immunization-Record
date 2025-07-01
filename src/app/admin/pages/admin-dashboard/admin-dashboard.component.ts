import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Firestore, collectionData, collection } from '@angular/fire/firestore';
import { forkJoin } from 'rxjs';
import { NgxChartsModule } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true, // <-- Add this line
  imports: [NgxChartsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  prenatalTotal = 0;
  immunizationTotal = 0;
  upcomingPrenatal = 0;
  thisMonthImmunizations = 0;

  ageGroupChartData: any[] = [];
  vaccineTypeChartData: any[] = [];
  monthlyPrenatalChartData: any[] = [];
  monthlyImmunizationChartData: any[] = [];

  constructor(private firestore: Firestore, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // Fetch both collections in parallel for analytics
    forkJoin({
      itr: collectionData(collection(this.firestore, 'itr')),
      immunization: collectionData(collection(this.firestore, 'immunization'))
    }).subscribe(({ itr, immunization }) => {
      console.log('ITR:', itr);
      console.log('Immunization:', immunization);

      // 1. Total counts
      this.prenatalTotal = itr.length;
      this.immunizationTotal = immunization.length;

      // 2. Upcoming Prenatal Visits (e.g., nextPrenatal in the future)
      const now = new Date();
      this.upcomingPrenatal = itr.filter((item: any) => {
        if (!item.nextPrenatal) return false;
        const d = item.nextPrenatal?.toDate ? item.nextPrenatal.toDate() : new Date(item.nextPrenatal);
        return d > now;
      }).length;

      // 3. Immunizations This Month
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      this.thisMonthImmunizations = immunization.filter((item: any) => {
        if (!item.createdDate) return false;
        const d = new Date(item.createdDate);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length;

      // 4. Age Group Chart (for mothers)
      const ageGroups = { '<20': 0, '20-29': 0, '30-39': 0, '40+': 0 };
      itr.forEach((item: any) => {
        const age = Number(item.age);
        if (age < 20) ageGroups['<20']++;
        else if (age < 30) ageGroups['20-29']++;
        else if (age < 40) ageGroups['30-39']++;
        else ageGroups['40+']++;
      });
      this.ageGroupChartData = Object.entries(ageGroups).map(([name, value]) => ({ name, value }));

      // 5. Vaccine Type Chart (for children)
      const vaccineTypes = ['bcg', 'ipv', 'opv', 'pcv', 'penta'];
      const vaccineCounts: { [key: string]: number } = {
        bcg: 0,
        ipv: 0,
        opv: 0,
        pcv: 0,
        penta: 0
      };

      immunization.forEach(item => {
        if (item['vaccines']) {
          vaccineTypes.forEach(type => {
            const doses = item['vaccines'][type];
            if (doses && typeof doses === 'object') {
              Object.values(doses).forEach((dose: any) => {
                if (
                  dose &&
                  dose.date &&
                  dose.date !== '' &&
                  dose.date !== null &&
                  dose.date !== undefined
                ) {
                  vaccineCounts[type]++;
                }
              });
            }
          });
        }
      });

      // Output in the requested format
      Object.entries(vaccineCounts).forEach(([type, count]) => {
        console.log(`${type} = ${count}`);
      });

      // For chart
      this.vaccineTypeChartData = Object.entries(vaccineCounts).map(([name, value]) => ({ name, value }));

      // 6. Monthly Prenatal Registrations
      const monthlyPrenatal: { [key: string]: number } = {};
      itr.forEach((item: any) => {
        if (item.dateSaved) {
          const d = new Date(item.dateSaved);
          const label = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
          monthlyPrenatal[label] = (monthlyPrenatal[label] || 0) + 1;
        }
      });
      this.monthlyPrenatalChartData = Object.entries(monthlyPrenatal).map(([name, value]) => ({ name, value }));

      // 7. Monthly Immunizations (line chart)
      const monthlyImmun: { [key: string]: number } = {};
      immunization.forEach((item: any) => {
        if (item.createdDate) {
          const d = new Date(item.createdDate);
          const label = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
          monthlyImmun[label] = (monthlyImmun[label] || 0) + 1;
        }
      });
      this.monthlyImmunizationChartData = [
        {
          name: 'Immunizations',
          series: Object.entries(monthlyImmun).map(([name, value]) => ({ name, value }))
        }
      ];

      this.cdr.detectChanges();
    });

    // Fetch ITR collection and count documents for the dashboard card
    collectionData(collection(this.firestore, 'itr')).subscribe(data => {
      console.log('Simple ITR fetch:', data);
      this.prenatalTotal = data.length; // <-- This will update the dashboard card
      this.cdr.detectChanges();
    });
    collectionData(collection(this.firestore, 'immunization')).subscribe(data => {
      console.log('Simple Immunization fetch:', data);
      this.immunizationTotal = data.length; // <-- This will update the dashboard card
      this.cdr.detectChanges();
    });

    collectionData(collection(this.firestore, 'itr')).subscribe(data => {
      const now = new Date();
      this.upcomingPrenatal = data.filter((item: any) => {
        if (!item.nextPrenatal) return false;
        // Handle Firestore Timestamp or string
        const d = item.nextPrenatal.toDate ? item.nextPrenatal.toDate() : new Date(item.nextPrenatal);
        return d > now;
      }).length;
      this.cdr.detectChanges();
    });

    collectionData(collection(this.firestore, 'immunization')).subscribe(data => {
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      this.thisMonthImmunizations = data.filter((item: any) => {
        if (!item.SecondWednesdayNextMonth) return false;
        // Handle Firestore Timestamp or string
        const d = item.SecondWednesdayNextMonth.toDate ? item.SecondWednesdayNextMonth.toDate() : new Date(item.SecondWednesdayNextMonth);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length;
      this.cdr.detectChanges();
    });

    collectionData(collection(this.firestore, 'itr')).subscribe((data: any[]) => {
      const ageCounts: { [key: string]: number } = {};
      data.forEach(item => {
        const age = item.age;
        if (age !== undefined && age !== null) {
          ageCounts[age] = (ageCounts[age] || 0) + 1;
        }
      });
      // Log in the format: 21 = 2, 22 = 1, etc.
      Object.entries(ageCounts).forEach(([age, count]) => {
        console.log(`${age} = ${count}`);
      });
      // Pass to chart
      this.ageGroupChartData = Object.entries(ageCounts).map(([name, value]) => ({ name, value }));
      this.cdr.detectChanges();
    });

    collectionData(collection(this.firestore, 'immunization')).subscribe((data: any[]) => {
      const vaccineTypes = ['bcg', 'ipv', 'opv', 'pcv', 'penta'];
      const vaccineCounts: { [key: string]: number } = {
        bcg: 0,
        ipv: 0,
        opv: 0,
        pcv: 0,
        penta: 0
      };

      data.forEach(item => {
        if (item.vaccines) {
          vaccineTypes.forEach(type => {
            const doses = item.vaccines[type];
            if (doses && typeof doses === 'object') {
              Object.values(doses).forEach((dose: any) => {
                if (
                  dose &&
                  dose.date &&
                  dose.date !== '' &&
                  dose.date !== null &&
                  dose.date !== undefined
                ) {
                  vaccineCounts[type]++;
                }
              });
            }
          });
        }
      });

      // Output in the requested format
      Object.entries(vaccineCounts).forEach(([type, count]) => {
        console.log(`${type} = ${count}`);
      });

      // For chart
      this.vaccineTypeChartData = Object.entries(vaccineCounts).map(([name, value]) => ({ name, value }));
      this.cdr.detectChanges();
    });
  }
}
