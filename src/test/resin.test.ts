import { describe, it, expect } from "vitest";
import { calculateResinPricing, type ResinPricingInput } from "@/lib/resin";

const base: ResinPricingInput = {
  volumeMl: 100,
  wasteMl: 0,
  costPerLiter: 200,
  powerW: 60,
  hours: 5,
  energyRate: 1,
  printerValue: 3000,
  lifeHours: 3000,
  annualMaintenance: 0,
  monthlyHours: 100,
  fepCost: 100,
  fepPrints: 50,
  ipaMl: 200,
  ipaCostPerLiter: 50,
  gloves: 2,
  gloveUnitCost: 1,
  extraConsumables: 1,
  prepMin: 30,
  postMin: 30,
  hourlyRate: 30,
  feePct: 0,
  fixedFee: 0,
  taxPct: 0,
  marginPct: 30,
};

describe("resin pricing", () => {
  it("resina = (volume + perdas)/1000 * custo_litro", () => {
    expect(calculateResinPricing({ ...base, wasteMl: 20 }).resin).toBeCloseTo(
      24,
    );
  });
  it("energia e depreciação seguem o mesmo modelo do FDM", () => {
    const r = calculateResinPricing(base);
    expect(r.energy).toBeCloseTo(0.3);
    expect(r.machine).toBeCloseTo(5);
  });
  it("FEP é rateado pelo número de impressões", () => {
    expect(calculateResinPricing(base).fep).toBeCloseTo(2);
    expect(calculateResinPricing({ ...base, fepPrints: 0 }).fep).toBe(0);
  });
  it("álcool, luvas e consumíveis entram no custo", () => {
    const r = calculateResinPricing(base);
    expect(r.ipa).toBeCloseTo(10);
    expect(r.ppe).toBeCloseTo(2);
    expect(r.consumables).toBeCloseTo(1);
    expect(r.totalCost).toBeCloseTo(70.3);
  });
  it("preço sugerido aplica margem e taxas", () => {
    expect(calculateResinPricing(base).suggestedPrice).toBeCloseTo(70.3 / 0.7);
  });
  it("sinaliza prejuízo abaixo do preço mínimo", () => {
    expect(calculateResinPricing({ ...base, customPrice: 60 }).isLoss).toBe(
      true,
    );
  });
});
