export interface TripCreation {
    tripDate: string;
    tripStartKm: number;
    tripEndKm: number;
}

export interface TripDTO {
    tripId: string;
    tripUserId: string;
    tripUserName: string;
    tripDate: string;
    tripStartKm: number;
    tripEndKm: number;
    tripTotalKms: number;
}
