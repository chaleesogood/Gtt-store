export interface Product {
  id: string;
  name: string;
  sku: string; // Used as PART NUMBER & MODEL
  category: string;
  price: number; // Retail Price
  costPrice: number; // Cost price/Unit
  quantity: number;
  minAlert: number;
  image: string; // Base64 string or image URL
  description: string;
  brand?: string; // BRAND NAME e.g., SCHNEIDER
  unit?: string; // UNIT e.g., PCS
  supplier?: string; // SUPPLIER
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string; // Hex or tailwind class name
}

export interface StockActivity {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjust'; // stock in, stock out (sell), manual adjust
  quantityChange: number;
  oldQuantity: number;
  newQuantity: number;
  reason: string;
  timestamp: string;
}

export interface BomItem {
  productId: string;
  productName: string;
  quantity: number;
  unit?: string; // e.g. PCS
  remark?: string; // e.g. ขอราคาแล้ว
  brand?: string; // e.g. SCHNEIDER
  prNo?: string; // e.g. P.R-GTT2605-0794
  poNo?: string;
  priceUnit?: number; // Custom override or reference price
}

export interface Bom {
  id: string;
  name: string;
  description: string;
  items: BomItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  jobNo?: string; // หมายเลขใบสั่งงาน / Job Number
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  bomId: string;
  requiredQuantity: number; // multiplier of how many BOM sets we are building
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  stockDeducted?: boolean;
}
