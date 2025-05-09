import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ProjectDTO } from '@app/interfaces/project.interface';
import { ChartModule } from 'primeng/chart';

import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MustBePositive, MustBeInRange, MustBeSequential } from '@app/_helpers';
import { TripCreation, TripDTO } from '@app/interfaces/trip.interface';
import { AlertService } from '@app/services/alert.service';
import { AuthService } from '@app/services/auth.service';
import { BackendService } from '@app/services/backend.service';
import { monthDays } from '@formkit/tempo';
import { getDatabase, ref } from "firebase/database";
import { TicketCreation } from '@app/interfaces/ticket';

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

  debugMode = false;

  ticketActive = true;

  form = new FormGroup({
    // [ DEBUG ]: Para testear la creación de un viaje con un usuario distinto
    tripUserId: new FormControl({ value: '', disabled: !this.debugMode }, Validators.required),
    tripDate: new FormControl('', Validators.required),
    tripStartKm: new FormControl('', Validators.required),
    tripEndKm: new FormControl('', Validators.required),
  }, { validators: [MustBePositive()] });

  ticketForm = new FormGroup({
    // [ DEBUG ]: Para testear la creación de un viaje con un usuario distinto
    ticketUserId: new FormControl({ value: '', disabled: !this.debugMode }, Validators.required),
    ticketDate: new FormControl('', Validators.required),
    ticketValue: new FormControl('', [Validators.required, Validators.min(1)]),
  });

  textColor = 'rgb(73, 80, 87)';
  textColorSecondary = 'rgb(108, 117, 125)';
  surfaceBorder = 'rgb(73, 80, 87, 0.1)';

  projectUsers: any[] = [];

  isCopied: any = {
    "projectID": false,
    "lastKms": false
  }

  copyInfoAlert: any = {
    "projectID": "ID del proyecto copiado",
    "lastKms": "Últimos kilómetros copiados"
  }

  myData: any = { datasets: [] };

  currentUser = this.authService.accountValue;

  currentUserId = this.currentUser?.uid!;
  currentUserName = this.currentUser?.displayName || this.currentUser?.email!.split('@')[0];

  currentUserRole: string = 'user';

  firstTrip: TripDTO | null = null;
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
    // añade un validador nuevo (MustBeInRange(this.project)) al formGroup
    // (se añade aqui porque se requiere que 'this.project' este inicializado)
    this.form.addValidators([
      MustBePositive(),
      MustBeInRange('tripDate', this.project),
      MustBeSequential(this.lastTrip?.tripEndKm ?? 0)
    ])

    this.ticketForm.addValidators([
      MustBeInRange('ticketDate', this.project),
    ]);
  }

  refreshProjectUsers() {
    this.backendService.getProjectUsers(this.project.projectId, (users) => {
      // Obtenemos los usuarios del proyecto y los ordenamos por kilómetros recorridos
      this.projectUsers = users.sort((a, b) => b.userProject.projectKms - a.userProject.projectKms);
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      const controls = this.form.controls;
      if (controls.tripDate.invalid) {
        if (controls.tripDate.errors?.['required']) {
          this.alertService.error('Fecha inválida<br>El campo es obligatorio');
        } else if (controls.tripDate.errors?.['mustBeInRange']) {
          this.alertService.error('Fecha inválida<br>Rango: ' + this.project.projectStartDate + ' a ' + this.project.projectEndDate);
        }
      } else if (controls.tripStartKm.invalid) {
        if (controls.tripStartKm.errors?.['required']) {
          this.alertService.error('Km iniciales inválidos<br>El campo es obligatorio');
        } else if (controls.tripStartKm.errors?.['mustBeSequential']) {
          this.alertService.error('Km iniciales inválidos<br> Deben ser iguales a los km finales del último viaje');
        }
      } else if (controls.tripEndKm.invalid) {
        if (controls.tripEndKm.errors?.['required']) {
          this.alertService.error('Kms finales inválidos<br> El campo es obligatorio');
        } else if (controls.tripEndKm.errors?.['mustBePositive']) {
          this.alertService.error('Kms finales inválidos<br> Ha de ser mayor que los kms iniciales');
        }
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

    // [ DEBUG ]: Para testear la creación de un viaje con un usuario distinto
    if (this.debugMode) {
      this.currentUserId = this.form.value.tripUserId!;
    }
    this.backendService.createNewTrip(
      newTrip, this.currentUserId, this.project
    ).then(() => {
      console.debug("Trip created");
      this.alertService.success('Viaje creado correctamente');
      this.form.reset({
        tripDate: '',
        tripStartKm: '',
        tripEndKm: ''
      });
      this.buildDatasets();
      this.refreshProjectUsers();
    }).catch((error) => {
      console.error("Error creating trip", error);
    });
  }

  onSubmitTicket() {
    if (this.ticketForm.invalid) {
      const controls = this.ticketForm.controls;
      if (controls.ticketDate.invalid) {
        if (controls.ticketDate.errors?.['required']) {
          this.alertService.error('Fecha inválida<br>El campo es obligatorio');
        } else if (controls.ticketDate.errors?.['mustBeInRange']) {
          this.alertService.error('Fecha inválida<br>Rango: ' + this.project.projectStartDate + ' a ' + this.project.projectEndDate);
        }
      } else if (controls.ticketValue.invalid) {
        if (controls.ticketValue.errors?.['required']) {
          this.alertService.error('Valor del ticket inválido<br>El campo es obligatorio');
        } else if (controls.ticketValue.errors?.['min']) {
          this.alertService.error('Valor del ticket inválido<br>El valor ha de ser mayor que 0');
        }
      } else {
        this.alertService.error('Formulario inválido');
      }
      return;
    }

    // Crear un nuevo viaje
    const newTicket: TicketCreation = {
      ticketDate: this.ticketForm.value.ticketDate!,
      ticketValue: Number(this.ticketForm.value.ticketValue),
    };

    // [ DEBUG ]: Para testear la creación de un viaje con un usuario distinto
    if (this.debugMode) {
      this.currentUserId = this.ticketForm.value.ticketUserId!;
    }
    this.backendService.createNewTicket(
      newTicket, this.currentUserId, this.project
    ).then(() => {
      console.debug("Ticket created");
      this.alertService.success('Ticket creado correctamente');
      this.ticketForm.reset({
        ticketDate: '',
        ticketValue: ''
      });
      this.refreshProjectUsers();
    }).catch((error) => {
      console.error("Error creating ticket", error);
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
      // this.lastTrip = trips.length > 0 ? trips[trips.length - 1] : null;
      this.lastTrip = trips.reduce((latestTrip, currentTrip) => {
        return new Date(currentTrip.tripDate) >= new Date(latestTrip.tripDate) ? currentTrip : latestTrip;
      }, trips[0]);
      this.firstTrip = trips.reduce((earliestTrip, currentTrip) => {
        return new Date(currentTrip.tripDate) <= new Date(earliestTrip.tripDate) ? currentTrip : earliestTrip;
      }, trips[0]);

      // actualiza el validator de la fecha del viaje
      this.form.addValidators(MustBeSequential(this.lastTrip?.tripEndKm ?? 0));

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
      // Las etiquetas se desordenan, debemos regenerarlas
      this.myData.labels = this.generateLabels();
      this.myData = { ...this.myData };
    });
  }

  generateLabels() {
    const currentMonth = new Date().getMonth();
    const projectStartMonth = new Date(this.project.projectStartDate).getMonth();

    if (currentMonth === projectStartMonth) {
      const daysInMonth = monthDays(new Date());
      const today = new Date().getDate();
      const labels = [];

      for (let i = 1; i <= daysInMonth; i++) {
        labels.push(i < 10 ? `0${i}` : `${i}`);
      }

      return labels.slice(0, today);
    } else {
      const startDate = new Date(this.project.projectStartDate);
      const endDate = new Date(this.project.projectEndDate);
      const labels = [];

      for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
        const day = d.getDate();
        labels.push(day < 10 ? `0${day}` : `${day}`);
      }

      return labels;
    }
  }

  *generateColors(): IterableIterator<{ rgb: string, rgba: string }> {
    const colors = [
      { rgb: 'rgb(255, 99, 132)', rgba: 'rgba(255, 99, 132, 0.5)' },
      { rgb: 'rgb(54, 162, 235)', rgba: 'rgba(54, 162, 235, 0.5)' },
      { rgb: 'rgb(255, 206, 86)', rgba: 'rgba(255, 206, 86, 0.5)' },
      { rgb: 'rgb(75, 192, 192)', rgba: 'rgba(75, 192, 192, 0.5)' },
      { rgb: 'rgb(153, 102, 255)', rgba: 'rgba(153, 102, 255, 0.5)' }
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

  copyToClipboard(text: any, element: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.isCopied[element] = true;
      this.alertService.info(this.copyInfoAlert[element]);
      setTimeout(() => {
        this.isCopied[element] = false;
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

  calculateTotalFuelCost() {
    return this.projectUsers.reduce((acc, user) => {
      return acc + (user.userProject.projectPayment ?? 0);
    }, 0);
  }

  calculateCost() {
    this.totalGasolina = this.calculateTotalFuelCost();

    if (!this.totalGasolina || this.totalGasolina == 0) {
      // No hay gastos en el proyecto
      this.projectUsers.forEach(user => {
        this.costPerUser[user.userId] = 0;
      });
      return;
    } else if (this.totalGasolina < 0 || this.project.projectTotalKms <= 0) {
      this.alertService.error('El costo total de gasolina no puede ser negativo');
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

  exportData() {
    console.debug("Exporting data...", this.projectUsers);

    const csv = this.convertToCSV();
    const a = document.createElement('a');
    a.setAttribute('style', 'display:none;');
    document.body.appendChild(a);
    a.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    a.target = '_blank';
    const projectName = this.project.projectName.toLowerCase().replace(' ', '_');
    a.download = 'proyecto_' + projectName + '.csv';
    a.click();
  }

  convertToCSV() {
    const rows = 8;
    const cols = 7;
    const matrix = new Array(rows).fill(0).map(() => new Array(cols).fill(''));

    matrix[0][0] = 'Proyecto:';
    matrix[0][1] = this.project.projectName;
    matrix[1][0] = 'Fecha Inicio:';
    matrix[1][1] = this.project.projectStartDate;
    matrix[2][0] = 'Fecha Fin:';
    matrix[2][1] = this.project.projectEndDate;

    matrix[3][0] = 'Km iniciales:';
    matrix[3][1] = this.firstTrip?.tripStartKm;
    matrix[4][0] = 'Km finales:';
    matrix[4][1] = this.lastTrip?.tripEndKm;
    matrix[5][0] = 'Km Totales:';
    matrix[5][1] = this.project.projectTotalKms;

    this.totalGasolina = this.calculateTotalFuelCost();

    const costPerKm = this.totalGasolina / this.project.projectTotalKms;

    matrix[6][0] = 'Total Gasolina (EUR)';
    matrix[6][1] = this.totalGasolina;
    matrix[7][0] = 'Coste por km (EUR/km)';
    matrix[7][1] = costPerKm;

    matrix[0][3] = 'Usuario';
    matrix[0][4] = 'Km Totales';
    matrix[0][5] = 'Porc. de Uso';
    matrix[0][6] = 'Gasto (EUR)';

    for (let i = 0; i < this.projectUsers.length; i++) {
      matrix[i + 1][3] = this.projectUsers[i].userDisplayName;
      matrix[i + 1][4] = this.projectUsers[i].userProject.projectKms;
      matrix[i + 1][5] = this.calculateUsage(this.projectUsers[i]) + '%';
      matrix[i + 1][6] = Math.round(this.projectUsers[i].userProject.projectKms * costPerKm * 100) / 100;
    }

    // console.debug("Matrix", matrix);

    let toExport = ''

    for (let i = 0; i < rows; i++) {
      let line = '';
      for (let j = 0; j < cols; j++) {
        if (line != '') line += ';';
        line += matrix[i][j];
      }
      toExport += line + '\r\n';
    }
    // console.debug("CSV to export\n", toExport);
    return toExport;
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
