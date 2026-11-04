/**
 * Display format for peso amounts across the booking flow: "₱155", "₱2,500", "₱140.50".
 * Whole amounts drop the decimals; anything with centavos keeps two. Grouping is done by hand
 * because Hermes' toLocaleString is not reliable across Android devices.
 */
export const formatPeso = (n: number): string => {
  const fixed = Number.isInteger(n) ? String(n) : n.toFixed(2);
  const [whole, decimals] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `₱${grouped}${decimals ? `.${decimals}` : ''}`;
};
