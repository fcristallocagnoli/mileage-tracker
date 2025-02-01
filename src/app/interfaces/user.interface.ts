export interface UserToLogIn {
    email: string;
    password: string;
}

export interface UserToRegister {
    fullName: string;
    email: string;
    password: string;
}

export interface UserDTO {
    userId: string;
    userDisplayName: string;
    userEmail: string;
    userPhotoURL: string;
    userTotalKms: number;
}
