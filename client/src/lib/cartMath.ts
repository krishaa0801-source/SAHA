// Pure display helpers only. Totals/discounts are no longer computed here
// — they come from the backend (CartState.totals, see lib/cart.ts) so the
// number shown is always the number that gets charged.

export function fmtRs(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export function diffDays(from: string, to: string): number {
  if (!from || !to) return 1;
  return Math.max(Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000) + 1, 1);
}

// Mirrors the fixed-tier rules in server/services/pricing.js
// (getPricingTier/calculateRentalPrice) — for display-only estimates
// (e.g. a cart line before it's re-priced by the server). Rental pricing
// is a ONE-TIME flat fee per tier, never multiplied by day count.
export type RentalTier = { label: string; multiplier: number };

export function tierForDays(days: number): RentalTier {
  if (days <= 2) return { label: '1–2 Days', multiplier: 1 };
  if (days <= 7) return { label: '3–7 Days', multiplier: 1.3 };
  return { label: '8+ Days', multiplier: 1.5 };
}

export function rentalPrice(basePrice: number, days: number): number {
  return basePrice * tierForDays(days).multiplier;
}

export function fmtDateDisplay(str: string): string | null {
  if (!str) return null;
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
