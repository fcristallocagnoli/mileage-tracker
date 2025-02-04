import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '@app/services/alert.service';
import { BackendService } from '@app/services/backend.service';
import { UserToLogIn, UserToRegister } from '../interfaces/user.interface';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  submitting = false;

  loginActive = true;

  formLogin = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required)
  })

  formRegister = new FormGroup({
    fullName: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required)
  })

  constructor(
    private router: Router,
    private loginService: AuthService,
    private alertService: AlertService,
    private backendService: BackendService
  ) { }

  onSubmitLogin() {
    if (this.formLogin.invalid) {
      this.alertService.error("Incorrect form data");
      return;
    }
    this.loginService.logIn(this.formLogin.value as UserToLogIn)
      .then(() => {
        this.router.navigate(['/projects']);
      })
      .catch(() => {
        this.alertService.error("Email or password is incorrect");
      })
      .finally(() => {
        this.submitting = false;
      });
  }

  onSubmitRegister() {
    if (this.formRegister.invalid) {
      this.alertService.error("Incorrect form data");
      return;
    }
    this.submitting = true;
    this.loginService.register(this.formRegister.value as UserToRegister)
      .then((userCred) => {
        this.backendService.createUser(userCred, this.formRegister.value as UserToRegister);
        this.router.navigate(['/projects']);
      })
      .catch((error) => {
        switch (error.code) {
          case 'auth/email-already-in-use':
            this.alertService.error("Email already in use");
            break;
          case 'auth/invalid-email':
            this.alertService.error("Invalid email address");
            break;
          case 'auth/operation-not-allowed':
            this.alertService.error("Operation not allowed");
            break;
          case 'auth/weak-password':
            this.alertService.error("Password is too weak");
            break;
          default:
            this.alertService.error("An unknown error occurred");
        }
      })
      .finally(() => {
        this.submitting = false;
      });
  }

  onClickGoogle() {
    this.loginService.logInGoogle()
      .then((userCred) => {
        this.backendService.createUserWithGoogle(userCred);
        this.router.navigate(['/projects']);
      }).catch((error) => console.error(error));
  }
}
