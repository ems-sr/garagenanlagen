// Standard EUR cash denominations in cents, descending — banknotes down to
// coins, so a cash payout can hand over the exact amount (reimbursement is
// hours x an hourly rate, which won't generally land on a whole note).
// Greedy is provably optimal (i.e. minimizes note/coin count) for this
// specific denomination set, unlike arbitrary denomination sets in general.
const EUR_DENOMINATIONS_CENTS = [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

export type DenominationBreakdownEntry = { denomination: number; count: number };

// amountCents must be a non-negative integer (cents). Pure and synchronous —
// no DB access, safe to call from both server code and client components.
export function breakdownIntoDenominations(amountCents: number): DenominationBreakdownEntry[] {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error('amountCents must be a non-negative integer');
  }

  const breakdown: DenominationBreakdownEntry[] = [];
  let remaining = amountCents;

  for (const denomination of EUR_DENOMINATIONS_CENTS) {
    const count = Math.floor(remaining / denomination);
    if (count > 0) {
      breakdown.push({ denomination, count });
      remaining -= count * denomination;
    }
  }

  return breakdown;
}
