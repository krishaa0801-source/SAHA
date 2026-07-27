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

export function fmtDateDisplay(str: string): string | null {
  if (!str) return null;
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
