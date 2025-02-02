import { AbstractControl } from '@angular/forms';
import { monthStart, monthEnd, isAfter, isBefore } from '@formkit/tempo';

// custom validator to check that tripEndKm is greater than tripStartKm
export function TripDateValidator() {
  return (group: AbstractControl) => {
    const tripDate = group.get('tripDate');

    if (!tripDate) {
      return null;
    }

    const tripDateValue = new Date(tripDate.value);
    const startOfCurrentMonth = monthStart(new Date());
    const endOfCurrentMonth = monthEnd(new Date());

    if (isBefore(tripDateValue, startOfCurrentMonth) || isAfter(tripDateValue, endOfCurrentMonth)) {
      return { tripDateInvalid: true };
    }

    return null;
  };
}