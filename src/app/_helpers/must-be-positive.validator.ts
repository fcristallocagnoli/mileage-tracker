import { AbstractControl } from '@angular/forms';

// custom validator to check that tripEndKm is greater than tripStartKm
export function MustBePositive() {
  return (group: AbstractControl) => {
    const tripStartKm = group.get('tripStartKm');
    const tripEndKm = group.get('tripEndKm');

    if (!tripStartKm || !tripEndKm) {
      return null;
    }

    // return if another validator has already found an error on the tripEndKm
    if (tripEndKm.errors && !tripEndKm.errors['mustBePositive']) {
      return null;
    }

    const startKmValue = Number(tripStartKm.value);
    const endKmValue = Number(tripEndKm.value);

    // set error on tripEndKm if validation fails
    if (startKmValue >= endKmValue) {
      tripEndKm.setErrors({ mustBePositive: true });
    } else {
      tripEndKm.setErrors(null);
    }
    return null;
  }
}