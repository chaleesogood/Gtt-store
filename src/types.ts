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
  warehouse?: string; // WAREHOUSE LOCATION
  expiryDate?: string; // EXPIRY DATE (YYYY-MM-DD)
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
  group?: string; // e.g. ระบบโครงสร้าง, ระบบไฟฟ้า
}

export interface Bom {
  id: string;
  name: string;
  description: string;
  items: BomItem[];
  jobNo?: string; // หมายเลขใบสั่งงาน / Job Number
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'; // สถานะดำเนินการ
  requiredQuantity: number; // จำนวนชุดเครื่องจักรที่ผลิต/ประกอบ
  stockDeducted: boolean; // มีการตัดสต็อกวัตถุดิบประกอบแล้วหรือยัง
  completedAt?: string;
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

export interface ProductOrder {
  id: string;
  requesterName: string; // ชื่อผู้ขอสั่งซื้อ
  purchaserName?: string; // ชื่อผู้จัดซื้อ/ผู้ดำเนินการ
  orderTitle: string; // ชื่อสั่งซื้อ
  jobNo?: string; // เลขที่ Job / Job.No
  jobName?: string; // ชื่อ Job / Job.Name
  status: 'pending' | 'quotation' | 'ordered' | 'approved' | 'paid' | 'received' | 'cancelled'; // สถานะติดตามของ
  quantity: number; // จำนวนสั่งซื้อ
  unit?: string; // หน่วยนับ e.g. PCS, ม้วน, เมตร
  pricePerUnit?: number; // ราคาต่อหน่วย
  totalPrice?: number; // ราคารวม
  productId?: string; // สินค้าผูกมัดในคลัง (สำหรับรับเข้าคลังโดยอัตโนมัติ)
  productName?: string; // ชื่อสินค้าที่ผูกในคลัง
  prNo?: string; // เลขที่ใบขอซื้อ (PR No.)
  poNo?: string; // เลขที่ใบสั่งซื้อ (PO No.)
  supplier?: string; // ผู้จัดจำหน่าย/ซัพพลายเออร์ (Supplier)
  quotationNo?: string; // เลขที่ใบเสนอราคา (Quotation No.)
  approverName?: string; // ชื่อผู้อนุมัติ (Approver)
  paymentRef?: string; // ข้อมูลอ้างอิงการโอนเงิน/ชำระเงิน (Payment Ref)
  remark?: string; // หมายเหตุ
  createdAt: string; // เวลาเสนอสั่งซื้อ (Step 1: Pending / ขอซื้อ)
  quotationAt?: string; // Step 2: ขอใบเสนอราคา
  orderedAt?: string; // Step 3: เปิด PR/PO
  approvedAt?: string; // Step 4: อนุมัติ PR/PO
  paidAt?: string; // Step 5: โอนเงิน / ชำระเงิน
  shippingAt?: string; // สำหรับรองรับข้อมูลเก่า (ย้ายเป็นขั้นตอนโอนเงิน/ส่งของ)
  receivedAt?: string; // Step 6: ส่งของ / รับเข้าคลัง
  receivedQty?: number; // จำนวนที่รับของเข้า
  cancelledAt?: string; // เวลาที่ยกเลิกรายการ
}

