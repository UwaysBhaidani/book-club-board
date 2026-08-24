export function formatMonthYear(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${mm}-${d.getFullYear()}`;
}

export function formatRating(rating: number): string {
  return Number.isInteger(rating) ? `${rating}.0` : rating.toFixed(1);
}
