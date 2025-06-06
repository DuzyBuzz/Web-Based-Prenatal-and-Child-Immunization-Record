import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PagesModule } from "./pages/pages.module";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PagesModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Prenatal and Child Immunization Records App';
}
