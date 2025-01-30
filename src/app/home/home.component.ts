import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserToLogIn } from '../interfaces/user.interface';
import { AuthService } from '../services/auth.service';
import { AlertService } from '@app/services/alert.service';
import { BackendService } from '@app/services/backend.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  submitting = false;

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required)
  })

  constructor(
    private router: Router,
    private loginService: AuthService,
    private alertService: AlertService,
    private backendService: BackendService
  ) { }

  // convenience getter for easy access to form fields
  get f() { return this.form.controls; }

  onSubmit() {
    if (this.form.invalid) {
      return;
    }
    this.loginService.logIn(this.form.value as UserToLogIn)
      .then((userCred) => {
        this.backendService.createUser(userCred);
        this.router.navigate(['/projects']);
      })
      .catch(() => {
        this.alertService.error("Email or password is incorrect");
      });
  }

  onClickGoogle() {
    this.loginService.logInGoogle()
    .then((userCred) => {
      this.backendService.createUser(userCred);
      this.router.navigate(['/projects']);
    }).catch((error) => console.error(error));
  }
}
