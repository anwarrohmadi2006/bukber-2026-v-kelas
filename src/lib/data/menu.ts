// Menu Data and Types for Bukber Food Ordering App

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  requiresAyamPart?: boolean;
  requiresAyamSauce?: boolean;
  requiresKatsuSauce?: boolean;
  requiresSquash?: boolean;
  requiresSausMMB?: boolean;
  requiresLevel?: boolean;
  hasSizeVariant?: boolean;
}

export interface AddOn {
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  variants: {
    ayamPart?: string;
    ayamSauce?: string;
    katsuSauce?: string;
    squashFlavor?: string;
    sausMMB?: string;
    level?: number;
  };
  addons: { name: string; price: number }[];
  totalItemPrice: number;
}

export interface Order {
  id?: number;
  userName: string;
  userNIM?: string;
  studentNo?: number;
  items: CartItem[];
  subTotal: number;
  subsidyApplied: number;
  finalTotalToPay: number;
  paymentProofUrl?: string;
  paymentStatus?: 'pending' | 'approved';
  createdAt?: string;
}

export const SUBSIDY_AMOUNT = 30000;

export const BUKBER_VARIANTS = {
  ayamPart: ["Dada", "Paha Atas"],
  ayamSauce: ["Lava", "Buldak"],
  katsuSauce: ["Curry", "Lava"],
  squashFlavor: ["Mango", "Strawberry", "Nanas", "Lecy", "Fresh Lime"],
  sausMMB: ["Boomlava n Cheese", "Chili Oil Lava"],
  levels: [1, 2, 3]
};

