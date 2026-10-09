/** Monthly amortized payment in pesos, rounded to 2 dp. 0 for anything that cannot be financed. */
export function monthlyPayment(price: number, down: number, annualRatePct: number, months: number): number {
  const loan = price - (Number.isFinite(down) ? down : 0)
  if (!Number.isFinite(loan) || loan <= 0 || !Number.isFinite(months) || months <= 0) return 0
  const r = Number.isFinite(annualRatePct) ? annualRatePct / 100 / 12 : 0
  const pay = r === 0 ? loan / months : (loan * r) / (1 - Math.pow(1 + r, -months))
  return Math.round(pay * 100) / 100
}
