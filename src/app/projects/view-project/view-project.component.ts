import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ProjectDTO } from '@app/interfaces/project.interface';
import { ChartModule } from 'primeng/chart';

import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MustBePositive } from '@app/_helpers/must-be-positive.validator';
import { TripCreation, TripDTO } from '@app/interfaces/trip.interface';
import { AlertService } from '@app/services/alert.service';
import { AuthService } from '@app/services/auth.service';
import { BackendService } from '@app/services/backend.service';
import { format } from '@formkit/tempo';
import { getDatabase, ref } from "firebase/database";

@Component({
  selector: 'app-view-project',
  standalone: true,
  imports: [ChartModule, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './view-project.component.html',
  styleUrl: './view-project.component.css'
})
export class ViewProjectComponent implements OnInit {
  @Input() project!: ProjectDTO;
  @Output() hasProject = new EventEmitter<null>();

  form = new FormGroup({
    tripDate: new FormControl(format(new Date(), "YYYY-MM-DD"), Validators.required),
    tripStartKm: new FormControl('', Validators.required),
    tripEndKm: new FormControl('', Validators.required),
  }, { validators: [MustBePositive()] });

  textColor = 'rgb(73, 80, 87)';
  textColorSecondary = 'rgb(108, 117, 125)';
  surfaceBorder = 'rgb(73, 80, 87, 0.1)';

  projectUsers: any[] = [];

  isCopied: boolean = false;

  myData: any = { datasets: [] };

  currentUser = this.authService.accountValue;

  currentUserId = this.currentUser?.uid!;
  currentUserName = this.currentUser?.displayName || this.currentUser?.email!.split('@')[0];

  currentUserRole: string = 'user';

  lastTrip: TripDTO | null = null;

  database = getDatabase();

  dbRef = ref(this.database);

  constructor(
    private backendService: BackendService,
    private authService: AuthService,
    private alertService: AlertService,
  ) { }

  ngOnInit(): void {
    this.backendService.getProjectUsers(this.project.projectId, (users) => {
      // Obtenemos los usuarios del proyecto y los ordenamos por kilómetros recorridos
      this.projectUsers = users.sort((a, b) => b.userProject.projectKms - a.userProject.projectKms);
      // Obtenemos el rol del usuario actual en el proyecto
      this.currentUserRole = this.projectUsers.find(user => user.userId === this.currentUserId)?.userProject.projectRole || 'user';
      // Construimos los datasets para el gráfico
      this.buildDatasets();
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      const controls = this.form.controls;
      if (controls.tripStartKm.invalid) {
        this.alertService.error('Kilómetros iniciales inválidos');
      } else if (controls.tripEndKm.invalid) {
        this.alertService.error('Kilómetros finales inválidos');
      } else {
        this.alertService.error('Formulario inválido');
      }
      return;
    }

    // Crear un nuevo viaje
    const newTrip: TripCreation = {
      tripDate: this.form.value.tripDate!,
      tripStartKm: Number(this.form.value.tripStartKm),
      tripEndKm: Number(this.form.value.tripEndKm),
    };

    this.backendService.createNewTrip(
      newTrip, this.currentUserId, this.project
    ).then(() => {
      console.debug("Trip created");
      this.form.reset({
        tripDate: format(new Date(), "YYYY-MM-DD"),
        tripStartKm: '',
        tripEndKm: ''
      });
      this.buildDatasets();
    }).catch((error) => {
      console.error("Error creating trip", error);
    });
  }

  leaveSubmitting = false;

  leaveProject() {
    this.leaveSubmitting = true;
    this.backendService.leaveProject(this.currentUserId, this.project.projectId).then(() => {
      this.hasProject.emit(null);
      this.alertService.info('Has abandonado el proyecto');
    }).catch((error) => {
      this.alertService.error('Error al abandonar el proyecto', error);
    }).finally(() => {
      this.leaveSubmitting = false;
    });
  }

  deleteSubmitting = false;

  deleteProject() {
    this.deleteSubmitting = true;

    console.debug("Deleting project", this.project.projectId, "...");

    this.backendService.deleteProject(this.project.projectId).then(() => {
      this.hasProject.emit(null);
      this.alertService.info('Has eliminado el proyecto');
    }).catch((error) => {
      this.alertService.error('Error al eliminar el proyecto', error);
    }).finally(() => {
      this.deleteSubmitting = false;
    });
  }

  buildDatasets() {
    this.backendService.getProjectTrips(this.project.projectId, (trips) => {
      const userTripsMap: { [key: string]: any[] } = {};

      trips.forEach((trip) => {
        if (!userTripsMap[trip.tripUserId]) {
          userTripsMap[trip.tripUserId] = [];
        }
        userTripsMap[trip.tripUserId].push({
          x: trip.tripDate.split('-')[2],
          y: trip.tripTotalKms
        });
      });

      // Actualizamos el total de kilómetros del proyecto local
      this.project.projectTotalKms = trips.reduce((acc, trip) => acc + trip.tripTotalKms, 0);

      // Actualizamos lastTrip con el último viaje realizado
      this.lastTrip = trips.length > 0 ? trips[trips.length - 1] : null;

      // Iterador para obtener colores
      const iterator = this.generateColors();

      this.myData.datasets = Object.keys(userTripsMap).map((userId) => {
        const tripUser = trips.find(trip => trip.tripUserId === userId);
        const color = iterator.next().value;
        return {
          label: tripUser ? tripUser.tripUserName : 'Unknown',
          data: userTripsMap[userId],
          fill: false,
          borderColor: color.rgb,
          backgroundColor: color.rgba
        };
      });
      console.debug("Datasets obtenidos", this.myData.datasets);
      this.myData = { ...this.myData };
    });
  }


  *generateColors(): IterableIterator<{ rgb: string, rgba: string }> {
    const colors = [
      { rgb: 'rgb(255, 99, 132)', rgba: 'rgba(255, 99, 132, 0.5)' },
      { rgb: 'rgb(54, 162, 235)', rgba: 'rgba(54, 162, 235, 0.5)' },
      { rgb: 'rgb(255, 206, 86)', rgba: 'rgba(255, 206, 86, 0.5)' },
      { rgb: 'rgb(75, 192, 192)', rgba: 'rgba(75, 192, 192, 0.5)' },
      { rgb: 'rgb(153, 102, 255)', rgba: 'rgba(153, 102, 255, 0.5)' },
      { rgb: 'rgb(255, 159, 64)', rgba: 'rgba(255, 159, 64, 0.5)' }
    ];

    let index = 0;
    while (true) {
      yield colors[index];
      index = (index + 1) % colors.length;
    }
  }

  // DEPRECATED - Usar generateColors()
  getRandomColors() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return {
      rgb: `rgb(${r}, ${g}, ${b})`,
      rgba: `rgba(${r}, ${g}, ${b}, 0.5)`
    };
  }

  getLastKms() {
    if (this.lastTrip?.tripEndKm) {
      return 'Ultimos km: ' + this.lastTrip?.tripEndKm;
    } else {
      return 'No hay datos';
    }
  }

  copyToClipboard(text: any) {
    navigator.clipboard.writeText(text).then(() => {
      this.isCopied = true;
      this.alertService.info('ID del proyecto copiado al portapapeles');
      setTimeout(() => {
        this.isCopied = false;
      }, 2000);
    }, (err) => {
      this.alertService.error('No se pudo copiar: ', err);
    });
  }

  // Calculadora de uso por usuario
  
  calculateUsage(user: any) {
    const totalKms = this.project.projectTotalKms;
    if (totalKms === 0) {
      return 0;
    }
    return Math.round((user.userProject.projectKms / totalKms) * 100);
  }

  // Calculadora de gastos

  totalGasolina: number = 0;
  costPerUser: { [key: string]: number } = {};

  calculateCost() {
    if (this.totalGasolina <= 0 || this.project.projectTotalKms <= 0) {
      this.alertService.error('Total de gasolina inválido');
      return;
    }

    const costPerKm = this.totalGasolina / this.project.projectTotalKms;

    this.projectUsers.forEach(user => {
      const userKms = user.userProject.projectKms;
      this.costPerUser[user.userId] = userKms * costPerKm;
    });
  }

  calculateUserCost(user: any): number {
    return this.costPerUser[user.userId] || 0;
  }

  // Chart options
  options = {
    maintainAspectRatio: false,
    aspectRatio: 0.6,
    plugins: {
      legend: {
        labels: {
          color: this.textColor
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Día',
        },
        ticks: {
          color: this.textColorSecondary
        },
        grid: {
          color: this.surfaceBorder,
          drawBorder: false
        },
      },
      y: {
        title: {
          display: true,
          text: 'Kilómetros',
        },
        ticks: {
          color: this.textColorSecondary
        },
        grid: {
          color: this.surfaceBorder,
          drawBorder: false
        },
      }
    }
  };

}
