import { Injectable } from '@angular/core';

import { ProjectCreation, ProjectDTO, ProjectJoin } from '@app/interfaces/project.interface';
import { TicketCreation, TicketDTO } from '@app/interfaces/ticket';
import { TripCreation, TripDTO } from '@app/interfaces/trip.interface';
import { UserToRegister } from '@app/interfaces/user.interface';
import { UserCredential } from 'firebase/auth';

import { child, get, getDatabase, onValue, push, ref, update } from "firebase/database";
import { sha256 } from 'js-sha256';

@Injectable({ providedIn: 'root' })
export class BackendService {
  constructor() { }

  database = getDatabase();

  dbRef = ref(this.database);

  // -- FIREBASE --

  async createUser(userCred: UserCredential, userToRegister: UserToRegister) {
    const userRef = ref(this.database, `users/${userCred.user.uid}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      await update(userRef, {
        userId: userCred.user.uid,
        userDisplayName: userToRegister.fullName.split(' ')[0],
        userEmail: userToRegister.email,
      });
    }
  }

  async createUserWithGoogle(userCred: UserCredential) {
    const user = userCred.user;
    const userRef = ref(this.database, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      await update(userRef, {
        userId: user.uid,
        userDisplayName: user.displayName?.split(' ')[0] || user.email!.split('@')[0],
        userEmail: user.email,
        userPhotoURL: user.photoURL,
      });
    }
  }

  async createProjectAndAsignToUser(project: ProjectCreation, userId: string) {
    const newProjectKey = push(child(ref(this.database), 'projects')).key;

    const projectDBData: ProjectDTO = {
      projectId: newProjectKey!,
      projectName: project.projectName,
      projectPasswordHash: sha256(project.projectPassword),
      projectStartDate: project.projectStartDate,
      projectEndDate: project.projectEndDate,
      projectDescription: project.projectDescription,
      projectTotalKms: 0,
      projectTotalPayment: 0,
    };

    const updates = {
      // Nuevo proyecto
      [`projects/${newProjectKey}`]: { ...projectDBData, projectUsers: { [userId]: true } },
      // Referencia al proyecto en el usuario (no hay mas de un proyecto por usuario)
      // Kms hechos por el usuario en el proyecto a 0
      [`users/${userId}/userProject`]: {
        projectId: newProjectKey,
        projectKms: 0,
        projectPayment: 0,
        projectRole: 'admin'
      },
    }

    await update(ref(this.database), updates);
    return projectDBData;
  }

  async joinProject(projectJoin: ProjectJoin, uid: string) {
    const projectRef = ref(this.database, 'projects/' + projectJoin.projectId);
    const snapshot = await get(projectRef);

    if (snapshot.exists()) {
      const project = snapshot.val();
      const userCount = Object.keys(project.projectUsers || {}).length;

      if (userCount >= 5) {
        throw new Error("Project has reached the maximum number of users");
      }

      if (project.projectPasswordHash === sha256(projectJoin.projectPassword)) {
        await update(ref(this.database, `users/${uid}/userProject`), {
          projectId: projectJoin.projectId,
          projectRole: 'user',
          projectPayment: 0,
          projectKms: 0,
        });
        await update(ref(this.database, `projects/${projectJoin.projectId}/projectUsers`), {
          [uid]: true,
        });
        return project;
      } else {
        throw new Error("Invalid project password");
      }
    } else {
      throw new Error("Project not found");
    }
  }

  leaveProject(userId: string, projectId: string) {
    const updates = {
      // Elimino referencia al usuario en el proyecto
      [`projects/${projectId}/projectUsers/${userId}`]: null,
      // Elimino referencia al proyecto en el usuario
      [`users/${userId}/userProject`]: null,
    }

    return update(ref(this.database), updates);
  }

  async deleteProject(projectId: string) {
    const snapshot = await get(ref(this.database, `projects/${projectId}/projectUsers`));
    if (snapshot.exists()) {
      const userIds = Object.keys(snapshot.val());
      const updates: any = {};

      userIds.forEach(userId => {
        updates[`users/${userId}/userProject`] = null;
      });

      updates[`projects/${projectId}`] = null;
      updates[`trips/${projectId}`] = null;
      updates[`tickets/${projectId}`] = null;

      return update(ref(this.database), updates);
    }
  }

  getUserProject(userId: string, callback: (project: ProjectDTO | null) => void) {
    onValue(ref(this.database, `users/${userId}/userProject/projectId`), async (snapshot) => {
      if (snapshot.exists()) {
        const projectId = snapshot.val();
        const projectSnapshot = await get(ref(this.database, `projects/${projectId}`));
        const { projectPasswordHash, ...projectData } = projectSnapshot.val();
        // const project = { ...projectData, projectTrips: [] };
        console.debug("User", userId, "Project:", projectData);
        callback(projectData);
      } else {
        callback(null);
      }
    }, {
      onlyOnce: true
    });
  }

  getProjectUsers(projectId: string, callback: (users: any[]) => void) {
    onValue(ref(this.database, `projects/${projectId}/projectUsers`), async (snapshot) => {
      if (snapshot.exists()) {
        const userIds = Object.keys(snapshot.val());
        const users = await Promise.all(userIds.map(async (userId: string) => {
          const userSnapshot = await get(ref(this.database, `users/${userId}`));
          return userSnapshot.val();
        }));
        console.debug("Project Users", users);
        callback(users);
      } else {
        callback([]);
      }
    }, {
      onlyOnce: true
    });
  }

  async createNewTrip(trip: TripCreation, uid: string, project: ProjectDTO) {
    const newTripKey = push(child(ref(this.database), 'trips')).key;
    const userName = (await get(ref(this.database, `users/${uid}/userDisplayName`))).val();

    const tripDBData: TripDTO = {
      tripId: newTripKey!,
      tripUserId: uid,
      tripUserName: userName,
      tripDate: trip.tripDate,
      tripStartKm: trip.tripStartKm,
      tripEndKm: trip.tripEndKm,
      tripTotalKms: trip.tripEndKm - trip.tripStartKm,
    };

    console.debug("Creating new trip:", tripDBData);

    const previousProjectTotalKms = (await get(ref(this.database, `projects/${project.projectId}/projectTotalKms`))).val();
    const userProjectSnapshot = await get(ref(this.database, `users/${uid}/userProject`));
    const previousKms = userProjectSnapshot.val().projectKms;

    const updates = {
      // Nuevo trip o actualización del existente
      [`trips/${project.projectId}/${newTripKey}`]: tripDBData,
      // Referencia al trip en el usuario
      [`users/${uid}/userProject/projectUserTrips/${newTripKey}`]: true,
      [`users/${uid}/userProject/projectKms`]: previousKms + tripDBData.tripTotalKms,
      // Actualizar los kms totales del proyecto
      [`projects/${project.projectId}/projectTotalKms`]: previousProjectTotalKms + tripDBData.tripTotalKms,
    };

    await update(ref(this.database), updates);
    return tripDBData;
  }

  getProjectTrips(projectId: string, callback: (trips: any[]) => void) {
    onValue(ref(this.database, `trips/${projectId}`), (snapshot) => {
      if (snapshot.exists()) {
        const trips = Object.keys(snapshot.val()).map((tripId: string) => snapshot.val()[tripId]);
        console.debug("Project", projectId, "trips:", trips);
        callback(trips);
      } else {
        callback([]);
      }
    }, {
      onlyOnce: true
    });
  }

  getUserTrips(userId: string, callback: (trips: any[]) => void) {
    onValue(ref(this.database, `users/${userId}/userProject/projectUserTrips`), async (snapshot) => {
      if (snapshot.exists()) {
        const tripIds = Object.keys(snapshot.val());
        const trips = await Promise.all(tripIds.map(async (tripId: string) => {
          const tripSnapshot = await get(ref(this.database, `trips/${tripId}`));
          return tripSnapshot.val();
        }));
        console.debug(`User ${userId} trips: ${trips}`);
        callback(trips);
      } else {
        callback([]);
      }
    }, {
      onlyOnce: true
    });
  }

  async createNewTicket(ticket: TicketCreation, uid: string, project: ProjectDTO) {
    const newTicketKey = push(child(ref(this.database), 'tickets')).key;
    const userName = (await get(ref(this.database, `users/${uid}/userDisplayName`))).val();

    const ticketDBData: TicketDTO = {
      ticketId: newTicketKey!,
      ticketUserId: uid,
      ticketUserName: userName,
      ticketDate: ticket.ticketDate,
      ticketValue: ticket.ticketValue,
    };

    console.debug("Creating new ticket:", ticketDBData);

    const previousProjectTotalPayment = (await get(ref(this.database, `projects/${project.projectId}/projectTotalPayment`))).val();
    const userProjectSnapshot = await get(ref(this.database, `users/${uid}/userProject`));
    const previousAccumValue = userProjectSnapshot.val().projectPayment;

    const updates = {
      // Nuevo ticket
      [`tickets/${project.projectId}/${newTicketKey}`]: ticketDBData,
      // Referencia al ticket en el usuario
      [`users/${uid}/userProject/projectUserTickets/${newTicketKey}`]: true,
      [`users/${uid}/userProject/projectPayment`]: previousAccumValue + ticketDBData.ticketValue,
      // Actualizar los kms totales del proyecto
      [`projects/${project.projectId}/projectTotalPayment`]: previousProjectTotalPayment + ticketDBData.ticketValue,
    };

    await update(ref(this.database), updates);
    return ticketDBData;
  }

}