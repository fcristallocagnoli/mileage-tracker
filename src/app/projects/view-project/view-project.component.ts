import { Component, Input, OnInit } from '@angular/core';
import { ProjectDTO } from '@app/interfaces/project.interface';
import { ChartModule } from 'primeng/chart';

import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TripCreation, TripDTO } from '@app/interfaces/trip.interface';
import { AuthService } from '@app/services/auth.service';
import { BackendService } from '@app/services/backend.service';
import { format } from '@formkit/tempo';
import { getDatabase, ref } from "firebase/database";
import { MustBePositive } from '@app/_helpers/must-be-positive.validator';
import { AlertService } from '@app/services/alert.service';

@Component({
  selector: 'app-view-project',
  standalone: true,
  imports: [ChartModule, CommonModule, ReactiveFormsModule],
  templateUrl: './view-project.component.html',
  styleUrl: './view-project.component.css'
})
export class ViewProjectComponent implements OnInit {
  @Input() project!: ProjectDTO;

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

  lastTrip: TripDTO | null = null;
  lastTripEndKm: string | null = null;

  userKmMap: { [key: string]: number } = {};

  getKmForUser(userId: string) {
    return this.userKmMap[userId] || 0;
  }

  database = getDatabase();

  dbRef = ref(this.database);

  constructor(
    private backendService: BackendService,
    private authService: AuthService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.backendService.getProjectUsers(this.project.projectId, (users) => {
      this.projectUsers = users;
      this.buildDatasets();
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      console.log("Invalid form");
      return;
    }

    // Crear un nuevo viaje
    const newTrip: TripCreation = {
      tripDate: this.form.value.tripDate!,
      tripStartKm: Number(this.form.value.tripStartKm),
      tripEndKm: Number(this.form.value.tripEndKm),
    };

    console.log("Creating", newTrip);

    this.backendService.createNewTrip(
      newTrip, this.currentUserId, this.project
    ).then(() => {
      console.log("Trip created");
      this.form.reset({
        tripDate: format(new Date(), "YYYY-MM-DD"),
        tripStartKm: '',
        tripEndKm: ''
      });
      // TODO: Actualizar los datasets con los nuevos datos
      this.buildDatasets();
    }).catch((error) => {
      console.error("Error creating trip", error);
    });
  }

  buildDatasets() {
    this.backendService.getProjectTrips(this.project.projectId, (trips) => {
      const userTripsMap: { [key: string]: any[] } = {};

      console.log("Trips", trips);

      trips.forEach((trip) => {
        if (!userTripsMap[trip.tripUserId]) {
          userTripsMap[trip.tripUserId] = [];
        }
        userTripsMap[trip.tripUserId].push({
          x: trip.tripDate.split('-')[2],
          y: trip.tripTotalKms
        });
      });

      this.project.projectTotalKms = trips.reduce((acc, trip) => acc + trip.tripTotalKms, 0);

      // Aprovechamos las consultas para calcular los kilómetros totales de cada usuario
      this.userKmMap = trips.reduce((acc, trip) => {
        if (!acc[trip.tripUserId]) {
          acc[trip.tripUserId] = 0;
        }
        acc[trip.tripUserId] += trip.tripTotalKms;
        return acc;
      }, {});

      this.lastTrip = trips.length > 0 ? trips[trips.length - 1] : null;
      // Actualizamos lastTripEndKm con los kilómetros del último viaje realizado el dia proporcionado por this.form.value.tripDate
      this.lastTripEndKm = trips.length > 0 ? trips[trips.length - 1].tripEndKm : null;

      // const lastTrip = trips.find(trip => trip.tripDate === this.form.value.tripDate);
      // this.lastTripEndKm = lastTrip ? lastTrip.tripEndKm.toString() : trips[trips.length - 1].tripEndKm.toString();

      // this.form.get('tripDate')!.valueChanges.subscribe(date => {
      //   const lastTrip = trips.find(trip => trip.tripDate === date);
      //   console.log("Last trip", trips);
      //   this.lastTripEndKm = lastTrip ? lastTrip.tripEndKm.toString() : trips[trips.length - 1].tripEndKm.toString();
      // });

      this.myData.datasets = Object.keys(userTripsMap).map((userId) => {
        const tripUser = trips.find(trip => trip.tripUserId === userId);
        const color = this.getRandomColors();
        return {
          label: tripUser ? tripUser.tripUserName : 'Unknown',
          data: userTripsMap[userId],
          fill: false,
          borderColor: color.rgb,
          backgroundColor: color.rgba
        };
      });
      console.log("Datasets", this.myData.datasets);
      this.myData = { ...this.myData };
    });
  }

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
    if(this.lastTripEndKm) {
      return 'Ultimos km: ' + this.lastTripEndKm;
    } else {
      return 'No hay datos';
    }
  }

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
        }
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
        // suggestedMin: 0,
        // suggestedMax: 100
      }
    }
  };

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

  calculateUsage(uid: any) {
    const totalKms = this.project.projectTotalKms;
    if (totalKms === 0) {
      return 0;
    }
    return Math.round((this.getKmForUser(uid) / totalKms) * 100);
  }

}
