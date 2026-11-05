import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAuth } from "./auth";
import {
  fetchRemoteState,
  pushRemoteState,
  subscribeToRemoteState,
} from "./sync";

export type Material = "PLA" | "PETG" | "ABS" | "TPU" | "Resina";
export const MATERIALS: Material[] = ["PLA", "PETG", "ABS", "TPU", "Resina"];
export type OrderStatus =
  "Orçamento" | "Em produção" | "Concluído" | "Entregue" | "Cancelado";
export const STATUSES: OrderStatus[] = [
  "Orçamento",
  "Em produção",
  "Concluído",
  "Entregue",
  "Cancelado",
];

export type Technology = "FDM" | "Resina";
export const TECHNOLOGIES: Technology[] = ["FDM", "Resina"];

export interface Filament {
  id: string;
  name: string;
  material: Material;
  brand: string;
  color: string;
  remaining: number;
  total: number;
  costPerKg: number;
  supplier: string;
}
export interface Resin {
  id: string;
  name: string;
  brand: string;
  color: string;
  remainingMl: number;
  totalMl: number;
  costPerLiter: number;
  supplier: string;
}
export interface Printer {
  id: string;
  name: string;
  model: string;
  technology: Technology;
  powerW: number;
  value: number;
  lifeHours: number;
  hoursUsed: number;
  annualMaintenance: number;
}
export interface CostBreakdown {
  filament: number;
  energy: number;
  machine: number;
  labor: number;
  fees: number;
  resin?: number;
  fep?: number;
  ipa?: number;
  ppe?: number;
  consumables?: number;
}
export interface Order {
  id: string;
  client: string;
  piece: string;
  date: string;
  printMinutes: number;
  technology?: Technology;
  filamentId?: string | undefined;
  grams: number;
  volumeMl?: number | undefined;
  resinId?: string | undefined;
  cost: number;
  price: number;
  profit: number;
  status: OrderStatus;
  breakdown: CostBreakdown;
}
export interface Settings {
  energyRate: number;
  hourlyRate: number;
  feePct: number;
  fixedFee: number;
  taxPct: number;
  marginPct: number;
  powerW: number;
  resinCostPerLiter: number;
  resinPowerW: number;
  ipaCostPerLiter: number;
  fepCost: number;
  fepPrints: number;
  gloveUnitCost: number;
}

interface Data {
  filaments: Filament[];
  resins: Resin[];
  printers: Printer[];
  orders: Order[];
  settings: Settings;
}

export const defaultSettings: Settings = {
  energyRate: 0.85,
  hourlyRate: 25,
  feePct: 15,
  fixedFee: 2,
  taxPct: 0,
  marginPct: 50,
  powerW: 120,
  resinCostPerLiter: 180,
  resinPowerW: 60,
  ipaCostPerLiter: 25,
  fepCost: 90,
  fepPrints: 40,
  gloveUnitCost: 0.85,
};

