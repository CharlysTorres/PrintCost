import { supabase } from "./supabase";
import type { Order, OrderStatus, Product, StoreSettings } from "./store";

const STOREFRONT_TABLE = "printcost_storefronts";
const STORE_ORDERS_TABLE = "printcost_store_orders";

export interface StorefrontRow {
  user_id: string;
  slug: string;
  name: string;
  products: Product[];
}

export interface StoreOrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  variation?: string;
  image?: string;
}

export interface StoreOrderRow {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: StoreOrderItem[];
  total: number;
  status: string;
  created_at: string;
}

export interface NewStoreOrder {
  slug: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: StoreOrderItem[];
  total: number;
}

const ORDER_STATUSES: OrderStatus[] = [
  "Orçamento",
  "Em produção",
  "Concluído",
  "Entregue",
  "Cancelado",
];

function toStatus(value: string): OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus)
    ? (value as OrderStatus)
    : "Orçamento";
}

/** Lê a vitrine pública de uma loja pelo link. */
export async function fetchStorefront(
  slug: string,
): Promise<StorefrontRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(STOREFRONT_TABLE)
    .select("user_id, slug, name, products")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as StorefrontRow | null) ?? null;
}

/** Verifica se o link já pertence a outra loja. */
export async function isSlugTaken(
  slug: string,
  userId: string,
): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from(STOREFRONT_TABLE)
    .select("user_id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  const row = data as { user_id: string } | null;
  return Boolean(row && row.user_id !== userId);
}

/** Publica (ou atualiza) a vitrine do usuário. */
export async function pushStorefront(
  userId: string,
  store: StoreSettings & { products: Product[] },
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from(STOREFRONT_TABLE).upsert(
    {
      user_id: userId,
      slug: store.slug,
      name: store.name,
      products: store.products,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

/** Pedidos recebidos pela loja pública do usuário. */
export async function fetchStoreOrders(
  userId: string,
): Promise<StoreOrderRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(STORE_ORDERS_TABLE)
    .select(
      "id, customer_name, customer_email, customer_phone, items, total, status, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as StoreOrderRow[] | null) ?? [];
}

/** Cria o pedido de um cliente sem exigir login (RPC security definer). */
export async function createStoreOrder(order: NewStoreOrder): Promise<string> {
  if (!supabase) throw new Error("Loja indisponível: Supabase não configurado");
  const { data, error } = await supabase.rpc("printcost_create_store_order", {
    p_slug: order.slug,
    p_customer_name: order.customerName,
    p_customer_email: order.customerEmail,
    p_customer_phone: order.customerPhone,
    p_items: order.items,
    p_total: order.total,
  });
  if (error) throw error;
  return data as string;
}

export async function updateStoreOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from(STORE_ORDERS_TABLE)
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteStoreOrder(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from(STORE_ORDERS_TABLE)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Converte um pedido da loja no formato exibido na tela de pedidos. */
export function storeOrderToOrder(row: StoreOrderRow): Order {
  const items = row.items ?? [];
  const quantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const variation = items
    .map((item) => item.variation)
    .filter(Boolean)
    .join(", ");
  return {
    id: row.id,
    client: row.customer_name,
    piece:
      items
        .map(
          (item) =>
            `${item.title}${item.variation ? ` (${item.variation})` : ""} × ${item.quantity}`,
        )
        .join(", ") || "Pedido da loja",
    date: row.created_at,
    printMinutes: 0,
    grams: 0,
    cost: 0,
    price: Number(row.total) || 0,
    profit: 0,
    status: toStatus(row.status),
    breakdown: {
      filament: 0,
      energy: 0,
      machine: 0,
      labor: 0,
      fees: 0,
    },
    source: "loja",
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    quantity: quantity || undefined,
    variation: variation || undefined,
  };
}
