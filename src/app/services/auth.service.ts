import { Injectable } from '@angular/core';

import { browserSessionPersistence, createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, setPersistence, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { UserToLogIn, UserToRegister } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() {
    setPersistence(this.getAuth(), browserSessionPersistence);
  }

  public get accountValue() {
    return this.getAuth().currentUser;
  }

  getAuth() {
    return getAuth();
  }

  register(user: UserToRegister) {
    return createUserWithEmailAndPassword(getAuth(), user.email, user.password);
  }

  logIn(user: UserToLogIn) {
    return signInWithEmailAndPassword(getAuth(), user.email, user.password);
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
