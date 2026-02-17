import currency from "currency.js";

export function cents(amount: number): string {
  return currency(amount, { fromCents: true }).format();
}
