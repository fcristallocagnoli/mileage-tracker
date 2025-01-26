import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export default class ProjectsComponent {
  userProjects: any[] = [];
  // userProjects: any[] = [
  //   {
  //     projectID: "888ddb41-efd2-5d48-903d-c114afff17a7",
  //     password: "7a0378360df7d29729b32da4f8ba21f71a60548c7fe7e701fecfa537cacc3170",
  //     projectName: "Project 1",
  //     projectDescription: "This is project 1",
  //     projectParticipants: [],
  //     trips: []
  //   },
  //   {
  //     projectID: "1bc69f86-45ea-5bad-b8a1-9841b9d08bcf",
  //     password: "94ce1c38b3acc9946657f8a1ee3b6deb3f5a0be04cf156ec84e72dc85a8c64ba",
  //     projectName: "Project 2",
  //     projectDescription: "This is project 2",
  //     projectParticipants: [],
  //     trips: []
  //   }
  // ];
}
