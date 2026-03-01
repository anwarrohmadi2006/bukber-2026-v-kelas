import { writable, derived, get } from 'svelte/store';
import type { CartItem, Order } from '../data/menu';
import { SUBSIDY_AMOUNT } from '../data/menu';

function createCartStore() {
  const { subscribe, set, update } = writable<CartItem[]>([]);

  return {
    subscribe,
    addItem: (item: CartItem) => {
      update(items => [...items, item]);
    },
    removeItem: (itemId: string) => {
      update(items => items.filter(item => item.id !== itemId));
    },
    updateQuantity: (itemId: string, quantity: number) => {
      update(items =>
        items.map(item =>
          item.id === itemId
            ? { ...item, quantity, totalItemPrice: calculateItemTotal(item, quantity) }
            : item
        )
      );
    },
    clear: () => set([]),
    setItems: (items: CartItem[]) => set(items),
    getItems: () => get({ subscribe })
  };
}

function calculateItemTotal(item: CartItem, quantity: number): number {
  const addonTotal = item.addons.reduce((sum, addon) => sum + addon.price, 0);
  return (item.basePrice + addonTotal) * quantity;
}

export const cart = createCartStore();

// User identity stores
export const userName = writable<string>('');
export const userNIM = writable<string>('');
export const studentNo = writable<number>(0);
export const existingOrderId = writable<string | null>(null);

// Dynamic subsidy amount store — fetched from API, default from menu.ts
export const subsidyAmountStore = writable<number>(SUBSIDY_AMOUNT);

// Fetch subsidy from API
export async function fetchSubsidyAmount() {
  try {
    const response = await fetch('/api/settings');
    if (response.ok) {
      const data = await response.json();
      if (data.subsidyAmount !== undefined) {
        subsidyAmountStore.set(data.subsidyAmount);
      }
    }
  } catch (e) {
    console.error('Failed to fetch subsidy amount:', e);
  }
}

// Derived store for subtotal
export const subTotal = derived(cart, $cart =>
  $cart.reduce((sum, item) => sum + item.totalItemPrice, 0)
);

// Derived store for subsidy applied (uses dynamic subsidy)
export const subsidyApplied = derived(
  [subTotal, subsidyAmountStore],
  ([$subTotal, $subsidyAmount]) => Math.min($subTotal, $subsidyAmount)
);

/**
 * Derived store for final total to pay (uses dynamic subsidy)
 * Unique Payment Amount Logic:
 * If the user's total exceeds the subsidy, add the user's list number to the final amount.
 */
export const finalTotalToPay = derived(
  [subTotal, subsidyAmountStore, studentNo],
  ([$subTotal, $subsidyAmount, $studentNo]) => {
    const baseToPay = Math.max(0, $subTotal - $subsidyAmount);
    // If there is an amount to pay, add the student list number
    return baseToPay > 0 ? baseToPay + $studentNo : 0;
  }
);

// Derived store for item count
export const itemCount = derived(cart, $cart =>
  $cart.reduce((count, item) => count + item.quantity, 0)
);

// Generate order payload
export function generateOrderPayload(): Order {
  return {
    userName: get(userName),
    userNIM: get(userNIM),
    studentNo: get(studentNo),
    items: get(cart),
    subTotal: get(subTotal),
    subsidyApplied: get(subsidyApplied),
    finalTotalToPay: get(finalTotalToPay)
  };
}

// Reset all stores
export function resetOrder() {
  cart.clear();
  userName.set('');
  userNIM.set('');
  studentNo.set(0);
  existingOrderId.set(null);
}
