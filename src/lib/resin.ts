import {
  finalizePricing,
  type PriceOutcome,
  type PriceParams,
} from "./pricing";

export interface ResinPricingInput extends PriceParams {
  /** volume da peça em ml (do slicer) */
  volumeMl: number;
  /** resina perdida com suportes, drenagem e filtragem, em ml */
  wasteMl: number;
  costPerLiter: number;
  powerW: number;
  hours: number;
  energyRate: number;
  printerValue: number;
  lifeHours: number;
  annualMaintenance: number;
  monthlyHours: number;
  fepCost: number;
  fepPrints: number;
  ipaMl: number;
  ipaCostPerLiter: number;
  /** pares de luvas por impressão */
  gloves: number;
  gloveUnitCost: number;
  /** papel, funil, filtro e afins por impressão */
  extraConsumables: number;
  prepMin: number;
  postMin: number;
  hourlyRate: number;
}

export interface ResinPricingResult extends PriceOutcome {
  resin: number;
  energy: number;
  machine: number;
  fep: number;
  ipa: number;
  ppe: number;
  consumables: number;
  labor: number;
}

const n = (v: number) => (Number.isFinite(v) ? v : 0);

export function calculateResinPricing(
  i: ResinPricingInput,
): ResinPricingResult {
  const resin = ((n(i.volumeMl) + n(i.wasteMl)) / 1000) * n(i.costPerLiter);
  const energy = (n(i.powerW) / 1000) * n(i.hours) * n(i.energyRate);
  const depreciation =
    i.lifeHours > 0 ? (n(i.printerValue) / i.lifeHours) * n(i.hours) : 0;
  const maintenance =
    i.monthlyHours > 0
      ? (n(i.annualMaintenance) / 12 / i.monthlyHours) * n(i.hours)
      : 0;
  const machine = depreciation + maintenance;
  const fep = i.fepPrints > 0 ? n(i.fepCost) / i.fepPrints : 0;
  const ipa = (n(i.ipaMl) / 1000) * n(i.ipaCostPerLiter);
  const ppe = n(i.gloves) * n(i.gloveUnitCost);
  const consumables = n(i.extraConsumables);
  const labor = ((n(i.prepMin) + n(i.postMin)) / 60) * n(i.hourlyRate);
  const totalCost =
    resin + energy + machine + fep + ipa + ppe + consumables + labor;

  return {
    resin,
    energy,
    machine,
    fep,
    ipa,
    ppe,
    consumables,
    labor,
    ...finalizePricing(totalCost, i),
  };
}
