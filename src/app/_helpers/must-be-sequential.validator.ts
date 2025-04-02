import { AbstractControl } from '@angular/forms';

// custom validator to check that tripStartKm mathes lastTripEndKms
export function MustBeSequential(lastTripEndKms: number) {
  return (group: AbstractControl) => {
    const tripStartKm = group.get('tripStartKm');

    if (!tripStartKm) {
      return null;
    }

    // return if another validator has already found an error on the tripStartKm
    if (tripStartKm.errors && !tripStartKm.errors['mustBeSequential']) {
      return null;
    }

    const tripStartKmValue = Number(group.get('tripStartKm')?.value);

    // Logging for debugging purposes
    // console.table([
    //   { 'tripStartKm': tripStartKmValue, 'lastTripEndKms': lastTripEndKms },
    // ])

    // set error on tripStartKm if validation fails
    if (tripStartKmValue !== lastTripEndKms) {
      tripStartKm.setErrors({ mustBeSequential: true });
    } else {
      tripStartKm.setErrors(null);
    }

    return null;
  }
}