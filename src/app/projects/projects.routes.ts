import { Routes } from "@angular/router";
import ProjectsComponent from "./projects.component";
import { ViewProjectComponent } from "./view-project/view-project.component";

export const PROJECT_ROUTES: Routes = [
    { path: '', component: ProjectsComponent },
    { path: ':pid', component: ViewProjectComponent },
];