export const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): Data {
  const filaments: Filament[] = [
    {
      id: "f1",
      name: "PLA Silk Preto",
      material: "PLA",
      brand: "Voolt3D",
      color: "#18181b",
      remaining: 780,
      total: 1000,
      costPerKg: 109.9,
      supplier: "Voolt3D",
    },
    {
      id: "f2",
      name: "PETG Azul Petróleo",
      material: "PETG",
      brand: "3D Lab",
      color: "#0e7490",
      remaining: 450,
      total: 1000,
      costPerKg: 129.9,
      supplier: "3D Lab",
    },
    {
      id: "f3",
      name: "PLA Branco",
      material: "PLA",
      brand: "Sethi3D",
      color: "#f4f4f5",
      remaining: 150,
      total: 1000,
      costPerKg: 99.9,
      supplier: "Mercado Livre",
    },
    {
      id: "f4",
      name: "TPU Vermelho",
      material: "TPU",
      brand: "Cliever",
      color: "#e11d48",
      remaining: 600,
      total: 500 + 500,
      costPerKg: 189.9,
      supplier: "Cliever",
    },
  ];
  const resins: Resin[] = [
    {
      id: "r1",
      name: "ABS-Like Cinza",
      brand: "Elegoo",
      color: "#6b7280",
      remainingMl: 620,
      totalMl: 1000,
      costPerLiter: 179.9,
      supplier: "Elegoo",
    },
    {
      id: "r2",
      name: "Standard Translúcida",
      brand: "Anycubic",
      color: "#d4d4d8",
      remainingMl: 180,
      totalMl: 1000,
      costPerLiter: 139.9,
      supplier: "Anycubic",
    },
    {
      id: "r3",
      name: "Flexível Preta",
      brand: "Sunlu",
      color: "#18181b",
      remainingMl: 950,
      totalMl: 1000,
      costPerLiter: 249.9,
      supplier: "Sunlu",
    },
  ];
  const printers: Printer[] = [
    {
      id: "p1",
      name: "Bambu P1S",
      model: "Bambu Lab P1S",
      technology: "FDM",
      powerW: 140,
      value: 5800,
      lifeHours: 5000,
      hoursUsed: 1240,
      annualMaintenance: 400,
    },
    {
      id: "p2",
      name: "Ender 3 V3",
      model: "Creality Ender 3 V3 SE",
      technology: "FDM",
      powerW: 110,
      value: 1600,
      lifeHours: 4000,
      hoursUsed: 2980,
      annualMaintenance: 250,
    },
    {
      id: "p3",
      name: "Mars 4 Ultra",
      model: "Elegoo Mars 4 Ultra",
      technology: "Resina",
      powerW: 60,
      value: 2500,
      lifeHours: 3000,
      hoursUsed: 380,
      annualMaintenance: 200,
    },
  ];
  const pieces: [string, string][] = [
    ["Mariana Souza", "Suporte de headset"],
    ["Loja Geek BH", "Action figure 15cm"],
    ["Carlos Lima", "Vaso decorativo"],
    ["Ateliê Flor", "Cortador de biscoito (kit)"],
    ["João Pedro", "Case Raspberry Pi"],
    ["Studio Arq", "Maquete fachada"],
    ["Fernanda Reis", "Chaveiros personalizados"],
    ["Loja Geek BH", "Busto Darth Vader"],
    ["Rafael Costa", "Peça de reposição drone"],
    ["Ana Clara", "Luminária lua"],
    ["Studio Arq", "Maquete terreno"],
    ["Pedro H.", "Organizador de mesa"],
    ["Mariana Souza", "Porta-canetas"],
    ["Ateliê Flor", "Carimbos"],
  ];
  const now = new Date();
  const orders: Order[] = pieces.map(([client, piece], i) => {
    const d = new Date(
      now.getFullYear(),
      now.getMonth() - Math.floor(i / 2.4),
      Math.max(1, 26 - ((i * 7) % 24)),
    );
    const grams = 40 + ((i * 37) % 260);
    const printMinutes = 120 + ((i * 97) % 900);
    const filament = ((grams * 1.1) / 1000) * 115;
    const energy = (130 / 1000) * (printMinutes / 60) * 0.85;
    const machine = (printMinutes / 60) * 1.3;
    const labor = 0.5 * 25;
    const cost = filament + energy + machine + labor;
    const price = Math.round(((cost + 2) / 0.45) * 100) / 100;
    const fees = price * 0.15 + 2;
    const status: OrderStatus =
      i < 2
        ? "Em produção"
        : i === 2
          ? "Orçamento"
          : i === 6
            ? "Cancelado"
            : i === 3
              ? "Concluído"
              : "Entregue";
    return {
      id: uid(),
      client,
      piece,
      date: d.toISOString(),
      printMinutes,
      technology: "FDM",
      filamentId: filaments[i % filaments.length]?.id,
      grams,
      cost,
      price,
      profit: price - cost - fees,
      status,
      breakdown: { filament, energy, machine, labor, fees },
    };
  });
  return { filaments, resins, printers, orders, settings: defaultSettings };
}

const KEY = "printcost:data:v1";
const OWNER_KEY = "printcost:data:owner";
const TS_KEY = "printcost:data:updated_at";

interface Store extends Data {
  ready: boolean;
  setFilaments: (f: (prev: Filament[]) => Filament[]) => void;
  setResins: (f: (prev: Resin[]) => Resin[]) => void;
  setPrinters: (f: (prev: Printer[]) => Printer[]) => void;
  setOrders: (f: (prev: Order[]) => Order[]) => void;
  setSettings: (s: Settings) => void;
}

const Ctx = createContext<Store | null>(null);

