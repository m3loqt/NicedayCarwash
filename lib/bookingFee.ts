/**
 * Flat online booking fee (PHP) charged through Maya when a booking is placed. Services and
 * add-ons are settled in person after the service; only this deposit goes through Maya.
 *
 * Keep in sync with BOOKING_FEE in functions/src/index.ts, which is what is actually charged
 * (the server never trusts a client-sent amount). This copy only drives what the app displays.
 */
export const BOOKING_FEE = 25;
