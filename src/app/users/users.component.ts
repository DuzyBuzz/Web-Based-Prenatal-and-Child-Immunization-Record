import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-users',
  standalone: false,
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit, OnDestroy {
  showLayout = true;
  private sub: Subscription | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Compute initial state (in case navigation already has query params)
    this.updateLayoutFromUrl(this.router.url);

    // Re-evaluate on navigation end
    this.sub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateLayoutFromUrl(event.urlAfterRedirects);
      }
    });
  }

  private updateLayoutFromUrl(url: string) {
    try {
      const tree = this.router.parseUrl(url);
      const bare = tree.queryParams['bare'];
      this.showLayout = !(bare === 'true' || bare === '1');
    } catch (e) {
      this.showLayout = true;
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