/** Dados antigos não têm os campos novos; completa sem perder o que já foi salvo. */
function normalize(parsed: Partial<Data>): Data {
  return {
    filaments: parsed.filaments ?? [],
    resins: parsed.resins ?? [],
    printers: (parsed.printers ?? []).map((p) => ({
      ...p,
      technology: p.technology ?? "FDM",
    })),
    orders: parsed.orders ?? [],
    settings: { ...defaultSettings, ...parsed.settings },
  };
}

function readLocal(): Data | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw) as Partial<Data>) : null;
  } catch {
    return null;
  }
}

/** Remove o cache local — usado depois de excluir a conta. */
export function clearLocalData() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(OWNER_KEY);
  localStorage.removeItem(TS_KEY);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { configured, loading: authLoading, user } = useAuth();
  const userId = configured ? user?.id : undefined;
  const [data, setData] = useState<Data | null>(null);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const dataRef = useRef<Data | null>(null);
  const remoteAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Carrega o estado do usuário logado: nuvem > cache local > dados de exemplo.
  useEffect(() => {
    if (authLoading) return;
    if (configured && !userId) {
      setHydratedFor(null);
      return;
    }

    if (!configured) {
      setData(readLocal() ?? seed());
      setHydratedFor("local");
      return;
    }

    let cancelled = false;
    const localOwner = localStorage.getItem(OWNER_KEY);
    const local = localOwner === userId ? readLocal() : null;

    void (async () => {
      let base = local ?? seed();
      let fromRemote = false;
      try {
        const remote = await fetchRemoteState(userId as string);
        if (cancelled) return;
        if (remote) {
          const remoteData = normalize(remote.data as Partial<Data>);
          const localTs = Number(localStorage.getItem(TS_KEY) ?? 0);
          if (local && localTs > remote.updatedAt) {
            base = local;
          } else {
            base = remoteData;
            fromRemote = true;
          }
        } else {
          await pushRemoteState(userId as string, base);
        }
      } catch (err) {
        console.warn("Não foi possível sincronizar com o Supabase", err);
      }
      if (cancelled) return;
      if (fromRemote) remoteAppliedRef.current = JSON.stringify(base);
      localStorage.setItem(OWNER_KEY, userId as string);
      localStorage.setItem(TS_KEY, String(Date.now()));
      setData(base);
      setHydratedFor(userId as string);
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, authLoading, userId]);

  useEffect(() => {
    if (data) localStorage.setItem(KEY, JSON.stringify(data));
  }, [data]);

  // Envia alterações para a nuvem (debounce para não gravar a cada tecla).
  useEffect(() => {
    if (!configured || !userId || hydratedFor !== userId || !data) return;
    localStorage.setItem(TS_KEY, String(Date.now()));
    // Veio de outro dispositivo: não devolve o mesmo documento para a nuvem.
    if (remoteAppliedRef.current === JSON.stringify(data)) return;
    const timer = setTimeout(() => {
      void pushRemoteState(userId, data).catch((err) =>
        console.warn("Falha ao sincronizar com o Supabase", err),
      );
    }, 800);
    return () => clearTimeout(timer);
  }, [configured, data, hydratedFor, userId]);

  // Tempo real: outro dispositivo/aba alterou o documento do usuário.
  useEffect(() => {
    if (!configured || !userId || hydratedFor !== userId) return;

    return subscribeToRemoteState(userId, (remote) => {
      const incoming = normalize(remote.data as Partial<Data>);
      const serialized = JSON.stringify(incoming);
      if (serialized === JSON.stringify(dataRef.current)) return;

      remoteAppliedRef.current = serialized;
      localStorage.setItem(TS_KEY, String(remote.updatedAt || Date.now()));
      setData(incoming);
      toast.info("Dados atualizados a partir de outro dispositivo");
    });
  }, [configured, userId, hydratedFor]);

  const upd = useCallback(
    <K extends keyof Data>(k: K, fn: (p: Data[K]) => Data[K]) =>
      setData((d) => (d ? { ...d, [k]: fn(d[k]) } : d)),
    [],
  );

  const d = data ?? {
    filaments: [],
    resins: [],
    printers: [],
    orders: [],
    settings: defaultSettings,
  };
  const value: Store = {
    ...d,
    ready: !!data,
    setFilaments: (f) => upd("filaments", f),
    setResins: (f) => upd("resins", f),
    setPrinters: (f) => upd("printers", f),
    setOrders: (f) => upd("orders", f),
    setSettings: (s) => upd("settings", () => s),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}
