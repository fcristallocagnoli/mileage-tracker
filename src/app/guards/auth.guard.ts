import { inject } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';


export const authGuard: CanActivateFn = (route, state) => {

  const router = inject(Router);
  const afa = inject(AngularFireAuth)

  return afa.authState.pipe(
    take(1),
    map(user => {
      if (user) {
        return true;
      }
      router.navigate(['/']);
      return false;
    })
  );
};
