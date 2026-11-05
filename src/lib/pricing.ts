export interface PricingInput {
  pieceWeight: number;
  wasteWeight: number;
  costPerKg: number;
  powerW: number;
  hours: number;
  energyRate: number;
  printerValue: number;
  lifeHours: number;
  annualMaintenance: number;
  monthlyHours: number;
  prepMin: number;
  postMin: number;
  hourlyRate: number;
  feePct: number;
  fixedFee: number;
  taxPct: number;
  marginPct: number;
  /** optional price actually charged; 0/undefined = use suggested */
  customPrice?: number;
}

/** Fees, taxes, margin and the resulting sale price. Shared by every technology. */
export interface PriceParams {
  feePct: number;
  fixedFee: number;
  taxPct: number;
  marginPct: number;
  customPrice?: number;
}

export interface PriceOutcome {
  totalCost: number;
  minPrice: number;
  suggestedPrice: number;
  price: number;
  fees: number;
  profit: number;
  realMarginPct: number;
  isLoss: boolean;
}

export interface PricingResult extends PriceOutcome {
  filament: number;
  energy: number;
  machine: number;
  labor: number;
}

const n = (v: number) => (Number.isFinite(v) ? v : 0);

export function finalizePricing(
  totalCost: number,
  p: PriceParams,
): PriceOutcome {
  const pctFees = n(p.feePct) + n(p.taxPct);
  const minDen = 1 - pctFees / 100;
  const minPrice = minDen > 0 ? (totalCost + n(p.fixedFee)) / minDen : Infinity;
  const den = 1 - (pctFees + n(p.marginPct)) / 100;
  // When fees + margin reach 100%+ the divisor formula breaks; fall back to markup over min price.
  const suggestedPrice =
    den > 0.05
      ? (totalCost + n(p.fixedFee)) / den
      : minPrice * (1 + n(p.marginPct) / 100);

  const custom = n(p.customPrice ?? 0);
  const price = custom > 0 ? custom : suggestedPrice;
  const fees = (price * pctFees) / 100 + n(p.fixedFee);
  const profit = price - totalCost - fees;
  const realMarginPct = price > 0 ? (profit / price) * 100 : 0;
  return {
    totalCost,
    minPrice,
    suggestedPrice,
    price,
    fees,
    profit,
    realMarginPct,
    isLoss: price < minPrice - 0.005,
  };
}

export function calculatePricing(i: PricingInput): PricingResult {
  const filament =
    ((n(i.pieceWeight) + n(i.wasteWeight)) / 1000) * n(i.costPerKg);
  const energy = (n(i.powerW) / 1000) * n(i.hours) * n(i.energyRate);
  const depreciation =
    i.lifeHours > 0 ? (n(i.printerValue) / i.lifeHours) * n(i.hours) : 0;
  const maintenance =
    i.monthlyHours > 0
      ? (n(i.annualMaintenance) / 12 / i.monthlyHours) * n(i.hours)
      : 0;
  const machine = depreciation + maintenance;
  const labor = ((n(i.prepMin) + n(i.postMin)) / 60) * n(i.hourlyRate);
  const totalCost = filament + energy + machine + labor;

  return {
    filament,
    energy,
    machine,
    labor,
    ...finalizePricing(totalCost, i),
  };
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export const formatBRL = (v: number) => brl.format(Number.isFinite(v) ? v : 0);
export const formatPct = (v: number) =>
  `${(Number.isFinite(v) ? v : 0).toFixed(1).replace(".", ",")}%`;
export const formatHours = (min: number) =>
  `${Math.floor(min / 60)}h${String(Math.round(min % 60)).padStart(2, "0")}`;
