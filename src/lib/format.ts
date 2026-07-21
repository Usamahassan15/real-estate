export function formatPrice(price: number, listingType: string = "sale") {
  const n = Number(price);
  if (listingType === "rent") {
    return `$${n.toLocaleString()}/mo`;
  }
  return `$${n.toLocaleString()}`;
}

export function formatShort(price: number) {
  const n = Number(price);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}
