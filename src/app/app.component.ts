import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AlertComponent } from './_components/alert/alert.component';
import { AlertService } from './services/alert.service';
import { AuthService } from './services/auth.service';
import { BackendService } from './services/backend.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AlertComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'mileage-log';

  authService = inject(AuthService);

  constructor(private router: Router, private backendService: BackendService, private alertService: AlertService) { }

  getUser() {
    return this.authService.accountValue;
  }

  getUserPhoto() {
    return this.authService.accountValue?.photoURL || 'https://www.gravatar.com/avatar/';
  }

  getUserName() {
    return this.authService.accountValue?.displayName || this.authService.accountValue?.email!.split('@')[0];
  }

  logOut() {
    this.authService.logOut().then(() => {
      this.router.navigate(['/']);
    }).catch((error) => {
      console.error("Error logging out", error);
    });
  }

}