export const MENU_DATA: Record<string, MenuItem[]> = {
  "Paket Spesial Bukber Ayam": [
    { id: "b_ayam1", name: "Paket Ayam Lava/Buldak A1 (Paha Bawah + Es Teh + Free Kurma)", price: 18000, requiresAyamSauce: true },
    { id: "b_ayam2", name: "Paket Ayam Lava/Buldak A2 (Dada/Paha Atas + Es Teh + Free Kurma & Kolak)", price: 22000, requiresAyamPart: true, requiresAyamSauce: true },
    { id: "b_ayam3", name: "Paket Ayam Lava/Buldak A3 (Dada/Paha Atas + Squash + Free Kurma & Kolak)", price: 25000, requiresAyamPart: true, requiresAyamSauce: true, requiresSquash: true }
  ],
  "Paket Spesial Bukber Katsu": [
    { id: "b_katsu1", name: "Paket Katsu A1 (Katsu + Es Teh + Free Kurma)", price: 17000, requiresKatsuSauce: true },
    { id: "b_katsu2", name: "Paket Katsu A2 (Katsu + Es Teh + Free Kurma & Kolak)", price: 20000, requiresKatsuSauce: true },
    { id: "b_katsu3", name: "Paket Katsu A3 (Katsu + Squash + Free Kurma & Kolak)", price: 23000, requiresKatsuSauce: true, requiresSquash: true }
  ],
  "Paket Ayam MMO": [
    { id: "mmo1", name: "MMO Sayap", price: 10000, hasSizeVariant: true },
    { id: "mmo2", name: "MMO Paha Atas", price: 13000, hasSizeVariant: true },
    { id: "mmo3", name: "MMO Paha Bawah", price: 11000, hasSizeVariant: true },
    { id: "mmo4", name: "MMO Dada", price: 13000, hasSizeVariant: true }
  ],
  "Ayam Original": [
    { id: "ori1", name: "Sayap Original", price: 8000 },
    { id: "ori2", name: "Paha Atas Original", price: 11000 },
    { id: "ori3", name: "Paha Bawah Original", price: 9000 },
    { id: "ori4", name: "Dada Original", price: 11000 },
    { id: "ori5", name: "Katsu Original", price: 8000 }
  ],
  "Paket Ayam MMB": [
    { id: "mmb1", name: "MMB Sayap", price: 12000, requiresSausMMB: true },
    { id: "mmb2", name: "MMB Paha Atas", price: 15000, requiresSausMMB: true },
    { id: "mmb3", name: "MMB Paha Bawah", price: 13000, requiresSausMMB: true },
    { id: "mmb4", name: "MMB Dada", price: 15000, requiresSausMMB: true },
    { id: "mmb5", name: "MMB Telur", price: 8000, requiresSausMMB: true }
  ],
  "Ayam Katsu Reguler": [
    { id: "katsu1", name: "MMB Katsu Curry", price: 12000 },
    { id: "katsu2", name: "MMB Katsu Boomlava", price: 12000 }
  ],
  "Mie Rewel (Goreng)": [
    { id: "mr1", name: "Mie Rewel Original", price: 10000, requiresLevel: true },
    { id: "mr2", name: "Mie Rewel Pangsit", price: 11000, requiresLevel: true },
    { id: "mr3", name: "Mie Rewel Bakso", price: 12000, requiresLevel: true },
    { id: "mr4", name: "Mie Rewel Dimsum", price: 13000, requiresLevel: true },
    { id: "mr5", name: "Mie Rewel Komplit", price: 15000, requiresLevel: true }
  ],
  "Mie Korsa (Kuah)": [
    { id: "mk1", name: "Mie Korsa Original", price: 12000, requiresLevel: true },
    { id: "mk2", name: "Mie Korsa Pangsit", price: 13000, requiresLevel: true },
    { id: "mk3", name: "Mie Korsa Bakso", price: 13000, requiresLevel: true },
    { id: "mk4", name: "Mie Korsa Sosis", price: 13000, requiresLevel: true },
    { id: "mk5", name: "Mie Korsa Komplit", price: 15000, requiresLevel: true }
  ],
  "Snack": [
    { id: "sn1", name: "Pangsit Chili Oil", price: 10000 },
    { id: "sn2", name: "Tahu Walik", price: 10000 },
    { id: "sn3", name: "French Fries", price: 8000 },
    { id: "sn4", name: "Nugget", price: 8000 },
    { id: "sn5", name: "Dimsum", price: 13000 },
    { id: "sn6", name: "Sosis", price: 6000 },
    { id: "sn7", name: "Mix Plate", price: 12000 },
    { id: "sn8", name: "Pisang Tenggelam", price: 10000 }
  ],
  "Minuman & Squash Reguler": [
    { id: "min1", name: "Sunny Sweet", price: 8000 },
    { id: "min2", name: "Milk Tea", price: 5000 },
    { id: "min3", name: "Chocolatos", price: 5000 },
    { id: "min4", name: "Goodday Cappucino", price: 5000 },
    { id: "min5", name: "Es Teh", price: 3000 },
    { id: "min6", name: "Es Jeruk", price: 4000 },
    { id: "min7", name: "Lemon Tea", price: 4000 },
    { id: "min8", name: "Lychee Tea", price: 6000 },
    { id: "min9", name: "Air Es", price: 1000 },
    { id: "min10", name: "Air Mineral", price: 3500 },
    { id: "sq1", name: "Lychee Squash", price: 8000 },
    { id: "sq2", name: "Fresh Lime Squash", price: 7000 }
  ]
};

export const ADD_ONS = {
  saus: [
    { name: "Ori Pedas & Tomat", price: 2000 },
    { name: "Boomlava", price: 2000 },
    { name: "Cheese", price: 2000 },
    { name: "Curry", price: 2000 }
  ] as AddOn[],
  topping: [
    { name: "Keju", price: 2000 },
    { name: "Ayam Katsu", price: 5000 },
    { name: "Pangsit Isi", price: 2000 },
    { name: "Dimsum", price: 3000 },
    { name: "Nasi", price: 3500 },
    { name: "Sosis", price: 2000 },
    { name: "Telur Mata Sapi", price: 4000 },
    { name: "Bakso", price: 2000 }
  ] as AddOn[]
};

// Helper to format currency
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Get bukber categories (first ones to show)
export function getBukberCategories(): string[] {
  return Object.keys(MENU_DATA).filter(cat => cat.includes("Paket Spesial Bukber"));
}

// Get regular categories
export function getRegularCategories(): string[] {
  return Object.keys(MENU_DATA).filter(cat => !cat.includes("Paket Spesial Bukber"));
}
