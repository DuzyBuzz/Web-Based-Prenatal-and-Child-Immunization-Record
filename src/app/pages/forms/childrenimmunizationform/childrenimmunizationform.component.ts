import { CommonModule } from '@angular/common';
import { Component, NgModule } from '@angular/core';

@Component({
  selector: 'app-childrenimmunizationform',
  imports: [CommonModule],
  templateUrl: './childrenimmunizationform.component.html',
  styleUrl: './childrenimmunizationform.component.scss'
})
export class ChildrenimmunizationformComponent {

  // Define your vaccines
vaccines = [
  {
    name: 'BCG',
    schedule: '(at birth)',
    slots: 2,
    id: 'bcg'
  },
  {
    name: 'PENTA',
    schedule: '(6wks,10 wks ,14 wks)',
    slots: 3,
    id: 'penta'
  },
  {
    name: 'OPV',
    schedule: '(6wks,10 wks ,14 wks)',
    slots: 3,
    id: 'opv'
  },
  {
    name: 'PCV',
    schedule: '(6wks,10 wks ,14 wks)',
    slots: 2,
    id: 'pcv'
  },
  {
    name: 'IPV',
    schedule: '(6wks,10 wks ,14 wks)',
    slots: 2,
    id: 'ipv'
  }
];

}
