/**
 * Service-duration formatting.
 *
 * Durations live in the data model as MINUTES: each catalog service/add-on carries an
 * `estimatedTime` in minutes (the admin form is literally labelled "Est. Time (mins)"), and
 * the booking flow sums them into `timeSlot.estCompletion` - stored as a bare stringified
 * number of minutes (see ConfirmationStep.tsx). Every place that does time math on it already
 * multiplies by 60_000; only the display strings used to be wrong, rendering "50" as "50 Hours".
 *
 * Use `parseDurationMinutes` to read the stored value and `formatDuration` to show it.
 */

/**
 * Coerces a stored duration into a whole number of minutes. Accepts a number, or a string
 * that may already carry a unit ("50", "50 min", "3 Hours" -> 50 / 50 / 3). Non-finite or
 * negative inputs collapse to 0.
 */
export function parseDurationMinutes(value?: string | number | null): number {
  if (value == null) return 0;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  }
  const n = parseFloat(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/**
 * Human label for a duration given in minutes (or a stored value `parseDurationMinutes`
 * understands): "45 min", "2 hr", "1 hr 20 min". Returns '' for a zero/absent duration so
 * callers can conditionally render the row.
 */
export function formatDuration(value?: string | number | null): string {
  const total = parseDurationMinutes(value);
  if (total <= 0) return '';
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}
