import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';


import { SharedModule } from '../shared/shared.module';
import { FormsModule} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PagesModule } from '../pages/pages.module';
import { PatientComponent } from './patient.component';
import { patientRoutes } from './patient.routes';
import { AskAiComponent } from './ask-ai/ask-ai.component';

@NgModule({
  declarations: [
    PatientComponent
  ],
  imports: [
    RouterModule.forChild(patientRoutes),
    SharedModule,
    FormsModule,
    CommonModule,
    PagesModule,
    AskAiComponent
  ],
})
export class PatientModule { }
