import { AbstractControl } from '@angular/forms';
import { ProjectDTO } from '@app/interfaces/project.interface';

// custom validator to check that a date field is between projectStartDate and projectEndDate
export function MustBeInRange(dateFieldRaw: string, project: ProjectDTO) {
  return (group: AbstractControl) => {
    const startDate = project.projectStartDate;
    const endDate = project.projectEndDate;
    
    const dateField = group.get(dateFieldRaw);

    // dateField debe estar entre project.projectStartDate y project.projectEndDate

    if (!dateField) {
      return null;
    }

    // return if another validator has already found an error on the dateField
    if (dateField.errors && !dateField.errors['mustBeInRange']) {
      return null;
    }

    const dateFieldValue = new Date(dateField?.value);
    const projectStartDate = new Date(startDate);
    const projectEndDate = new Date(endDate);

    // set error on dateField if validation fails
    if (dateFieldValue < projectStartDate || dateFieldValue > projectEndDate) {
      dateField.setErrors({ mustBeInRange: true });
    } else {
      dateField.setErrors(null);
    }

    return null;
  }
}