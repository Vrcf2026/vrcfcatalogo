import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

const COOKIE_CONSENT_KEY = "vrcf_cookie_consent";

function hasFunctionalConsent(): boolean {
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export interface CartItem {
  id: string;
  name: string;
  price: number | null;
  imageUrl: string | null;
  category: string | null;
  quantity: number;
  sku?: string | null;
  weight?: number | null;
  fornecedor?: string | null;
  envio_especial?: boolean;
  // Quantidade mínima de venda (embalagem/MOQ) — quando definida (>1), a
  // quantidade no carrinho nunca pode ficar abaixo deste valor.
  minSaleQty?: number | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "vrcf_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      if (!hasFunctionalConsent()) return [];
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      if (!hasFunctionalConsent()) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...item, quantity }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      const min = existing?.minSaleQty && existing.minSaleQty > 1 ? existing.minSaleQty : 1;
      if (quantity < min) {
        // Abaixo da quantidade mínima de venda: remove o item em vez de
        // deixar uma quantidade inconsistente com a embalagem do produto.
        return prev.filter((i) => i.id !== id);
      }
      return prev.map((i) => i.id === id ? { ...i, quantity } : i);
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
