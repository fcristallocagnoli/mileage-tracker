import { Injectable } from '@angular/core';

import { createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { User } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() { }

  getAuth() {
    return getAuth();
  }

  register(user: User) {
    return createUserWithEmailAndPassword(getAuth(), user.email, user.password);
  }

  logIn(use: User) {
    return signInWithEmailAndPassword(getAuth(), use.email, use.password);
  }

  logInGoogle() {
    return signInWithPopup(getAuth(), new GoogleAuthProvider());
  }

  logOut() {
    return signOut(getAuth());
  }

  isAuthenticated(): boolean {
    const user = getAuth().currentUser;
    return user !== null;
  }
}
