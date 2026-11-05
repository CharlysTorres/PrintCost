import { describe, it, expect } from "vitest";
import { calculatePricing, type PricingInput } from "@/lib/pricing";

const base: PricingInput = {
  pieceWeight: 100,
  wasteWeight: 0,
  costPerKg: 100,
  powerW: 120,
  hours: 10,
  energyRate: 1,
  printerValue: 5000,
  lifeHours: 5000,
  annualMaintenance: 0,
  monthlyHours: 100,
  prepMin: 30,
  postMin: 30,
  hourlyRate: 20,
  feePct: 15,
  fixedFee: 2,
  taxPct: 0,
  marginPct: 30,
};

describe("pricing", () => {
  it("filament cost = (peça + desperdício)/1000 * custo_kg", () => {
    expect(calculatePricing({ ...base, wasteWeight: 20 }).filament).toBeCloseTo(
      12,
    );
  });
  it("energy cost = W/1000 * horas * tarifa", () => {
    expect(calculatePricing(base).energy).toBeCloseTo(1.2);
  });
  it("machine depreciation = valor/vida * horas", () => {
    expect(calculatePricing(base).machine).toBeCloseTo(10);
  });
  it("labor = minutos/60 * valor_hora", () => {
    expect(calculatePricing(base).labor).toBeCloseTo(20);
  });
  it("sale price = (custo + fixa)/(1 - (taxa+imp+margem)/100)", () => {
    const r = calculatePricing(base);
    expect(r.totalCost).toBeCloseTo(41.2);
    expect(r.suggestedPrice).toBeCloseTo(43.2 / 0.55);
  });
  it("flags loss when price below minimum", () => {
    expect(calculatePricing({ ...base, customPrice: 40 }).isLoss).toBe(true);
  });
});
