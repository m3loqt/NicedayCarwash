// One palette for a booking's status wherever it's shown on the admin side (calendar agenda,
// calendar day-cell dots, the Overview "Recent bookings" list). Soft tinted pill with same-hue
// text; a saturated `dot` for tiny markers where a pale fill wouldn't read.

export type BookingStatusKey = 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';

export interface BookingStatusStyle {
  label: string;
  bg: string;
  fg: string;
  dot: string;
}

export const BOOKING_STATUS_STYLE: Record<BookingStatusKey, BookingStatusStyle> = {
  pending: { label: 'Pending', bg: '#FEF6D9', fg: '#8A6A00', dot: '#D9A400' },
  accepted: { label: 'Confirmed', bg: '#E9F0FA', fg: '#2563A0', dot: '#3B82C4' },
  ongoing: { label: 'Ongoing', bg: '#FCEFA6', fg: '#6E5D00', dot: '#C9A200' },
  completed: { label: 'Completed', bg: '#E7F3EC', fg: '#1D7A4C', dot: '#22A05B' },
  cancelled: { label: 'Cancelled', bg: '#FBEBE9', fg: '#C0392B', dot: '#DC4436' },
};

export const bookingStatusStyle = (status: string | undefined): BookingStatusStyle =>
  BOOKING_STATUS_STYLE[status as BookingStatusKey] ?? {
    label: status || 'Unknown',
    bg: '#F2F2F2',
    fg: '#8A8A8A',
    dot: '#BDBDBD',
  };
