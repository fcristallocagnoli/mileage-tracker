import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertService } from '@app/services/alert.service';

import { ProjectCreation, ProjectDTO, ProjectJoin } from '@app/interfaces/project.interface';
import { AuthService } from '@app/services/auth.service';
import { BackendService } from '@app/services/backend.service';
import { format, monthEnd, monthStart } from "@formkit/tempo";
import { ViewProjectComponent } from "./view-project/view-project.component";

@Component({
  selector: 'app-projects',
  imports: [CommonModule, ReactiveFormsModule, ViewProjectComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export default class ProjectsComponent implements OnInit {
  userProject?: ProjectDTO | null;

  currentUser = this.authService.accountValue;
  currentUserId = this.authService.accountValue?.uid!;

  submitting = false;

  joinForm = new FormGroup({
    projectId: new FormControl('', Validators.required),
    projectPassword: new FormControl('', Validators.required)
  })

  createForm = new FormGroup({
    projectName: new FormControl('', Validators.required),
    projectPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    projectStartDate: new FormControl(format(monthStart(new Date()), "YYYY-MM-DD"), Validators.required),
    projectEndDate: new FormControl(format(monthEnd(new Date()), "YYYY-MM-DD"), Validators.required),
    projectDescription: new FormControl(''),
  })

  constructor(
    private authService: AuthService,
    private backendService: BackendService,
    private alertService: AlertService,
  ) {
  }

  ngOnInit() {
    this.backendService.getUserProject(this.currentUserId, (project) => {
      this.userProject = project;
    });
  }

  // TODO: join project
  onSubmitJoin() {
    // reset alerts on submit
    this.alertService.clear();

    // stop here if form is invalid
    if (this.joinForm.invalid) {
      return;
    }

    this.submitting = true;

    this.backendService.joinProject(
      this.joinForm.value as ProjectJoin, this.currentUserId
    ).then((project) => {
      this.userProject = project;
      this.submitting = false;
      this.joinForm.reset();
    }).catch((error) => {
      this.alertService.error(error);
      this.submitting = false;
    });
  }

  onSubmitCreate() {
    // reset alerts on submit
    this.alertService.clear();

    // stop here if form is invalid
    if (this.createForm.invalid) {
      return;
    }

    this.submitting = true;

    this.backendService.createProjectAndAsignToUser(
      this.createForm.value as ProjectCreation, this.currentUserId
    ).then((createdProject) => {
      this.submitting = false;
      this.userProject = createdProject;
      this.createForm.reset();
    }).catch((error) => {
      this.alertService.error(error);
      this.submitting = false;
    });
  }
}
