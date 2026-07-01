export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  costPrice: number;
  quantity: number;
  minAlert: number;
  image: string; // Base64 string or image URL
  description: string;
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
