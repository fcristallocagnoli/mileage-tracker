import { AbstractControl } from '@angular/forms';

// custom validator to check that tripEndKm is greater than tripStartKm
export function MustBeInRange(startDate: string, endDate: string) {
  return (group: AbstractControl) => {
    const tripDate = group.get('tripDate');

    // trip date debe estar entre project.projectStartDate y project.projectEndDate

    if (!tripDate) {
      return null;
    }

    // return if another validator has already found an error on the tripDate
    if (tripDate.errors && !tripDate.errors['mustBeInRange']) {
      return null;
    }

    const tripDateValue = new Date(group.get('tripDate')?.value);
    const projectStartDate = new Date(startDate);
    const projectEndDate = new Date(endDate);

    // // set error on tripDate if validation fails
    if (tripDateValue < projectStartDate || tripDateValue > projectEndDate) {
      tripDate.setErrors({ mustBeInRange: true });
    } else {
      tripDate.setErrors(null);
    }

    return null;
  }
}