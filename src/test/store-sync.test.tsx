import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/lib/store";

const state = vi.hoisted(() => ({
  auth: { configured: true, loading: false, user: { id: "user-1" } } as {
    configured: boolean;
    loading: boolean;
    user: { id: string } | null;
  },
  fetchRemoteState: vi.fn(),
  pushRemoteState: vi.fn(),
  subscribeToRemoteState: vi.fn(() => () => {}),
}));

vi.mock("@/lib/auth", () => ({ useAuth: () => state.auth }));
vi.mock("@/lib/sync", () => ({
  fetchRemoteState: state.fetchRemoteState,
  pushRemoteState: state.pushRemoteState,
  subscribeToRemoteState: state.subscribeToRemoteState,
}));

import { StoreProvider, useStore } from "@/lib/store";

function Probe() {
  const { ready, filaments, resins, orders, settings, setOrders } = useStore();
  return (
    <div>
      <span data-testid="ready">{String(ready)}</span>
      <span data-testid="filaments">{filaments.length}</span>
      <span data-testid="resins">{resins.length}</span>
      <span data-testid="orders">{orders.length}</span>
      <span data-testid="margin">{settings.marginPct}</span>
      <span data-testid="energy">{settings.energyRate}</span>
      <button
        onClick={() =>
          setOrders((list) => [
            ...list,
            {
              id: `o-${list.length}`,
              client: "Teste",
              piece: "Peça",
              date: new Date().toISOString(),
              printMinutes: 60,
              grams: 10,
              cost: 5,
              price: 10,
              profit: 4,
              status: "Orçamento",
              breakdown: {
                filament: 5,
                energy: 0,
                machine: 0,
                labor: 0,
                fees: 1,
              },
            } satisfies Order,
          ])
        }
      >
        adicionar
      </button>
    </div>
  );
}

function renderStore() {
  return render(
    <StoreProvider>
      <Probe />
    </StoreProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  state.auth = { configured: true, loading: false, user: { id: "user-1" } };
  state.fetchRemoteState.mockReset().mockResolvedValue(null);
  state.pushRemoteState.mockReset().mockResolvedValue(undefined);
  state.subscribeToRemoteState.mockReset().mockReturnValue(() => {});
});

describe("StoreProvider sync", () => {
  it("hidrata com o documento do usuário vindo da nuvem", async () => {
    state.fetchRemoteState.mockResolvedValue({
      data: {
        filaments: [],
        resins: [],
        printers: [],
        orders: [],
        settings: { marginPct: 77 },
      },
      updatedAt: Date.now(),
    });

    renderStore();

    await waitFor(() =>
      expect(screen.getByTestId("ready")).toHaveTextContent("true"),
    );
    expect(screen.getByTestId("filaments")).toHaveTextContent("0");
    expect(screen.getByTestId("resins")).toHaveTextContent("0");
    expect(screen.getByTestId("margin")).toHaveTextContent("77");
    // Campos ausentes no documento remoto recebem o padrão.
    expect(screen.getByTestId("energy")).toHaveTextContent("0.85");
    expect(state.pushRemoteState).not.toHaveBeenCalled();
  });

  it("envia o estado local quando a conta ainda não tem nada na nuvem", async () => {
    renderStore();

    await waitFor(() => expect(state.pushRemoteState).toHaveBeenCalled());
    const [userId, payload] = state.pushRemoteState.mock.calls[0] as [
      string,
      { filaments: unknown[]; resins: unknown[] },
    ];
    expect(userId).toBe("user-1");
    expect(payload.filaments).toHaveLength(4);
    expect(payload.resins).toHaveLength(3);
    await waitFor(() =>
      expect(screen.getByTestId("ready")).toHaveTextContent("true"),
    );
  });

  it("envia alterações locais para a nuvem após a hidratação", async () => {
    state.fetchRemoteState.mockResolvedValue({
      data: {
        filaments: [],
        resins: [],
        printers: [],
        orders: [],
        settings: {},
      },
      updatedAt: Date.now() - 1000,
    });

    renderStore();
    await waitFor(() =>
      expect(screen.getByTestId("ready")).toHaveTextContent("true"),
    );

    fireEvent.click(screen.getByText("adicionar"));

    await waitFor(
      () => expect(state.pushRemoteState).toHaveBeenCalledTimes(1),
      {
        timeout: 2500,
      },
    );
    const [, payload] = state.pushRemoteState.mock.calls[0] as [
      string,
      { orders: unknown[] },
    ];
    expect(payload.orders).toHaveLength(1);
  });

  it("assina o canal em tempo real só depois de hidratar", async () => {
    state.fetchRemoteState.mockResolvedValue({
      data: {
        filaments: [],
        resins: [],
        printers: [],
        orders: [],
        settings: {},
      },
      updatedAt: Date.now(),
    });

    renderStore();

    await waitFor(() =>
      expect(state.subscribeToRemoteState).toHaveBeenCalledWith(
        "user-1",
        expect.any(Function),
      ),
    );
  });
});
