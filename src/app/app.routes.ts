import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { authGuard } from './guards/auth.guard';
import { NotFoundComponent } from './_components/not-found.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'projects', canActivate: [authGuard], loadChildren: () => import('./projects/projects.routes').then(m => m.PROJECT_ROUTES) },
    
    // Opcion 1
    // { path: 'not-found', component: NotFoundComponent },
    // { path: '**', redirectTo: 'not-found' },

    // Opcion 2
    { path: '**', component: NotFoundComponent }
];
