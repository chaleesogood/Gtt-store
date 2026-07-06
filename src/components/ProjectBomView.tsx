import React, { useState, useEffect } from 'react';
import { Product, Bom, BomItem, Project, ProductOrder, Category } from '../types';
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  FolderPlus, 
  Boxes, 
  Loader2, 
  Check, 
  AlertCircle, 
  Tag, 
  Filter,
  Copy,
  Play,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShoppingCart,
  Link as LinkIcon,
  FileText,
  ClipboardList,
  Eye,
  Truck
} from 'lucide-react';
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface ProjectBomViewProps {
  products: Product[];
  boms: Bom[];
  projects: Project[]; // Backward compatible with App.tsx, can ignore
  categories: Category[];
  addToast: (type: 'success' | 'warning' | 'info', title: string, message: string) => void;
}

interface InlineInputProps {
  value: string | number;
  type?: 'text' | 'number';
  className?: string;
  onSave: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function InlineInput({ value, type = 'text', className = '', onSave, placeholder = '', disabled = false }: InlineInputProps) {
  const [localVal, setLocalVal] = useState(value);

  React.useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleBlur = () => {
    if (localVal !== value && !disabled) {
      onSave(localVal.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type={type}
      value={localVal}
      placeholder={placeholder}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`w-full bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 border border-transparent hover:border-slate-200 focus:border-indigo-400 rounded px-1.5 py-0.5 text-[11px] font-sans text-slate-800 outline-hidden transition-all disabled:bg-transparent disabled:border-transparent disabled:text-slate-700 disabled:cursor-not-allowed ${className}`}
    />
  );
}

interface GroupedProductSelectProps {
  products: Product[];
  categories: Category[];
  selectedValue: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function GroupedProductSelect({ products, categories, selectedValue, onChange, placeholder = '-- ค้นหา/เลือกสินค้าวัตถุดิบ --' }: GroupedProductSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);

  const selectedProduct = products.find(p => p.id === selectedValue);
  const uniqueCategories = Array.from(new Set(products.map(p => p.category || 'ทั่วไป')));

  const toggleCategoryVisibility = (cat: string) => {
    setHiddenCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const filteredProducts = products.filter(p => {
    const cat = p.category || 'ทั่วไป';
    if (hiddenCategories.includes(cat)) return false;
    
    const term = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.brand && p.brand.toLowerCase().includes(term))
    );
  });

  return (
    <div className="relative font-sans" id="grouped-product-select-container">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2 px-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-sans text-left text-slate-700 font-bold flex items-center justify-between shadow-3xs cursor-pointer transition-all focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
      >
        <span className="truncate">
          {selectedProduct ? (
            `${selectedProduct.name} (SKU: ${selectedProduct.sku}) [คลัง: ${selectedProduct.quantity} ${selectedProduct.unit || 'ชิ้น'}]`
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-48" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-49 p-3 space-y-3 max-h-[380px] overflow-y-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="พิมพ์เพื่อค้นหาชื่อสินค้า, SKU, แบรนด์..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-800"
                autoFocus
              />
            </div>

            <div className="space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Filter className="h-3 w-3" />
                <span>กรองกลุ่มคลังสินค้า (เลือกโชว์/ซ่อนกลุ่มสินค้า)</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {uniqueCategories.map(cat => {
                  const isHidden = hiddenCategories.includes(cat);
                  const catObj = categories.find(c => c.id === cat);
                  const displayName = catObj ? catObj.name : (cat === 'ทั่วไป' ? 'ทั่วไป' : cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategoryVisibility(cat)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                        isHidden 
                          ? 'bg-slate-100 text-slate-400 border-slate-200/60 line-through' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      }`}
                    >
                      <span>{displayName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">ผลการค้นหา ({filteredProducts.length})</div>
              <div className="space-y-0.5 divide-y divide-slate-100 max-h-[180px] overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 text-xs italic font-sans">ไม่พบวัตถุดิบในสต็อก</div>
                ) : (
                  filteredProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onChange(p.id);
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-2 py-2 hover:bg-indigo-50/75 transition-all flex flex-col gap-0.5 cursor-pointer text-xs font-sans animate-fade-in"
                    >
                      <div className="font-extrabold text-slate-800 truncate flex items-center justify-between gap-2">
                        <span className="truncate">{p.name}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded shrink-0">
                          {categories.find(c => c.id === p.category)?.name || 'ทั่วไป'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                        <span>SKU: {p.sku || '-'} | แบรนด์: {p.brand || 'ทั่วไป'}</span>
                        <span className="text-indigo-600 font-extrabold">คงเหลือ: {p.quantity} {p.unit || 'ชิ้น'}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const getOrderBadgeStyle = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-amber-50 text-amber-750 border-amber-200/70 hover:bg-amber-100/60';
    case 'quotation': return 'bg-sky-50 text-sky-700 border-sky-200/70 hover:bg-sky-100/60';
    case 'ordered': return 'bg-purple-50 text-purple-700 border-purple-200/70 hover:bg-purple-100/60';
    case 'approved': return 'bg-indigo-50 text-indigo-700 border-indigo-200/70 hover:bg-indigo-100/60';
    case 'paid': return 'bg-teal-50 text-teal-700 border-teal-200/70 hover:bg-teal-100/60';
    case 'received': return 'bg-emerald-50 text-emerald-700 border-emerald-200/70 hover:bg-emerald-100/60';
    case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200/70 hover:bg-rose-100/60';
    default: return 'bg-slate-50 text-slate-700 border-slate-200/70 hover:bg-slate-100/60';
  }
};

const getOrderThaiLabel = (status: string) => {
  switch (status) {
    case 'pending': return 'รอจัดซื้อ (PR)';
    case 'quotation': return 'ใบเสนอราคา';
    case 'ordered': return 'สั่งซื้อ (PO)';
    case 'approved': return 'อนุมัติแล้ว';
    case 'paid': return 'จ่ายเงินแล้ว';
    case 'received': return 'รับของแล้ว';
    case 'cancelled': return 'ยกเลิก';
    default: return status;
  }
};

export default function ProjectBomView({ products, boms, categories, addToast }: ProjectBomViewProps) {
  // Main states
  const [selectedBom, setSelectedBom] = useState<Bom | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDeducting, setIsDeducting] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  // New BOM modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBomName, setNewBomName] = useState('');
  const [newBomJobNo, setNewBomJobNo] = useState('');
  const [newBomDescription, setNewBomDescription] = useState('');
  const [newBomRequiredQuantity, setNewBomRequiredQuantity] = useState<number>(1);

  // Edit BOM modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBomName, setEditBomName] = useState('');
  const [editBomJobNo, setEditBomJobNo] = useState('');
  const [editBomDescription, setEditBomDescription] = useState('');
  const [editBomRequiredQuantity, setEditBomRequiredQuantity] = useState<number>(1);
  const [editBomStatus, setEditBomStatus] = useState<Bom['status']>('pending');

  // Worksheet Item Adding states
  const [worksheetSelectedProductId, setWorksheetSelectedProductId] = useState('');
  const [worksheetAddQty, setWorksheetAddQty] = useState<number>(1);
  const [worksheetAddUnit, setWorksheetAddUnit] = useState('ชิ้น');
  const [worksheetAddBrand, setWorksheetAddBrand] = useState('');
  const [worksheetAddPrice, setWorksheetAddPrice] = useState<number>(0);
  const [worksheetAddRemark, setWorksheetAddRemark] = useState('');
  const [worksheetAddPrNo, setWorksheetAddPrNo] = useState('');
  const [worksheetAddPoNo, setWorksheetAddPoNo] = useState('');
  const [worksheetAddGroup, setWorksheetAddGroup] = useState('ทั่วไป');
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupNameInput, setNewGroupNameInput] = useState('');

  // Synchronized orders from Firestore
  const [orders, setOrders] = useState<ProductOrder[]>([]);

  // Real-time sync of orders
  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ProductOrder[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as ProductOrder);
      });
      setOrders(list);
    }, (error) => {
      console.error('Error syncing orders in ProjectBomView:', error);
    });
    return () => unsubscribe();
  }, []);

  // Quick Requisition Modal states
  const [isRequisitionModalOpen, setIsRequisitionModalOpen] = useState(false);
  const [reqItemIndex, setReqItemIndex] = useState<number | null>(null);
  const [reqQty, setReqQty] = useState<number>(1);
  const [reqPriceUnit, setReqPriceUnit] = useState<number>(0);
  const [reqRequester, setReqRequester] = useState<string>('');
  const [reqPrNo, setReqPrNo] = useState<string>('');
  const [reqRemark, setReqRemark] = useState<string>('');

  // Link Existing Order Modal states
  const [isLinkOrderModalOpen, setIsLinkOrderModalOpen] = useState(false);
  const [linkItemIndex, setLinkItemIndex] = useState<number | null>(null);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');

  // Viewing Order Details Modal states
  const [viewingOrder, setViewingOrder] = useState<ProductOrder | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [statusQuotationNo, setStatusQuotationNo] = useState('');
  const [statusSupplier, setStatusSupplier] = useState('');
  const [statusPrNo, setStatusPrNo] = useState('');
  const [statusPoNo, setStatusPoNo] = useState('');
  const [statusApproverName, setStatusApproverName] = useState('');
  const [statusPaymentRef, setStatusPaymentRef] = useState('');
  const [statusReceivedQty, setStatusReceivedQty] = useState<number>(0);

  useEffect(() => {
    if (!viewingOrder) {
      setEditingStatus(null);
    }
  }, [viewingOrder]);

  const trackerSteps = [
    { key: 'pending', label: 'เสนอขอซื้อ', desc: 'ออกเอกสารใบ PR' },
    { key: 'quotation', label: 'ใบเสนอราคา', desc: 'คัดเลือกผู้ขาย/ประเมินราคา' },
    { key: 'ordered', label: 'เปิดสั่งซื้อ', desc: 'ออกเอกสารสั่งซื้อ PO' },
    { key: 'approved', label: 'อนุมัติแล้ว', desc: 'ผ่านตรวจสอบทางการเงิน' },
    { key: 'paid', label: 'จ่ายเงินแล้ว', desc: 'ชำระหนี้การค้าสำเร็จ' },
    { key: 'received', label: 'รับพัสดุ', desc: 'ตรวจรับของเรียบร้อย' }
  ];

  // Trigger Quick Purchase Requisition form pre-population
  const handleOpenQuickRequisition = (originalIndex: number) => {
    if (!activeBom) return;
    const item = activeBom.items[originalIndex];
    const p = products.find(prod => prod.id === item.productId);
    const currentQtyInStock = p ? p.quantity : 0;
    const requiredTotal = item.quantity * (activeBom.requiredQuantity || 1);
    
    // Suggest the shortage amount, or if in-stock matches, suggest the full needed amount
    const shortage = requiredTotal - currentQtyInStock;
    const initialQty = shortage > 0 ? shortage : requiredTotal;
    const initialCost = item.priceUnit !== undefined ? item.priceUnit : (p?.costPrice || 0);
    
    setReqItemIndex(originalIndex);
    setReqQty(initialQty);
    setReqPriceUnit(initialCost);
    setReqRequester(localStorage.getItem('admin_email') || 'ฝ่ายวิศวกรรม/ประกอบ');
    setReqPrNo(`PR-${activeBom.jobNo || 'BOM'}-${Math.floor(1000 + Math.random() * 9000)}`);
    setReqRemark(`ขอจัดซื้อพัสดุสำหรับใบงานประกอบ BOM: ${activeBom.name} (หมายเลขใบสั่งงาน: ${activeBom.jobNo || 'ไม่ระบุ'})`);
    
    setIsRequisitionModalOpen(true);
  };

  // Submit Quick Purchase Requisition to Firestore
  const handleSubmitQuickRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBom || reqItemIndex === null) return;
    
    const item = activeBom.items[reqItemIndex];
    const matchedProduct = products.find(p => p.id === item.productId);
    const orderId = `order-${Math.random().toString(36).substring(2, 9)}`;
    
    const newOrder: any = {
      id: orderId,
      requesterName: reqRequester.trim() || 'ฝ่ายวิศวกรรม/ประกอบ',
      orderTitle: item.productName,
      status: 'pending',
      quantity: reqQty,
      unit: item.unit || 'ชิ้น',
      pricePerUnit: reqPriceUnit,
      totalPrice: reqPriceUnit * reqQty,
      productId: item.productId,
      productName: item.productName,
      jobNo: activeBom.jobNo || '',
      jobName: activeBom.name || '',
      prNo: reqPrNo.trim(),
      remark: reqRemark.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Create Purchase Request Document
      await setDoc(doc(db, 'orders', orderId), newOrder);
      
      // 2. Automatically Link newly created PR No to BOM item
      const updatedItems = [...activeBom.items];
      updatedItems[reqItemIndex] = {
        ...updatedItems[reqItemIndex],
        prNo: reqPrNo.trim()
      };
      
      await updateDoc(doc(db, 'boms', activeBom.id), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
      
      addToast('success', 'ส่งคำขอจัดซื้อสำเร็จ', `สร้างใบเสนอสั่งซื้อ "${item.productName}" และผูกกับ BOM เรียบร้อยแล้ว`);
      setIsRequisitionModalOpen(false);
    } catch (err: any) {
      addToast('warning', 'ผิดพลาด', 'ไม่สามารถบันทึกใบขอจัดซื้อได้: ' + err.message);
    }
  };

  const handleSaveStatusFromTracker = async () => {
    if (!viewingOrder || !editingStatus) return;

    try {
      const nowStr = new Date().toISOString();
      const updates: any = { status: editingStatus };

      if (editingStatus === 'pending') {
        updates.quotationAt = null;
        updates.orderedAt = null;
        updates.approvedAt = null;
        updates.paidAt = null;
        updates.receivedAt = null;
        updates.receivedQty = null;
        updates.cancelledAt = null;
      } else if (editingStatus === 'quotation') {
        updates.quotationAt = viewingOrder.quotationAt || nowStr;
        updates.quotationNo = statusQuotationNo.trim() || null;
        updates.supplier = statusSupplier.trim() || null;
        updates.orderedAt = null;
        updates.approvedAt = null;
        updates.paidAt = null;
        updates.receivedAt = null;
        updates.receivedQty = null;
        updates.cancelledAt = null;
      } else if (editingStatus === 'ordered') {
        updates.quotationAt = viewingOrder.quotationAt || nowStr;
        updates.orderedAt = viewingOrder.orderedAt || nowStr;
        updates.prNo = statusPrNo.trim() || null;
        updates.poNo = statusPoNo.trim() || null;
        if (statusSupplier.trim()) {
          updates.supplier = statusSupplier.trim();
        }
        updates.approvedAt = null;
        updates.paidAt = null;
        updates.receivedAt = null;
        updates.receivedQty = null;
        updates.cancelledAt = null;
      } else if (editingStatus === 'approved') {
        updates.quotationAt = viewingOrder.quotationAt || nowStr;
        updates.orderedAt = viewingOrder.orderedAt || nowStr;
        updates.approvedAt = viewingOrder.approvedAt || nowStr;
        updates.approverName = statusApproverName.trim() || null;
        updates.paidAt = null;
        updates.receivedAt = null;
        updates.receivedQty = null;
        updates.cancelledAt = null;
      } else if (editingStatus === 'paid') {
        updates.quotationAt = viewingOrder.quotationAt || nowStr;
        updates.orderedAt = viewingOrder.orderedAt || nowStr;
        updates.approvedAt = viewingOrder.approvedAt || nowStr;
        updates.paidAt = viewingOrder.paidAt || nowStr;
        updates.paymentRef = statusPaymentRef.trim() || null;
        updates.receivedAt = null;
        updates.receivedQty = null;
        updates.cancelledAt = null;
      } else if (editingStatus === 'received') {
        updates.quotationAt = viewingOrder.quotationAt || nowStr;
        updates.orderedAt = viewingOrder.orderedAt || nowStr;
        updates.approvedAt = viewingOrder.approvedAt || nowStr;
        updates.paidAt = viewingOrder.paidAt || nowStr;
        updates.receivedAt = viewingOrder.receivedAt || nowStr;
        updates.receivedQty = statusReceivedQty;
        updates.cancelledAt = null;

        if (viewingOrder.productId) {
          const currentProd = products.find(p => p.id === viewingOrder.productId);
          if (currentProd) {
            const prodRef = doc(db, 'products', viewingOrder.productId);
            const oldQty = currentProd.quantity || 0;
            const newQty = oldQty + statusReceivedQty;
            await updateDoc(prodRef, {
              quantity: newQty,
              updatedAt: nowStr
            });

            const actId = `act-${Math.random().toString(36).substring(2, 9)}`;
            const actRef = doc(db, 'activities', actId);
            await setDoc(actRef, {
              id: actId,
              productId: viewingOrder.productId,
              productName: currentProd.name,
              type: 'in',
              quantityChange: statusReceivedQty,
              oldQuantity: oldQty,
              newQuantity: newQty,
              reason: `นำเข้าพัสดุจากระบบติดตาม (ใบสั่งซื้อ: ${viewingOrder.id})`,
              createdAt: nowStr,
              creatorEmail: localStorage.getItem('admin_email') || 'system'
            });
          }
        }
      }

      const orderRef = doc(db, 'orders', viewingOrder.id);
      await updateDoc(orderRef, updates);

      setViewingOrder({
        ...viewingOrder,
        ...updates
      });

      setEditingStatus(null);
      addToast('success', 'อัปเดตสถานะสำเร็จ', `ปรับปรุงขั้นตอนการติดตามเรียบร้อย`);
    } catch (error) {
      console.error('Error updating order status from tracker:', error);
      addToast('warning', 'เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกการปรับปรุงสถานะได้');
    }
  };

  // Link an existing order to the BOM item
  const handleLinkOrderToItem = async (order: ProductOrder) => {
    if (!activeBom || linkItemIndex === null) return;
    
    const updatedItems = [...activeBom.items];
    updatedItems[linkItemIndex] = {
      ...updatedItems[linkItemIndex],
      prNo: order.prNo || '',
      poNo: order.poNo || ''
    };

    try {
      await updateDoc(doc(db, 'boms', activeBom.id), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
      addToast('success', 'เชื่อมโยงสำเร็จ', `ผูกพัสดุเข้ากับใบขอซื้อ/ใบสั่งซื้อ ${order.prNo || order.poNo || ''} เรียบร้อยแล้ว`);
      setIsLinkOrderModalOpen(false);
    } catch (err: any) {
      addToast('warning', 'ผิดพลาด', 'ไม่สามารถผูกข้อมูลได้: ' + err.message);
    }
  };

  // Auto-find currently active BOM representation
  const activeBom = selectedBom ? boms.find(b => b.id === selectedBom.id) || selectedBom : null;

  // Compute metrics for active BOM
  const getBomFinancials = (bom: Bom) => {
    let totalCost = 0;
    let totalRetail = 0;
    bom.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      const itemCost = item.priceUnit || (p ? p.costPrice : 0);
      const itemRetail = p ? p.price : 0;
      
      totalCost += itemCost * item.quantity;
      totalRetail += itemRetail * item.quantity;
    });
    const profit = totalRetail - totalCost;
    const margin = totalRetail > 0 ? (profit / totalRetail) * 105 : 0;
    return { totalCost, totalRetail, profit, margin };
  };

  // Get distinct group list
  const getBomGroups = (bom: Bom) => {
    const list = new Set<string>();
    bom.items.forEach(item => {
      if (item.group) list.add(item.group);
    });
    return Array.from(list).filter(g => g !== 'ทั่วไป');
  };

  const handleAddNewGroup = (groupName: string) => {
    if (!groupName.trim()) return;
    setWorksheetAddGroup(groupName.trim());
    setIsAddingGroup(false);
    addToast('info', 'ตั้งค่ากลุ่มสำเร็จ', `เลือกกลุ่มที่เพิ่มเป็น "${groupName.trim()}"`);
  };

  // Filter BOM document list
  const filteredBoms = boms.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (b.jobNo && b.jobNo.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Action: Create New BOM
  const handleCreateBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBomName.trim()) {
      addToast('warning', 'ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อใบงาน BOM');
      return;
    }

    const newId = `bom-${Math.random().toString(36).substring(2, 9)}`;
    const nowStr = new Date().toISOString();
    
    const newBom: Bom = {
      id: newId,
      name: newBomName.trim(),
      jobNo: newBomJobNo.trim(),
      description: newBomDescription.trim(),
      status: 'pending',
      requiredQuantity: newBomRequiredQuantity,
      stockDeducted: false,
      items: [],
      createdAt: nowStr,
      updatedAt: nowStr
    };

    try {
      await setDoc(doc(db, 'boms', newId), newBom);
      addToast('success', 'สร้างใบงาน BOM สำเร็จ', `สร้างใบงาน "${newBom.name}" เรียบร้อยแล้ว`);
      
      setNewBomName('');
      setNewBomJobNo('');
      setNewBomDescription('');
      setNewBomRequiredQuantity(1);
      setIsCreateModalOpen(false);
      setSelectedBom(newBom);
    } catch (err: any) {
      addToast('warning', 'เกิดข้อผิดพลาด', err.message);
    }
  };

  // Action: Edit Metadata
  const handleOpenEditModal = () => {
    if (!activeBom) return;
    setEditBomName(activeBom.name);
    setEditBomJobNo(activeBom.jobNo || '');
    setEditBomDescription(activeBom.description || '');
    setEditBomRequiredQuantity(activeBom.requiredQuantity || 1);
    setEditBomStatus(activeBom.status || 'pending');
    setIsEditModalOpen(true);
  };

  const handleUpdateBomDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBom) return;
    if (!editBomName.trim()) {
      addToast('warning', 'ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อใบงาน BOM');
      return;
    }

    const updates: Partial<Bom> = {
      name: editBomName.trim(),
      jobNo: editBomJobNo.trim(),
      description: editBomDescription.trim(),
      requiredQuantity: editBomRequiredQuantity,
      status: editBomStatus,
      updatedAt: new Date().toISOString()
    };

    if (editBomStatus === 'completed' && activeBom.status !== 'completed') {
      updates.completedAt = new Date().toISOString();
    }

    try {
      await updateDoc(doc(db, 'boms', activeBom.id), updates);
      addToast('success', 'ปรับปรุงใบงานสำเร็จ', `บันทึกการแก้ไขของ "${editBomName}" เรียบร้อย`);
      setIsEditModalOpen(false);
    } catch (err: any) {
      addToast('warning', 'เกิดข้อผิดพลาด', err.message);
    }
  };

  // Action: Delete BOM
  const handleDeleteBom = async (bom: Bom) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่ต้องการลบใบงาน BOM "${bom.name}"? ชิ้นส่วนที่อยู่ด้านในทั้งหมดจะถูกลบไปด้วย และรายการนี้ไม่สามารถกู้คืนได้!`)) return;
    
    try {
      await deleteDoc(doc(db, 'boms', bom.id));
      addToast('info', 'ลบใบงานสำเร็จ', `ลบใบงาน BOM "${bom.name}" เรียบร้อยแล้ว`);
      setSelectedBom(null);
    } catch (err: any) {
      addToast('warning', 'ลบผิดพลาด', err.message);
    }
  };

  // Action: Copy BOM (Duplicate)
  const handleCopyBom = async (bom: Bom) => {
    if (!confirm(`คุณยืนยันที่จะทำสำเนา (Copy Duplicate) โครงสร้างใบงาน BOM "${bom.name}" หรือไม่? ชิ้นส่วนพัสดุ ${bom.items.length} รายการทั้งหมดจะถูกคัดลอกด้วย โดยใบงานใหม่จะมีสถานะเริ่มต้นเป็น รอดำเนินการ (Pending) เสมอ`)) return;

    try {
      const newId = `bom-${Math.random().toString(36).substring(2, 9)}`;
      const nowStr = new Date().toISOString();
      
      const duplicatedBom: Bom = {
        id: newId,
        name: `[สำเนา] ${bom.name}`,
        jobNo: bom.jobNo ? `${bom.jobNo}-COPY` : '',
        description: bom.description || `ทำสำเนาจาก ${bom.name}`,
        status: 'pending',
        requiredQuantity: bom.requiredQuantity || 1,
        stockDeducted: false,
        items: bom.items.map(item => ({ ...item })), // deep copy items
        createdAt: nowStr,
        updatedAt: nowStr
      };

      await setDoc(doc(db, 'boms', newId), duplicatedBom);
      addToast('success', 'ทำสำเนา BOM สำเร็จ', `สร้างสำเนาใบงานใหม่ในชื่อ "${duplicatedBom.name}" สำเร็จเรียบร้อย`);
      setSelectedBom(duplicatedBom);
    } catch (err: any) {
      addToast('warning', 'ทำสำเนาล้มเหลว', err.message);
    }
  };

  // Action: Add Item to BOM spreadsheet
  const handleAddItemToBom = async () => {
    if (!activeBom) return;
    if (!worksheetSelectedProductId) {
      addToast('warning', 'ไม่ได้เลือกพัสดุ', 'กรุณาค้นหาหรือเลือกพัสดุวัตถุดิบก่อน');
      return;
    }

    const matchedProduct = products.find(p => p.id === worksheetSelectedProductId);
    if (!matchedProduct) return;

    const newItem: BomItem = {
      productId: worksheetSelectedProductId,
      productName: matchedProduct.name,
      quantity: worksheetAddQty,
      unit: worksheetAddUnit.trim() || matchedProduct.unit || 'ชิ้น',
      brand: worksheetAddBrand.trim() || matchedProduct.brand || 'ทั่วไป',
      priceUnit: worksheetAddPrice || matchedProduct.costPrice || 0,
      remark: worksheetAddRemark.trim(),
      prNo: worksheetAddPrNo.trim(),
      poNo: worksheetAddPoNo.trim(),
      group: worksheetAddGroup || 'ทั่วไป'
    };

    const updatedItems = [...activeBom.items, newItem];

    try {
      await updateDoc(doc(db, 'boms', activeBom.id), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });

      addToast('success', 'เพิ่มชิ้นส่วนสำเร็จ', `เพิ่ม "${matchedProduct.name}" เข้ากลุ่ม "${newItem.group}" เรียบร้อยแล้ว`);
      
      // Reset addition form states
      setWorksheetSelectedProductId('');
      setWorksheetAddQty(1);
      setWorksheetAddBrand('');
      setWorksheetAddPrice(0);
      setWorksheetAddUnit('ชิ้น');
      setWorksheetAddRemark('');
      setWorksheetAddPrNo('');
      setWorksheetAddPoNo('');
    } catch (err: any) {
      addToast('warning', 'บันทึกรายการล้มเหลว', err.message);
    }
  };

  // Action: Select Product inside add item to load standard fields
  const handleSelectWorksheetProduct = (prodId: string) => {
    setWorksheetSelectedProductId(prodId);
    const p = products.find(prod => prod.id === prodId);
    if (p) {
      setWorksheetAddUnit(p.unit || 'ชิ้น');
      setWorksheetAddBrand(p.brand || 'ทั่วไป');
      setWorksheetAddPrice(p.costPrice || 0);
    }
  };

  // Action: Inline Update cell
  const handleUpdateItemField = async (itemIndex: number, field: keyof BomItem, value: any) => {
    if (!activeBom) return;
    const updatedItems = [...activeBom.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      [field]: value
    };

    try {
      await updateDoc(doc(db, 'boms', activeBom.id), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      addToast('warning', 'ผิดพลาด', 'ไม่สามารถบันทึกการอัปเดตชิ้นส่วนได้: ' + err.message);
    }
  };

  // Action: Delete Item inside spreadsheet
  const handleDeleteItem = async (itemIndex: number) => {
    if (!activeBom) return;
    const item = activeBom.items[itemIndex];
    if (!confirm(`คุณแน่ใจที่จะลบชิ้นส่วน "${item.productName}" ออกจากใบงาน BOM นี้หรือไม่?`)) return;

    const updatedItems = activeBom.items.filter((_, idx) => idx !== itemIndex);

    try {
      await updateDoc(doc(db, 'boms', activeBom.id), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
      addToast('info', 'ลบรายการสำเร็จ', 'ลบชิ้นส่วนประกอบออกจากใบงานเรียบร้อย');
    } catch (err: any) {
      addToast('warning', 'ลบรายการผิดพลาด', err.message);
    }
  };

  // Action: Stock Deduction
  const handleDeductBomStock = async (bom: Bom) => {
    if (bom.items.length === 0) {
      addToast('warning', 'ไม่สามารถตัดสต็อกได้', 'ใบงาน BOM นี้ไม่มีรายการชิ้นส่วนประกอบอยู่ภายใน');
      return;
    }

    // 1. Audit stock availability first
    const shortfalls: { productName: string; needed: number; available: number }[] = [];
    bom.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      const needed = item.quantity * bom.requiredQuantity;
      const available = p ? p.quantity : 0;
      if (available < needed) {
        shortfalls.push({
          productName: item.productName || p?.name || 'สินค้า',
          needed,
          available
        });
      }
    });

    const executeDeduction = async () => {
      setIsDeducting(true);
      try {
        const batch = writeBatch(db);
        
        // Update each product's stock quantity and write an activity log
        for (const item of bom.items) {
          const prodRef = doc(db, 'products', item.productId);
          const currentProd = products.find(p => p.id === item.productId);
          
          const deductQty = item.quantity * bom.requiredQuantity;
          const oldQty = currentProd ? currentProd.quantity : 0;
          const newQty = oldQty - deductQty;

          // Update product quantity
          batch.update(prodRef, {
            quantity: newQty,
            updatedAt: new Date().toISOString()
          });

          // Add Stock activity
          const actId = `act-${Math.random().toString(36).substring(2, 9)}`;
          const actRef = doc(db, 'activities', actId);
          batch.set(actRef, {
            id: actId,
            productId: item.productId,
            productName: item.productName || currentProd?.name || 'สินค้า',
            type: 'out',
            quantityChange: -deductQty,
            oldQuantity: oldQty,
            newQuantity: newQty,
            reason: `เบิกตัดยอดประกอบใช้ในใบงาน BOM: ${bom.name} (Job: ${bom.jobNo || 'ไม่ระบุ'})`,
            timestamp: new Date().toISOString()
          });
        }

        // Mark BOM stockDeducted as true and status as in_progress
        const bomRef = doc(db, 'boms', bom.id);
        batch.update(bomRef, {
          stockDeducted: true,
          status: 'in_progress', // auto set to in_progress upon stock deduction
          updatedAt: new Date().toISOString()
        });

        await batch.commit();
        addToast('success', 'เบิกสต็อกสินค้าประกอบสำเร็จ', `หักสต็อกวัตถุดิบ ${bom.items.length} รายการสำหรับ BOM "${bom.name}" เรียบร้อยแล้ว`);
      } catch (err: any) {
        addToast('warning', 'เกิดข้อผิดพลาดในการตัดสต็อก', err.message);
      } finally {
        setIsDeducting(false);
      }
    };

    if (shortfalls.length > 0) {
      const msg = shortfalls.map(s => `- ${s.productName}: ต้องการ ${s.needed} ชิ้น (ในคลังมี ${s.available} ชิ้น)`).join('\n');
      if (confirm(`⚠️ แจ้งเตือน: สต็อกสินค้าไม่พอสำหรับเบิกประกอบรายการดังต่อไปนี้:\n${msg}\n\nคุณยังคงต้องการดำเนินการเบิกประกอบและยอมให้สต็อกติดลบหรือไม่?`)) {
        await executeDeduction();
      }
    } else {
      if (confirm(`คุณต้องการยืนยัน "เบิกสต็อกวัตถุดิบจริง" จำนวน ${bom.requiredQuantity} ชุดสำหรับ BOM "${bom.name}" หรือไม่? การทำรายการนี้จะหักจำนวนสต็อกวัตถุดิบจริงทันที`)) {
        await executeDeduction();
      }
    }
  };

  const getStatusBadgeClass = (status?: Bom['status']) => {
    switch (status) {
      case 'in_progress': return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'pending':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusThaiLabel = (status?: Bom['status']) => {
    switch (status) {
      case 'in_progress': return 'กำลังประกอบ (In Progress)';
      case 'completed': return 'ผลิตสำเร็จ (Completed)';
      case 'cancelled': return 'ยกเลิก (Cancelled)';
      case 'pending':
      default:
        return 'รอดำเนินการ (Pending)';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-left min-h-screen">
      {/* Title Header Workspace */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div className="space-y-0.5">
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
            <Boxes className="h-5.5 w-5.5 text-indigo-600" />
            <span>สูตรชิ้นส่วนประกอบ (BOM & Assembly)</span>
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            ระบุโครงสร้างวัสดุประกอบ ผลิตสินค้า ติดตามสถานะสต็อกคงคลัง และดำเนินการขอจัดซื้อพัสดุขาดแคลน
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-3xs"
        >
          <FolderPlus className="h-4 w-4" />
          <span>สร้างสูตร BOM ใหม่</span>
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: BOM list */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-3xs space-y-3">
            <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-slate-500" />
              <span>รายการใบงานทั้งหมด ({filteredBoms.length})</span>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่องาน, Job No..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-800"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-700 font-bold focus:outline-hidden"
              >
                <option value="all">แสดงสถานะทั้งหมด (All)</option>
                <option value="pending">Pending (รอดำเนินการ)</option>
                <option value="in_progress">In Progress (กำลังประกอบ)</option>
                <option value="completed">Completed (ผลิตสำเร็จ)</option>
                <option value="cancelled">Cancelled (ยกเลิก)</option>
              </select>
            </div>

            {/* BOM items stack */}
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {filteredBoms.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic font-sans border-2 border-dashed border-slate-100 rounded-2xl">
                  ไม่พบรายการใบงาน BOM
                </div>
              ) : (
                filteredBoms.map(bom => {
                  const isActive = activeBom?.id === bom.id;
                  const financials = getBomFinancials(bom);
                  
                  return (
                    <button
                      key={bom.id}
                      onClick={() => setSelectedBom(bom)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isActive 
                          ? 'bg-indigo-50/70 border-indigo-200 shadow-3xs ring-2 ring-indigo-500/5' 
                          : 'bg-white border-slate-150 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 tracking-wider">
                          {bom.jobNo || 'NO JOB'}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border font-sans ${getStatusBadgeClass(bom.status)}`}>
                            {getStatusThaiLabel(bom.status).split(' ')[0]}
                          </span>
                          {bom.stockDeducted && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                              เบิกแล้ว
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <div className="font-extrabold text-xs text-slate-800 line-clamp-1">{bom.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold truncate">{bom.description || 'ไม่มีคำอธิบาย'}</div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-sans border-t border-slate-100/60 pt-2 mt-1">
                        <div>
                          ชิ้นส่วน: <span className="font-extrabold text-slate-700">{bom.items.length} รายการ</span>
                        </div>
                        <div className="font-mono font-black text-indigo-700">
                          ฿{(financials.totalCost * (bom.requiredQuantity || 1)).toLocaleString('th-TH')}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right column: Worksheet Detail panel */}
        <div className="lg:col-span-8">
          {!activeBom ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center space-y-4 h-[650px] animate-in fade-in duration-300">
              <div className="p-4 rounded-full bg-slate-100 text-slate-400">
                <FileSpreadsheet className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-slate-700 font-sans">จัดการใบงานชิ้นส่วนผลิต</h3>
                <p className="text-xs text-slate-400 max-w-xs font-sans">
                  กรุณาคลิกเลือกใบงาน BOM จากแถบด้านซ้าย เพื่อเข้าสู่พื้นที่ทำงานออกแบบพัสดุ คัดลอก หรือเบิกสต็อกประกอบสินค้า
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              
              {/* Active BOM Card Actions */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs space-y-4">
                
                {/* Header Title with quick actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 tracking-wider">
                        {activeBom.jobNo || 'NO JOB'}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border font-sans ${getStatusBadgeClass(activeBom.status)}`}>
                        {getStatusThaiLabel(activeBom.status)}
                      </span>
                      {activeBom.stockDeducted && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                          เบิกสต็อกพัสดุแล้ว
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm font-bold text-slate-800 font-sans">{activeBom.name}</h2>
                  </div>

                  {/* Top Action buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={handleOpenEditModal}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                      title="แก้ไขข้อมูลใบงาน"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleCopyBom(activeBom)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-100 cursor-pointer font-bold text-[10px]"
                      title="ทำสำเนารายการสูตร BOM นี้"
                    >
                      <Copy className="h-3 w-3" />
                      <span>คัดลอก BOM</span>
                    </button>
                    {!activeBom.stockDeducted ? (
                      <button
                        onClick={() => handleDeductBomStock(activeBom)}
                        disabled={isDeducting}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-[10px] font-bold cursor-pointer shadow-3xs"
                        title="คลิกเพื่อเบิกพัสดุในระบบตามใบงานผลิตจริง"
                      >
                        {isDeducting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        <span>เบิกวัตถุดิบประกอบ</span>
                      </button>
                    ) : (
                      <div className="px-2 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span>เบิกสต็อกเสร็จสิ้น</span>
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteBom(activeBom)}
                      className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                      title="ลบใบงานประกอบนี้"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub Metadata description */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
                  <div className="md:col-span-3 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">รายละเอียด:</span>
                    <div className="text-slate-500 bg-slate-50 rounded-xl p-2.5 border border-slate-100 font-sans text-[11px] leading-relaxed">
                      {activeBom.description || 'ไม่มีคำอธิบายเพิ่มเติมเกี่ยวกับใบงานประกอบนี้'}
                    </div>
                  </div>

                  {/* Multiplier / Required Quantity controller */}
                  <div className="space-y-1 bg-slate-50/50 p-2.5 border border-slate-100 rounded-xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">จำนวนชุดผลิต:</span>
                    <div className="flex items-center justify-between gap-1 mt-1">
                      <input
                        type="number"
                        min={1}
                        value={activeBom.requiredQuantity || 1}
                        onChange={async (e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          await updateDoc(doc(db, 'boms', activeBom.id), { requiredQuantity: val });
                        }}
                        className="w-full text-center font-bold text-xs text-indigo-700 bg-white border border-slate-200 rounded-lg py-1 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="text-[10px] font-bold text-slate-500 shrink-0 px-1">ชุด</span>
                    </div>
                  </div>
                </div>

                {/* Statistics Bento Row */}
                {(() => {
                  const fin = getBomFinancials(activeBom);
                  const multiplier = activeBom.requiredQuantity || 1;
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                      <div className="bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl text-left">
                        <div className="text-[9px] font-bold uppercase text-slate-400">พัสดุทั้งหมด</div>
                        <div className="text-xs font-bold text-slate-700 mt-0.5">{activeBom.items.length} รายการ</div>
                      </div>
                      <div className="bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl text-left">
                        <div className="text-[9px] font-bold uppercase text-slate-400">ต้นทุนต่อชุด</div>
                        <div className="text-xs font-bold text-indigo-900 mt-0.5">฿{fin.totalCost.toLocaleString('th-TH')}</div>
                      </div>
                      <div className="bg-indigo-50/30 border border-indigo-100/50 p-2.5 rounded-xl text-left">
                        <div className="text-[9px] font-bold uppercase text-indigo-600">ต้นทุนสุทธิ ({multiplier} ชุด)</div>
                        <div className="text-xs font-bold text-indigo-950 mt-0.5">฿{(fin.totalCost * multiplier).toLocaleString('th-TH')}</div>
                      </div>
                      <div className="bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl text-left">
                        <div className="text-[9px] font-bold uppercase text-slate-400">ราคากลางรวม ({multiplier} ชุด)</div>
                        <div className="text-xs font-bold text-emerald-800 mt-0.5">฿{(fin.totalRetail * multiplier).toLocaleString('th-TH')}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Purchasing & Procurement Integration Dashboard Banner */}
                {(() => {
                  const shortItemsList = activeBom.items.filter(item => {
                    const p = products.find(prod => prod.id === item.productId);
                    const currentQtyInStock = p ? p.quantity : 0;
                    const requiredTotal = item.quantity * (activeBom.requiredQuantity || 1);
                    return currentQtyInStock < requiredTotal;
                  });

                  const linkedShortCount = shortItemsList.filter(item => {
                    const hasMatchedOrder = orders.some(o => 
                      (item.prNo && o.prNo === item.prNo) || 
                      (item.poNo && o.poNo === item.poNo) ||
                      (o.productId === item.productId && activeBom.jobNo && o.jobNo === activeBom.jobNo)
                    );
                    return hasMatchedOrder || item.prNo || item.poNo;
                  }).length;

                  const unlinkedShortCount = shortItemsList.length - linkedShortCount;

                  if (shortItemsList.length === 0) {
                    return (
                      <div className="bg-emerald-50/60 border border-emerald-150 rounded-2xl p-3.5 flex items-center gap-3 text-emerald-800 text-[11px] font-sans">
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                        <div>
                          <strong className="font-extrabold block">คลังสินค้าพร้อมประกอบครบถ้วน!</strong>
                          <span>รายการพัสดุประกอบทั้งหมดในใบงาน BOM นี้ มีจำนวนสต็อกสินค้าคงเหลือเพียงพอต่อความต้องการประกอบ ({activeBom.requiredQuantity || 1} ชุด)</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 space-y-3">
                      <div className="flex items-start gap-2.5 text-[11px] text-amber-900 font-sans">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <strong className="font-black text-xs text-amber-950 block">พัสดุไม่เพียงพอต่อการประกอบร่วม {shortItemsList.length} รายการ</strong>
                          <p>
                            ระบบตรวจพบว่ามีวัสดุอุปกรณ์ที่ <span className="font-black text-rose-600">สต็อกขาดแคลน</span> สำหรับใบงานประกอบนี้ โปรดประสานงานดำเนินการเปิดใบขอซื้อหรือผูกข้อมูลติดตามพัสดุ
                          </p>
                        </div>
                      </div>

                      {/* Procurement progress meter */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-sans">
                        <div className="bg-white border border-slate-100 px-3 py-2 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 block">ขาดแคลนสุทธิ</span>
                            <span className="text-sm font-black text-slate-800">{shortItemsList.length} รายการ</span>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-black">Out of Stock</span>
                        </div>

                        <div className="bg-white border border-slate-100 px-3 py-2 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 block">เปิดขอจัดซื้อแล้ว (Linked)</span>
                            <span className="text-sm font-black text-indigo-700">{linkedShortCount} รายการ</span>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-black">PR / PO Active</span>
                        </div>

                        <div className="bg-white border border-slate-100 px-3 py-2 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 block">ยังไม่ได้ขอซื้อ (Unlinked)</span>
                            <span className="text-sm font-black text-amber-700">{unlinkedShortCount} รายการ</span>
                          </div>
                          {unlinkedShortCount > 0 ? (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-black">Action Required</span>
                          ) : (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-black">Complete</span>
                          )}
                        </div>
                      </div>

                      {/* Proactive helper suggestion */}
                      {unlinkedShortCount > 0 && (
                        <div className="text-[10px] text-amber-800 bg-white/40 rounded-xl px-3 py-1.5 border border-dashed border-amber-200/60 font-medium">
                          💡 <strong className="font-extrabold">คำแนะนำ:</strong> คุณสามารถกดปุ่ม <span className="font-extrabold text-amber-600">"ดำเนินการขอจัดซื้อ"</span> หรือ <span className="font-extrabold text-indigo-600">"ผูกใบสั่งซื้อ"</span> ที่บรรทัดชิ้นส่วนด้านล่าง เพื่อสั่งซื้อพัสดุเข้าใบงานประกอบได้อย่างรวดเร็ว!
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>

              {/* Collapsible Add Item config bar & form */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(!isAddFormOpen)}
                  className="w-full flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3.5 hover:bg-slate-100/60 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
                      <Plus className={`h-4 w-4 transition-transform duration-200 ${isAddFormOpen ? 'rotate-45' : ''}`} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">เพิ่มวัสดุ/อุปกรณ์ประกอบ (Add BOM Component)</span>
                      <p className="text-[10px] text-slate-400 font-sans">เพิ่มพัสดุ กำหนดราคาทุนแบรนด์ เลข PR/PO ลงในใบงานประกอบนี้</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-white border border-slate-200 px-2 py-1 rounded-md shrink-0">
                    {isAddFormOpen ? 'ปิดฟอร์มเพิ่มสินค้า' : 'เปิดฟอร์มเพิ่มสินค้า'}
                  </span>
                </button>

                {isAddFormOpen && (
                  <div className="bg-white border border-slate-100 rounded-xl p-4.5 space-y-4 shadow-3xs text-left animate-in slide-in-from-top-2 duration-150">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        รายละเอียดวัสดุที่ต้องการบรรจุเพิ่ม
                      </span>

                      {/* Add New Group Button */}
                      {isAddingGroup ? (
                        <div className="flex items-center gap-1.5 animate-in slide-in-from-right-2 duration-155">
                          <input
                            type="text"
                            value={newGroupNameInput}
                            onChange={(e) => setNewGroupNameInput(e.target.value)}
                            placeholder="เช่น PLC, สายไฟ..."
                            className="px-2.5 py-1 bg-slate-50 border border-indigo-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden w-40 font-sans"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddNewGroup(newGroupNameInput);
                                setNewGroupNameInput('');
                              } else if (e.key === 'Escape') {
                                setIsAddingGroup(false);
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              handleAddNewGroup(newGroupNameInput);
                              setNewGroupNameInput('');
                            }}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            บันทึก
                          </button>
                          <button
                            onClick={() => setIsAddingGroup(false)}
                            className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-500 rounded-lg cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsAddingGroup(true)}
                          className="flex items-center gap-1 px-2.5 py-1 text-indigo-700 hover:bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        >
                          <FolderPlus className="h-3.5 w-3.5" />
                          <span>+ เพิ่มหมวดหมู่กลุ่มใหม่</span>
                        </button>
                      )}
                    </div>

                    {/* Detail Form Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs font-sans">
                      
                      {/* Select Product */}
                      <div className="sm:col-span-2 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block">1. เลือกพัสดุในคลังวัตถุดิบ:</span>
                        <GroupedProductSelect
                          products={products}
                          categories={categories}
                          selectedValue={worksheetSelectedProductId}
                          onChange={handleSelectWorksheetProduct}
                          placeholder="-- ค้นหาหรือเลือกวัตถุดิบในสต็อก --"
                        />
                      </div>

                      {/* Group Select */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block">2. จัดกลุ่มในสูตร BOM:</span>
                        <select
                          value={worksheetAddGroup}
                          onChange={(e) => setWorksheetAddGroup(e.target.value)}
                          className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-700 font-bold focus:outline-hidden"
                        >
                          <option value="ทั่วไป">ทั่วไป (General)</option>
                          {getBomGroups(activeBom).map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      {/* Details row */}
                      <div className="sm:col-span-3 grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block">จำนวนต่อชุด:</span>
                          <input
                            type="number"
                            min={1}
                            value={worksheetAddQty}
                            onChange={(e) => setWorksheetAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block">หน่วยนับ:</span>
                          <input
                            type="text"
                            value={worksheetAddUnit}
                            onChange={(e) => setWorksheetAddUnit(e.target.value)}
                            className="w-full py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden font-sans"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block">แบรนด์สินค้า:</span>
                          <input
                            type="text"
                            value={worksheetAddBrand}
                            onChange={(e) => setWorksheetAddBrand(e.target.value)}
                            className="w-full py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden font-sans"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block">ราคาทุน (฿):</span>
                          <input
                            type="number"
                            value={worksheetAddPrice || ''}
                            onChange={(e) => setWorksheetAddPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden font-sans"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block">หมายเหตุชิ้นส่วน:</span>
                          <input
                            type="text"
                            value={worksheetAddRemark}
                            onChange={(e) => setWorksheetAddRemark(e.target.value)}
                            placeholder="ระบุเพิ่มเติม..."
                            className="w-full py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden font-sans"
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <span className="text-[10px] text-slate-400 font-bold block">เลขที่ใบขอซื้อ (PR No.):</span>
                          <input
                            type="text"
                            value={worksheetAddPrNo}
                            onChange={(e) => setWorksheetAddPrNo(e.target.value)}
                            placeholder="เช่น PR-2026-0045"
                            className="w-full py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden font-sans"
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <span className="text-[10px] text-slate-400 font-bold block">เลขที่ใบสั่งซื้อ (PO No.):</span>
                          <input
                            type="text"
                            value={worksheetAddPoNo}
                            onChange={(e) => setWorksheetAddPoNo(e.target.value)}
                            placeholder="เช่น PO-2026-0112"
                            className="w-full py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden font-sans"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={handleAddItemToBom}
                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-3xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>เพิ่มพัสดุ</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>

              {/* Spreadsheet Interactive Table card */}
              <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-3xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileSpreadsheet className="h-4.5 w-4.5 text-indigo-600" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    ตารางรายละเอียดชิ้นส่วนพัสดุประกอบจริง (Worksheet Spreadsheet)
                  </span>
                </div>

                {activeBom.items.length === 0 ? (
                  <div className="p-16 border-2 border-dashed border-slate-150 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-center space-y-2">
                    <Boxes className="h-8 w-8 text-slate-300" />
                    <p className="text-xs font-bold font-sans">ยังไม่มีรายการวัตถุดิบประกอบ</p>
                    <p className="text-[11px] font-sans">ค้นหาพัสดุจากแบบฟอร์มด้านบนเพื่อเพิ่มรายการวัตถุดิบประกอบใช้</p>
                  </div>
                ) : (
                  (() => {
                    // Group items for rendering
                    const itemsByGroup: { [grp: string]: { originalIndex: number; item: BomItem }[] } = {};
                    activeBom.items.forEach((item, originalIndex) => {
                      const grpName = item.group || 'ทั่วไป';
                      if (!itemsByGroup[grpName]) {
                        itemsByGroup[grpName] = [];
                      }
                      itemsByGroup[grpName].push({ originalIndex, item });
                    });

                    const groups = Object.keys(itemsByGroup).sort((a, b) => {
                      if (a === 'ทั่วไป') return 1;
                      if (b === 'ทั่วไป') return -1;
                      return a.localeCompare(b);
                    });

                    return (
                      <div className="space-y-6">
                        {groups.map(grp => {
                          const list = itemsByGroup[grp];
                          return (
                            <div key={grp} className="space-y-2 border border-slate-150 rounded-2xl overflow-hidden bg-slate-50/50 p-3">
                              <div className="flex items-center gap-1 text-xs font-extrabold text-indigo-950 font-sans border-b border-slate-100 pb-2 mb-2">
                                <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm mr-1 uppercase">GROUP</span>
                                <span>{grp}</span>
                                <span className="text-slate-400 font-bold font-mono ml-1">({list.length} รายการ)</span>
                              </div>

                              {/* Custom responsive table */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px] font-sans whitespace-nowrap min-w-[800px]">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-slate-400 font-black text-[9px] uppercase tracking-wider">
                                      <th className="py-2 px-1 text-center w-28">ติดตามสินค้า</th>
                                      <th className="py-2 px-1">รูปภาพ & ชื่อพัสดุ / SKU</th>
                                      <th className="py-2 px-1 text-center w-20">จำนวน/ชุด</th>
                                      <th className="py-2 px-1 text-center w-20">ใช้จริง ({(activeBom.requiredQuantity || 1)} ชุด)</th>
                                      <th className="py-2 px-1 text-center w-24">หน่วย</th>
                                      <th className="py-2 px-1 text-center w-24">ราคาทุน (฿)</th>
                                      <th className="py-2 px-1 text-center w-28">ยอดรวมประเมิน</th>
                                      <th className="py-2 px-1 text-center w-28">PR No.</th>
                                      <th className="py-2 px-1 text-center w-28">PO No.</th>
                                      <th className="py-2 px-1 text-center w-24">แบรนด์</th>
                                      <th className="py-2 px-1 text-center w-24">ย้ายกลุ่ม</th>
                                      <th className="py-2 px-1 text-center w-12"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-150 bg-white">
                                    {list.map(({ originalIndex, item }) => {
                                      const p = products.find(prod => prod.id === item.productId);
                                      const currentQtyInStock = p ? p.quantity : 0;
                                      const requiredTotal = item.quantity * (activeBom.requiredQuantity || 1);
                                      const itemCost = item.priceUnit !== undefined ? item.priceUnit : (p?.costPrice || 0);
                                      const costTotal = itemCost * item.quantity * (activeBom.requiredQuantity || 1);
                                      
                                      // Link BOM item back to synchronized orders
                                      const matchedOrders = orders.filter(o => 
                                        (item.prNo && o.prNo === item.prNo) || 
                                        (item.poNo && o.poNo === item.poNo) ||
                                        (o.productId === item.productId && activeBom.jobNo && o.jobNo === activeBom.jobNo)
                                      );

                                      const isAnyReceived = matchedOrders.some(o => o.status === 'received');
                                      
                                      return (
                                        <tr key={originalIndex} className={`transition-colors ${isAnyReceived ? 'bg-emerald-50/20 hover:bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
                                          {/* Tracking Status */}
                                          <td className="py-2 px-1 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                              {matchedOrders.length > 0 ? (
                                                <div className="flex flex-col gap-0.5 items-center">
                                                  {(() => {
                                                    const order = matchedOrders[0];
                                                    return (
                                                      <button
                                                        key={order.id}
                                                        type="button"
                                                        onClick={() => setViewingOrder(order)}
                                                        className={`inline-flex items-center gap-1 text-[8.5px] font-black px-1.5 py-0.5 rounded border cursor-pointer transition-all ${getOrderBadgeStyle(order.status)}`}
                                                        title={`ดูรายละเอียดสถานะใบซื้อ: ${order.orderTitle}`}
                                                      >
                                                        <Eye className="h-2.5 w-2.5" /> {getOrderThaiLabel(order.status)}
                                                      </button>
                                                    );
                                                  })()}
                                                </div>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenQuickRequisition(originalIndex)}
                                                  className={`inline-flex items-center gap-1 px-1.5 py-1 text-[9px] font-black rounded-lg cursor-pointer shadow-3xs transition-all active:scale-95 ${
                                                    currentQtyInStock < requiredTotal
                                                      ? 'text-white bg-amber-500 hover:bg-amber-600 animate-pulse'
                                                      : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100'
                                                  }`}
                                                  title="เปิดใบจัดซื้อหรือติดตามสถานะพัสดุสำหรับรายการนี้"
                                                >
                                                  <Plus className="h-2.5 w-2.5" /> เปิดใบติดตาม
                                                </button>
                                              )}
                                            </div>
                                          </td>

                                          {/* Name & Photo */}
                                          <td className="py-2 px-1 font-extrabold text-slate-800 max-w-[280px]" title={item.productName}>
                                            <div className="flex items-center gap-2">
                                              <img
                                                src={p?.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'}
                                                alt={item.productName}
                                                className="w-10 h-10 object-cover rounded-xl bg-slate-50 border border-slate-150 flex-shrink-0 shadow-3xs"
                                                referrerPolicy="no-referrer"
                                              />
                                              <div className="min-w-0 flex-1">
                                                <div className="truncate flex items-center gap-1">
                                                  <span className="truncate">{item.productName}</span>
                                                  {isAnyReceived && (
                                                    <span className="text-[9px] px-1 bg-emerald-100 text-emerald-800 rounded font-black font-sans shrink-0">
                                                      ได้รับครบ
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 flex-wrap">
                                                  <span>SKU: {p?.sku || '-'}</span>
                                                  <span>•</span>
                                                  <span className={currentQtyInStock < requiredTotal ? 'text-rose-500 font-black' : 'text-emerald-600 font-black'}>
                                                    คงเหลือ: {currentQtyInStock} {item.unit || 'ชิ้น'}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </td>

                                          {/* Quantity per set */}
                                          <td className="py-2 px-1 text-center font-bold">
                                            <InlineInput
                                              type="number"
                                              value={item.quantity}
                                              className="text-center font-bold text-slate-800 bg-slate-50 hover:bg-slate-100"
                                              onSave={(val) => handleUpdateItemField(originalIndex, 'quantity', Math.max(1, parseInt(val) || 1))}
                                            />
                                          </td>

                                          {/* Total quantity required */}
                                          <td className="py-2 px-1 text-center font-black text-indigo-750 font-sans">
                                            {requiredTotal}
                                          </td>

                                          {/* Unit */}
                                          <td className="py-2 px-1 text-center font-bold">
                                            <InlineInput
                                              value={item.unit || 'ชิ้น'}
                                              className="text-center bg-slate-50 hover:bg-slate-100"
                                              onSave={(val) => handleUpdateItemField(originalIndex, 'unit', val.trim() || 'ชิ้น')}
                                            />
                                          </td>

                                          {/* Cost Price Unit */}
                                          <td className="py-2 px-1 text-center font-bold text-indigo-900">
                                            <InlineInput
                                              type="number"
                                              value={itemCost}
                                              className="text-center bg-slate-50 hover:bg-slate-100 font-mono font-black"
                                              onSave={(val) => handleUpdateItemField(originalIndex, 'priceUnit', Math.max(0, parseFloat(val) || 0))}
                                            />
                                          </td>

                                          {/* Total cost */}
                                          <td className="py-2 px-1 text-center font-black text-emerald-700 font-mono">
                                            ฿{costTotal.toLocaleString('th-TH')}
                                          </td>

                                          {/* PR No */}
                                          <td className="py-2 px-1 text-center">
                                            <InlineInput
                                              value={item.prNo || ''}
                                              placeholder="PR-XXXX..."
                                              className="bg-slate-50 hover:bg-slate-100 font-mono text-center font-bold w-24 mx-auto"
                                              onSave={(val) => handleUpdateItemField(originalIndex, 'prNo', val.trim())}
                                            />
                                          </td>

                                          {/* PO No */}
                                          <td className="py-2 px-1 text-center">
                                            <InlineInput
                                              value={item.poNo || ''}
                                              placeholder="PO-XXXX..."
                                              className="bg-slate-50 hover:bg-slate-100 font-mono text-center font-bold w-24 mx-auto"
                                              onSave={(val) => handleUpdateItemField(originalIndex, 'poNo', val.trim())}
                                            />
                                          </td>

                                          {/* Brand */}
                                          <td className="py-2 px-1 text-center">
                                            <InlineInput
                                              value={item.brand || ''}
                                              placeholder="ระบุแบรนด์"
                                              className="bg-slate-50 hover:bg-slate-100 text-center font-bold"
                                              onSave={(val) => handleUpdateItemField(originalIndex, 'brand', val.trim())}
                                            />
                                          </td>

                                          {/* Change Group Selector */}
                                          <td className="py-2 px-1 text-center">
                                            <select
                                              value={item.group || 'ทั่วไป'}
                                              onChange={(e) => handleUpdateItemField(originalIndex, 'group', e.target.value)}
                                              className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px] font-sans font-bold cursor-pointer hover:bg-indigo-50 focus:outline-hidden"
                                            >
                                              <option value="ทั่วไป">ทั่วไป</option>
                                              {getBomGroups(activeBom).map(g => (
                                                <option key={g} value={g}>{g}</option>
                                              ))}
                                            </select>
                                          </td>

                                          {/* Actions delete item */}
                                          <td className="py-2 px-1 text-center">
                                            <button
                                              onClick={() => handleDeleteItem(originalIndex)}
                                              className="p-1 text-slate-300 hover:text-rose-500 rounded-lg cursor-pointer"
                                              title="ลบพัสดุรายการนี้ออกจาก BOM"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}

              </div>

            </div>
          )}
        </div>

      </div>

      {/* Modal: Create New BOM */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-indigo-600" />
                <span>สร้างใบงานโครงสร้างพัสดุใหม่ (Create New BOM)</span>
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBom} className="space-y-4 text-xs font-sans">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">ชื่อใบงาน BOM *</label>
                  <input
                    type="text"
                    required
                    value={newBomName}
                    onChange={(e) => setNewBomName(e.target.value)}
                    placeholder="เช่น ตู้ควบคุมระบบสายพานผลิตพัสดุรุ่น A"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">หมายเลข Job (Job No.)</label>
                    <input
                      type="text"
                      value={newBomJobNo}
                      onChange={(e) => setNewBomJobNo(e.target.value)}
                      placeholder="เช่น JOB-2026-001"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">จำนวนที่ผลิต (เครื่อง/ชุด)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newBomRequiredQuantity}
                      onChange={(e) => setNewBomRequiredQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">คำอธิบายรายละเอียดใบงาน</label>
                  <textarea
                    rows={3}
                    value={newBomDescription}
                    onChange={(e) => setNewBomDescription(e.target.value)}
                    placeholder="พิมพ์อธิบายความต้องการ ชื่องาน หรือสเปคเครื่องประกอบ..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer transition-all"
                >
                  สร้างใบงานประกอบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit BOM Metadata */}
      {isEditModalOpen && activeBom && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-indigo-600" />
                <span>แก้ไขรายละเอียดใบงานประกอบ (Edit BOM details)</span>
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateBomDetails} className="space-y-4 text-xs font-sans">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">ชื่อใบงาน BOM *</label>
                  <input
                    type="text"
                    required
                    value={editBomName}
                    onChange={(e) => setEditBomName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">หมายเลข Job (Job No.)</label>
                    <input
                      type="text"
                      value={editBomJobNo}
                      onChange={(e) => setEditBomJobNo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">จำนวนที่ผลิต (เครื่อง/ชุด)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editBomRequiredQuantity}
                      onChange={(e) => setEditBomRequiredQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">สถานะใบงานผลิตประกอบ</label>
                  <select
                    value={editBomStatus}
                    onChange={(e) => setEditBomStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden font-sans font-bold cursor-pointer"
                  >
                    <option value="pending"> Pending (รอดำเนินการ)</option>
                    <option value="in_progress"> In Progress (กำลังประกอบ)</option>
                    <option value="completed"> Completed (ผลิตสำเร็จ/ส่งมอบแล้ว)</option>
                    <option value="cancelled"> Cancelled (ยกเลิก)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">คำอธิบายรายละเอียดใบงาน</label>
                  <textarea
                    rows={3}
                    value={editBomDescription}
                    onChange={(e) => setEditBomDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer transition-all"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Quick Purchase Requisition Modal */}
      {isRequisitionModalOpen && reqItemIndex !== null && activeBom && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-indigo-950 font-black text-xs sm:text-sm">
                <ShoppingCart className="h-4.5 w-4.5 text-amber-500" />
                <span>เปิดใบเสนอขอจัดซื้อพัสดุประกอบด่วน (BOM Requisition)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsRequisitionModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitQuickRequisition} className="space-y-4 text-xs font-sans">
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3.5 space-y-1.5">
                <div className="text-[10px] uppercase font-black text-slate-400">ชิ้นส่วนพัสดุจาก BOM</div>
                <div className="text-sm font-black text-slate-800">{activeBom.items[reqItemIndex].productName}</div>
                <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold">
                  <span>ใบงานผลิต: <strong className="text-slate-700">{activeBom.name}</strong></span>
                  <span>หมายเลข Job: <strong className="text-slate-700 font-mono">{activeBom.jobNo || '-'}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">จำนวนที่เสนอซื้อ *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={reqQty}
                    onChange={(e) => setReqQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                  />
                  <span className="text-[9px] text-slate-400 font-bold">หน่วย: {activeBom.items[reqItemIndex].unit || 'ชิ้น'}</span>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">ราคากลางต่อหน่วย (฿) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={reqPriceUnit}
                    onChange={(e) => setReqPriceUnit(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                  />
                  <span className="text-[9px] text-slate-400 font-bold">ยอดรวมประเมิน: ฿{(reqPriceUnit * reqQty).toLocaleString('th-TH')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">เลขที่ใบเสนอซื้อ (PR No.) *</label>
                  <input
                    type="text"
                    required
                    value={reqPrNo}
                    onChange={(e) => setReqPrNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono font-black text-indigo-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">แผนก/ผู้เสนอจัดซื้อ *</label>
                  <input
                    type="text"
                    required
                    value={reqRequester}
                    onChange={(e) => setReqRequester(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">รายละเอียดหมายเหตุเพิ่มเติม</label>
                <textarea
                  rows={2}
                  value={reqRemark}
                  onChange={(e) => setReqRemark(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  placeholder="เช่น ยี่ห้อที่ต้องการทดแทน หรือระดับความเร่งด่วน..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRequisitionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1"
                >
                  <ShoppingCart className="h-4 w-4" /> ยืนยันการส่งคำขอซื้อ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Link Existing Purchase Order Modal */}
      {isLinkOrderModalOpen && linkItemIndex !== null && activeBom && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-2xl max-w-xl w-full animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-indigo-950 font-black text-xs sm:text-sm">
                <LinkIcon className="h-4.5 w-4.5 text-indigo-600" />
                <span>จับคู่พัสดุประกอบกับใบจัดซื้อในระบบ</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkOrderModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 font-sans text-xs">
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3.5">
                <div className="text-[10px] uppercase font-black text-slate-400">รายการชิ้นส่วนประกอบ</div>
                <div className="text-sm font-black text-slate-800">{activeBom.items[linkItemIndex].productName}</div>
              </div>

              {/* Search filter input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={linkSearchQuery}
                  onChange={(e) => setLinkSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-bold"
                  placeholder="ค้นหาตามชื่อใบสั่งซื้อ, รหัสพัสดุ, หรือหมายเลข PR/PO..."
                />
              </div>

              {/* List of matches */}
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {(() => {
                  const queryLower = linkSearchQuery.toLowerCase();
                  const filteredOrders = orders.filter(o => 
                    o.orderTitle.toLowerCase().includes(queryLower) ||
                    (o.prNo && o.prNo.toLowerCase().includes(queryLower)) ||
                    (o.poNo && o.poNo.toLowerCase().includes(queryLower)) ||
                    (o.productName && o.productName.toLowerCase().includes(queryLower)) ||
                    (o.jobNo && o.jobNo.toLowerCase().includes(queryLower))
                  );

                  if (filteredOrders.length === 0) {
                    return (
                      <div className="p-8 text-center text-slate-400 italic">
                        ไม่พบคำขอสั่งซื้อที่ตรงกับการค้นหาในคลังระบบจัดซื้อ
                      </div>
                    );
                  }

                  return filteredOrders.map(order => {
                    const matchedStyle = (order.productId === activeBom.items[linkItemIndex].productId)
                      ? 'bg-indigo-50/50 border-indigo-200'
                      : 'bg-white hover:bg-slate-50 border-slate-150';
                    return (
                      <div
                        key={order.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${matchedStyle}`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono font-black text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded">
                              PR: {order.prNo || 'ไม่มี'}
                            </span>
                            {order.poNo && (
                              <span className="text-[10px] font-mono font-black text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded">
                                PO: {order.poNo}
                              </span>
                            )}
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {order.jobNo ? `Job: ${order.jobNo}` : 'ไม่มี Job'}
                            </span>
                          </div>
                          <div className="font-extrabold text-slate-800 truncate text-[11px]">{order.orderTitle}</div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold">
                            <span>ผู้เสนอซื้อ: {order.requesterName}</span>
                            <span>•</span>
                            <span>จำนวนสั่ง: {order.quantity} {order.unit}</span>
                            <span>•</span>
                            <span>ราคารวม: ฿{(order.totalPrice || 0).toLocaleString('th-TH')}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLinkOrderToItem(order)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all cursor-pointer text-[10px] shrink-0 active:scale-95"
                        >
                          ผูกรายการนี้
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLinkOrderModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-all"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Detailed Purchase Order Tracking Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-2xl max-w-xl w-full animate-in zoom-in-95 duration-200 text-left font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-indigo-950 font-black text-xs sm:text-sm">
                <FileText className="h-4.5 w-4.5 text-indigo-600" />
                <span>ระบบติดตามและประเมินผลพัสดุ (Live Purchasing Tracker)</span>
              </div>
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              {/* Order summary header card */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-black text-slate-400">ORDER REF: {viewingOrder.id}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getOrderBadgeStyle(viewingOrder.status)}`}>
                    {getOrderThaiLabel(viewingOrder.status)}
                  </span>
                </div>
                <div className="text-base font-black text-slate-800">{viewingOrder.orderTitle}</div>
                <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-500 pt-1">
                  <div>
                    <span className="block text-slate-400 text-[9px] uppercase font-black">เลขที่ขอจัดซื้อ (PR No.)</span>
                    <span className="text-slate-700 font-mono text-xs">{viewingOrder.prNo || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[9px] uppercase font-black">เลขที่สั่งซื้อสินค้า (PO No.)</span>
                    <span className="text-slate-700 font-mono text-xs">{viewingOrder.poNo || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Elegant Progress/Timeline Stepper */}
              <div className="py-2">
                <div className="text-[10px] uppercase font-black text-slate-400 mb-3 flex items-center justify-between">
                  <span>ขั้นตอนและสถานะการดำเนินการ (Procurement Steps)</span>
                  <span className="text-[8px] text-indigo-600 bg-indigo-50 font-black px-1.5 py-0.5 rounded-sm">คลิกขั้นตอนเพื่อแก้ไขได้</span>
                </div>
                {(() => {
                  const statusIndex = trackerSteps.findIndex(s => s.key === viewingOrder.status);

                  return (
                    <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-slate-100">
                      {trackerSteps.map((step, idx) => {
                        const isDone = idx < statusIndex;
                        const isActive = idx === statusIndex;

                        let stepBullet = 'bg-slate-200 text-slate-400 border-transparent';
                        if (isActive) {
                          stepBullet = 'bg-indigo-600 text-white border-indigo-200 ring-4 ring-indigo-50';
                        } else if (isDone) {
                          stepBullet = 'bg-emerald-500 text-white border-transparent';
                        }

                        return (
                          <div
                            key={step.key}
                            onClick={() => {
                              if (isActive) return;
                              setEditingStatus(step.key);
                              // Pre-populate fields based on viewingOrder values
                              setStatusQuotationNo(viewingOrder.quotationNo || '');
                              setStatusSupplier(viewingOrder.supplier || '');
                              setStatusPrNo(viewingOrder.prNo || '');
                              setStatusPoNo(viewingOrder.poNo || '');
                              setStatusApproverName(viewingOrder.approverName || localStorage.getItem('admin_email')?.split('@')[0] || '');
                              setStatusPaymentRef(viewingOrder.paymentRef || '');
                              setStatusReceivedQty(viewingOrder.receivedQty || viewingOrder.quantity);
                            }}
                            className={`w-full text-left relative flex items-start gap-3 text-[11px] p-1.5 hover:bg-indigo-50/50 rounded-xl transition-all cursor-pointer group ${isActive ? 'bg-indigo-50/30' : ''}`}
                          >
                            {/* Circle bullet */}
                            <div className={`absolute -left-6 top-1.5 h-4.5 w-4.5 rounded-full border flex items-center justify-center text-[9px] font-black z-10 transition-all ${stepBullet}`}>
                              {isDone ? '✓' : idx + 1}
                            </div>
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-black ${isActive ? 'text-indigo-600 text-xs' : isDone ? 'text-emerald-700 font-extrabold' : 'text-slate-500'}`}>
                                  {step.label}
                                </span>
                                {isActive ? (
                                  <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded-sm font-bold">ปัจจุบัน</span>
                                ) : (
                                  <span className="text-[9px] text-indigo-600 font-extrabold opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                    ปรับสถานะเป็นขั้นตอนนี้ ➔
                                  </span>
                                )}
                              </div>
                              <span className="block text-[9px] text-slate-400 font-bold font-sans">
                                {step.desc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Status Editing form card inside Tracker */}
              {editingStatus && (
                <div className="bg-indigo-50/40 border border-indigo-150 rounded-2xl p-4 space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between border-b border-indigo-150 pb-2">
                    <span className="text-[11px] font-black text-indigo-950 flex items-center gap-1.5">
                      <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase">UPDATE</span>
                      <span>ปรับขั้นตอนเป็น: <span className="text-indigo-600 font-black underline">{trackerSteps.find(s => s.key === editingStatus)?.label}</span></span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingStatus(null)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-extrabold"
                    >
                      ยกเลิก
                    </button>
                  </div>

                  {editingStatus === 'quotation' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 block">เลขที่ใบเสนอราคา (Quotation No.)</label>
                        <input
                          type="text"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden text-[11px] font-mono font-bold text-slate-800"
                          value={statusQuotationNo}
                          onChange={(e) => setStatusQuotationNo(e.target.value)}
                          placeholder="เช่น QT-2026-044"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 block">ผู้ขาย / ซัพพลายเออร์ (Supplier)</label>
                        <input
                          type="text"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden text-[11px] text-slate-800 font-bold"
                          value={statusSupplier}
                          onChange={(e) => setStatusSupplier(e.target.value)}
                          placeholder="ชื่อบริษัทร้านค้า/ผู้ขาย"
                        />
                      </div>
                    </div>
                  )}

                  {editingStatus === 'ordered' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 block">เลขที่ใบขอซื้อ (PR No.)</label>
                        <input
                          type="text"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden text-[11px] font-mono font-bold text-slate-800"
                          value={statusPrNo}
                          onChange={(e) => setStatusPrNo(e.target.value)}
                          placeholder="เช่น PR-2026-0001"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 block">เลขที่ใบสั่งซื้อ (PO No.)</label>
                        <input
                          type="text"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden text-[11px] font-mono font-bold text-slate-800"
                          value={statusPoNo}
                          onChange={(e) => setStatusPoNo(e.target.value)}
                          placeholder="เช่น PO-2026-0001"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 block">ผู้ขาย / ซัพพลายเออร์ (Supplier)</label>
                        <input
                          type="text"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden text-[11px] text-slate-800 font-bold"
                          value={statusSupplier}
                          onChange={(e) => setStatusSupplier(e.target.value)}
                          placeholder="ชื่อบริษัทร้านค้า/ผู้ขาย"
                        />
                      </div>
                    </div>
                  )}

                  {editingStatus === 'approved' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-600 block">ชื่อผู้อนุมัติ (Approver)</label>
                      <input
                        type="text"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden text-[11px] font-bold text-slate-800"
                        value={statusApproverName}
                        onChange={(e) => setStatusApproverName(e.target.value)}
                        placeholder="ชื่อผู้อนุมัติ"
                      />
                    </div>
                  )}

                  {editingStatus === 'paid' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-600 block">ข้อมูลการโอนเงิน (Payment Ref) <span className="text-slate-400 font-bold">(ไม่บังคับ)</span></label>
                      <input
                        type="text"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden text-[11px] text-slate-800 font-bold"
                        value={statusPaymentRef}
                        onChange={(e) => setStatusPaymentRef(e.target.value)}
                        placeholder="เช่น โอนผ่านธนาคารกสิกรไทย / สลิปโอนเงิน (เว้นว่างไว้ได้)"
                      />
                    </div>
                  )}

                  {editingStatus === 'received' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 block">จำนวนที่ตรวจรับจริง ({viewingOrder.unit || 'ชิ้น'})</label>
                        <input
                          type="number"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden text-[11px] font-mono font-bold text-slate-800"
                          value={statusReceivedQty}
                          onChange={(e) => setStatusReceivedQty(Math.max(1, parseInt(e.target.value) || 0))}
                        />
                      </div>
                      <div className="flex items-end text-[10px] text-amber-700 font-extrabold leading-tight pb-1">
                        * ระบบจะเปลี่ยนสถานะเป็นรับของ และเติมสินค้าเข้าสต็อกสต็อกตามจำนวนนี้
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-indigo-150/50">
                    <button
                      type="button"
                      onClick={() => setEditingStatus(null)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-black rounded-lg text-[10px] cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveStatusFromTracker}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg text-[10px] shadow-3xs cursor-pointer flex items-center gap-1"
                    >
                      <span>ตกลง</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Detailed specs list */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-b border-slate-100 py-3 font-sans text-[11px]">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-bold">จำนวนที่สั่งซื้อ:</span>
                  <span className="font-extrabold text-slate-700">{viewingOrder.quantity} {viewingOrder.unit || 'ชิ้น'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-bold">ราคาต่อชิ้น:</span>
                  <span className="font-mono font-black text-indigo-750 font-sans">฿{(viewingOrder.pricePerUnit || 0).toLocaleString('th-TH')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-bold">ราคารวมพัสดุ:</span>
                  <span className="font-mono font-black text-emerald-700 font-sans">฿{(viewingOrder.totalPrice || 0).toLocaleString('th-TH')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-bold">ใบงานจัดทำ (Job):</span>
                  <span className="font-extrabold text-slate-700">{viewingOrder.jobNo || 'ไม่ระบุ'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-bold">ผู้เสนอขอซื้อ:</span>
                  <span className="font-extrabold text-slate-700">{viewingOrder.requesterName || '-'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-bold">ผู้รับผิดชอบจัดซื้อ:</span>
                  <span className="font-extrabold text-slate-700">{viewingOrder.purchaserName || '-'}</span>
                </div>
                {viewingOrder.supplier && (
                  <div className="col-span-2 flex justify-between py-1 border-t border-slate-50">
                    <span className="text-slate-400 font-bold">ผู้จัดจำหน่าย (Supplier):</span>
                    <span className="font-black text-indigo-950">{viewingOrder.supplier}</span>
                  </div>
                )}
                {viewingOrder.remark && (
                  <div className="col-span-2 space-y-1 bg-slate-50/50 rounded-xl p-2.5 border border-slate-100 mt-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black block">บันทึกช่วยจำ/หมายเหตุ</span>
                    <p className="text-slate-600 font-medium text-[11px] leading-relaxed italic">
                      "{viewingOrder.remark}"
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setViewingOrder(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl cursor-pointer transition-all active:scale-95 text-xs font-sans"
                >
                  ปิดหน้าต่างติดตาม
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
