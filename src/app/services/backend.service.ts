import { Injectable } from '@angular/core';

import { ProjectCreation, ProjectDTO, ProjectJoin } from '@app/interfaces/project.interface';
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
        userTotalKms: 0,
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
        userDisplayName: user.displayName || user.email!.split('@')[0],
        userEmail: user.email,
        userPhotoURL: user.photoURL,
        userTotalKms: 0,
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
    };

    const updates = {
      // Nuevo proyecto
      [`projects/${newProjectKey}`]: { ...projectDBData, projectUsers: { [userId]: true } },
      // Referencia al proyecto en el usuario (no hay mas de un proyecto por usuario)
      // Kms hechos por el usuario en el proyecto a 0
      [`users/${userId}/userProject`]: { projectId: newProjectKey, projectKms: 0 },
    }

    await update(ref(this.database), updates);
    return projectDBData;
  }

  getUserProject(userId: string, callback: (project: ProjectDTO | null) => void) {
    onValue(ref(this.database, `users/${userId}/userProject/projectId`), async (snapshot) => {
      if (snapshot.exists()) {
        const projectId = snapshot.val();
        const projectSnapshot = await get(ref(this.database, `projects/${projectId}`));
        const { projectPasswordHash, ...projectData } = projectSnapshot.val();
        // const project = { ...projectData, projectTrips: [] };
        console.log("Project", projectData);
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
        console.log("Users", users);
        callback(users);
      } else {
        callback([]);
      }
    }, {
      onlyOnce: true
    });
  }

  async createNewTrip(trip: TripCreation, uid: string, project: ProjectDTO) {
    const tripSnapshot = await get(ref(this.database, `trips/${project.projectId}`));
    const userName = (await get(ref(this.database, `users/${uid}/userDisplayName`))).val();

    let newTripKey = push(child(ref(this.database), 'trips')).key;
    let tripDBData: TripDTO;

    let existingTrip: any = null;

    if (tripSnapshot.exists()) {
      const trips = tripSnapshot.val();
      const existingTripKey = Object.keys(trips).find(key => trips[key].tripUserId === uid && trips[key].tripDate === trip.tripDate);

      if (existingTripKey) {
        existingTrip = trips[existingTripKey];
        tripDBData = {
          ...existingTrip,
          tripStartKm: Math.min(existingTrip.tripStartKm, trip.tripStartKm),
          tripEndKm: Math.max(existingTrip.tripEndKm, trip.tripEndKm),
          tripTotalKms: Math.max(existingTrip.tripEndKm, trip.tripEndKm) - Math.min(existingTrip.tripStartKm, trip.tripStartKm),
        };
        newTripKey = existingTripKey;
      } else {
        tripDBData = {
          tripId: newTripKey!,
          tripUserId: uid,
          tripUserName: userName,
          tripDate: trip.tripDate,
          tripStartKm: trip.tripStartKm,
          tripEndKm: trip.tripEndKm,
          tripTotalKms: trip.tripEndKm - trip.tripStartKm,
        };
      }
    } else {
      tripDBData = {
        tripId: newTripKey!,
        tripUserId: uid,
        tripUserName: userName,
        tripDate: trip.tripDate,
        tripStartKm: trip.tripStartKm,
        tripEndKm: trip.tripEndKm,
        tripTotalKms: trip.tripEndKm - trip.tripStartKm,
      };
    }

    const previousProjectTotalKms = (await get(ref(this.database, `projects/${project.projectId}/projectTotalKms`))).val();
    const userProjectSnapshot = await get(ref(this.database, `users/${uid}/userProject`));
    const previousKms = userProjectSnapshot.val().projectKms;
    const newKmsToAdd = tripDBData.tripTotalKms - (existingTrip ? existingTrip.tripTotalKms : 0);

    const updates = {
      // Nuevo trip o actualización del existente
      [`trips/${project.projectId}/${newTripKey}`]: tripDBData,
      // Referencia al trip en el usuario
      [`users/${uid}/userProject/projectUserTrips/${newTripKey}`]: true,
      [`users/${uid}/userProject/projectKms`]: previousKms + newKmsToAdd,
      // Actualizar los kms totales del proyecto
      [`projects/${project.projectId}/projectTotalKms`]: previousProjectTotalKms + newKmsToAdd,
    };

    await update(ref(this.database), updates);
    return tripDBData;
  }

  getProjectTrips(projectId: string, callback: (trips: any[]) => void) {
    onValue(ref(this.database, `trips/${projectId}`), (snapshot) => {
      if (snapshot.exists()) {
        const trips = Object.keys(snapshot.val()).map((tripId: string) => snapshot.val()[tripId]);
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
        console.log("User Trips", trips);
        callback(trips);
      } else {
        callback([]);
      }
    }, {
      onlyOnce: true
    });
  }

  joinProject(projectJoin: ProjectJoin, uid: string) {
    return new Promise<ProjectDTO>((resolve, reject) => {
      get(ref(this.database, 'projects/' + projectJoin.projectId)).then((snapshot) => {
        if (snapshot.exists()) {
          const project = snapshot.val();
          if (project.projectPasswordHash === sha256(projectJoin.projectPassword)) {
            update(ref(this.database, `users/${uid}/userProject`), {
              projectId: projectJoin.projectId,
              projectKms: 0,
            });
            update(ref(this.database, `projects/${projectJoin.projectId}/projectUsers`), {
              [uid]: true,
            });
            resolve(project);
          } else {
            reject("Invalid project password");
          }
        } else {
          reject("Project not found");
        }
      });
    });
  }
  
}