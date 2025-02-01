export interface ProjectJoin {
    projectId: string;
    projectPassword: string;
}

export interface ProjectCreation {
    projectName: string;
    projectPassword: string;
    projectStartDate: string;
    projectEndDate: string;
    projectDescription: string;
}

export interface ProjectDTO {
    projectId: string;
    projectName: string;
    projectPasswordHash: string,
    projectDescription: string;
    projectStartDate: string;
    projectEndDate: string;
    projectTotalKms: number;
}
