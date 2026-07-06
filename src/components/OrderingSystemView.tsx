import React, { useState, useEffect } from 'react';
import { Product, ProductOrder, StockActivity } from '../types';
import { collection, onSnapshot, query, doc, setDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ShoppingCart, 
  Truck, 
  User, 
  Package, 
  Clock, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Trash2, 
  Calendar, 
  DollarSign, 
  X, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  TrendingUp,
  PackageCheck,
  AlertCircle,
  Eye,
  Check,
  Printer,
  Edit3,
  Building,
  ArrowUpDown,
  Download,
  CheckSquare,
  Sparkles,
  Briefcase
} from 'lucide-react';

interface OrderingSystemViewProps {
  products: Product[];
  addToast: (type: 'success' | 'warning' | 'info', title: string, message: string) => void;
  onAdjustStock: (productId: string, change: number, reason: string) => Promise<void>;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

export default function OrderingSystemView({ products, addToast, onAdjustStock }: OrderingSystemViewProps) {
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states (Create)
  const [requesterName, setRequesterName] = useState('');
  const [purchaserName, setPurchaserName] = useState('');
  const [orderTitle, setOrderTitle] = useState('');
  const [jobNo, setJobNo] = useState('');
  const [jobName, setJobName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState('ชิ้น');
  const [pricePerUnit, setPricePerUnit] = useState<number>(0);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [remark, setRemark] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Edit Modal States
  const [editingOrder, setEditingOrder] = useState<ProductOrder | null>(null);
  const [editRequesterName, setEditRequesterName] = useState('');
  const [editPurchaserName, setEditPurchaserName] = useState('');
  const [editOrderTitle, setEditOrderTitle] = useState('');
  const [editJobNo, setEditJobNo] = useState('');
  const [editJobName, setEditJobName] = useState('');
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editUnit, setEditUnit] = useState('ชิ้น');
  const [editPricePerUnit, setEditPricePerUnit] = useState<number>(0);
  const [editSelectedProductId, setEditSelectedProductId] = useState<string>('');
  const [editRemark, setEditRemark] = useState('');
  const [editStatus, setEditStatus] = useState<ProductOrder['status']>('pending');
  const [editPrNo, setEditPrNo] = useState('');
  const [editPoNo, setEditPoNo] = useState('');
  const [editSupplier, setEditSupplier] = useState('');
  const [editQuotationNo, setEditQuotationNo] = useState('');
  const [editApproverName, setEditApproverName] = useState('');
  const [editPaymentRef, setEditPaymentRef] = useState('');

  // Step-by-step confirmation states
  const [confirmingStatusOrder, setConfirmingStatusOrder] = useState<ProductOrder | null>(null);
  const [confirmingTargetStatus, setConfirmingTargetStatus] = useState<ProductOrder['status'] | null>(null);
  const [stepQuotationNo, setStepQuotationNo] = useState('');
  const [stepSupplier, setStepSupplier] = useState('');
  const [stepPrNo, setStepPrNo] = useState('');
  const [stepPoNo, setStepPoNo] = useState('');
  const [stepApproverName, setStepApproverName] = useState('');
  const [stepPaymentRef, setStepPaymentRef] = useState('');

  // Purchase Order Document View State
  const [viewingPoOrder, setViewingPoOrder] = useState<ProductOrder | null>(null);

  // Search, Filter, Sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeStatusTab, setActiveStatusTab] = useState<'active' | 'received' | 'all'>('active');
  const [sortBy, setSortBy] = useState<'createdAt' | 'totalPrice' | 'quantity'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'job' | 'all'>('job');
  const [collapsedJobs, setCollapsedJobs] = useState<string[]>([]);

  // Intake Modal state
  const [intakeOrder, setIntakeOrder] = useState<ProductOrder | null>(null);
  const [intakeQty, setIntakeQty] = useState<number>(1);

  // Firestore error handler conforming to firebase-integration skill
  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: localStorage.getItem('admin_email'),
        email: localStorage.getItem('admin_email')
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    addToast('warning', 'เกิดข้อผิดพลาดคลังข้อมูล (Firestore)', error instanceof Error ? error.message : String(error));
    throw new Error(JSON.stringify(errInfo));
  };

  // Sync orders from Firestore
  useEffect(() => {
    const path = 'orders';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ProductOrder[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as ProductOrder);
      });
      setOrders(list);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Autofill create form if product selected
  useEffect(() => {
    if (selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) {
        setOrderTitle(prod.name);
        setPricePerUnit(prod.costPrice || prod.price || 0);
        setUnit(prod.unit || 'ชิ้น');
      }
    }
  }, [selectedProductId, products]);

  // Autofill edit form if product selected during editing
  useEffect(() => {
    if (editSelectedProductId && editingOrder) {
      const prod = products.find(p => p.id === editSelectedProductId);
      if (prod) {
        setEditOrderTitle(prod.name);
        setEditPricePerUnit(prod.costPrice || prod.price || 0);
        setEditUnit(prod.unit || 'ชิ้น');
      }
    }
  }, [editSelectedProductId]);

  // Handle Create Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName.trim() || !orderTitle.trim() || quantity <= 0) {
      addToast('warning', 'ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อผู้ขอสั่งซื้อ ชื่อสั่งซื้อ และจำนวนสินค้า');
      return;
    }

    const orderId = `order-${Math.random().toString(36).substring(2, 9)}`;
    const matchedProduct = products.find(p => p.id === selectedProductId);
    
    const newOrder: any = {
      id: orderId,
      requesterName: requesterName.trim(),
      orderTitle: orderTitle.trim(),
      status: 'pending',
      quantity,
      unit: unit.trim() || 'ชิ้น',
      createdAt: new Date().toISOString()
    };

    if (jobNo.trim()) {
      newOrder.jobNo = jobNo.trim();
    }
    if (jobName.trim()) {
      newOrder.jobName = jobName.trim();
    }
    if (purchaserName.trim()) {
      newOrder.purchaserName = purchaserName.trim();
    }
    if (pricePerUnit > 0) {
      newOrder.pricePerUnit = pricePerUnit;
      newOrder.totalPrice = pricePerUnit * quantity;
    }
    if (selectedProductId) {
      newOrder.productId = selectedProductId;
    }
    if (matchedProduct) {
      newOrder.productName = matchedProduct.name;
    }
    if (remark.trim()) {
      newOrder.remark = remark.trim();
    }

    const path = `orders/${orderId}`;
    try {
      await setDoc(doc(db, 'orders', orderId), newOrder);
      addToast('success', 'สร้างใบขอสั่งซื้อสำเร็จ', `บันทึกคำสั่งซื้อ "${orderTitle}" เรียบร้อยแล้ว`);
      
      // Reset form
      setRequesterName('');
      setPurchaserName('');
      setOrderTitle('');
      setJobNo('');
      setJobName('');
      setQuantity(1);
      setUnit('ชิ้น');
      setPricePerUnit(0);
      setSelectedProductId('');
      setRemark('');
      setIsFormOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Open Edit Modal and load current values
  const handleOpenEdit = (order: ProductOrder) => {
    setEditingOrder(order);
    setEditRequesterName(order.requesterName);
    setEditPurchaserName(order.purchaserName || '');
    setEditOrderTitle(order.orderTitle);
    setEditJobNo(order.jobNo || '');
    setEditJobName(order.jobName || '');
    setEditQuantity(order.quantity);
    setEditUnit(order.unit || 'ชิ้น');
    setEditPricePerUnit(order.pricePerUnit || 0);
    setEditSelectedProductId(order.productId || '');
    setEditRemark(order.remark || '');
    setEditStatus(order.status);
    setEditPrNo(order.prNo || '');
    setEditPoNo(order.poNo || '');
    setEditSupplier(order.supplier || '');
    setEditQuotationNo(order.quotationNo || '');
    setEditApproverName(order.approverName || '');
    setEditPaymentRef(order.paymentRef || '');
  };

  // Save changes to Order (Edit)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (!editRequesterName.trim() || !editOrderTitle.trim() || editQuantity <= 0) {
      addToast('warning', 'ข้อมูลไม่ครบครัน', 'กรุณากรอกชื่อผู้สั่งซื้อ ชื่อพัสดุ และระบุจำนวนที่มีค่ามากกว่า 0');
      return;
    }

    const path = `orders/${editingOrder.id}`;
    const matchedProduct = products.find(p => p.id === editSelectedProductId);
    
    // Construct safe update fields without undefined values
    const updatedFields: any = {
      requesterName: editRequesterName.trim(),
      purchaserName: editPurchaserName.trim() || null,
      orderTitle: editOrderTitle.trim(),
      jobNo: editJobNo.trim() || null,
      jobName: editJobName.trim() || null,
      quantity: editQuantity,
      unit: editUnit.trim() || 'ชิ้น',
      status: editStatus,
      prNo: editPrNo.trim() || null,
      poNo: editPoNo.trim() || null,
      supplier: editSupplier.trim() || null,
      quotationNo: editQuotationNo.trim() || null,
      approverName: editApproverName.trim() || null,
      paymentRef: editPaymentRef.trim() || null
    };

    if (editPricePerUnit > 0) {
      updatedFields.pricePerUnit = editPricePerUnit;
      updatedFields.totalPrice = editPricePerUnit * editQuantity;
    } else {
      updatedFields.pricePerUnit = null; // Use null to remove or clear in Firestore safely
      updatedFields.totalPrice = null;
    }

    if (editSelectedProductId) {
      updatedFields.productId = editSelectedProductId;
      updatedFields.productName = matchedProduct ? matchedProduct.name : '';
    } else {
      updatedFields.productId = null;
      updatedFields.productName = null;
    }

    if (editRemark.trim()) {
      updatedFields.remark = editRemark.trim();
    } else {
      updatedFields.remark = null;
    }

    // Safe timestamp tracking based on step progress
    const nowStr = new Date().toISOString();
    if (editStatus === 'pending') {
      updatedFields.quotationAt = null;
      updatedFields.orderedAt = null;
      updatedFields.approvedAt = null;
      updatedFields.paidAt = null;
      updatedFields.receivedAt = null;
      updatedFields.receivedQty = null;
      updatedFields.cancelledAt = null;
    } else if (editStatus === 'quotation') {
      updatedFields.quotationAt = editingOrder.quotationAt || nowStr;
      updatedFields.orderedAt = null;
      updatedFields.approvedAt = null;
      updatedFields.paidAt = null;
      updatedFields.receivedAt = null;
      updatedFields.receivedQty = null;
      updatedFields.cancelledAt = null;
    } else if (editStatus === 'ordered') {
      updatedFields.quotationAt = editingOrder.quotationAt || nowStr;
      updatedFields.orderedAt = editingOrder.orderedAt || nowStr;
      updatedFields.approvedAt = null;
      updatedFields.paidAt = null;
      updatedFields.receivedAt = null;
      updatedFields.receivedQty = null;
      updatedFields.cancelledAt = null;
    } else if (editStatus === 'approved') {
      updatedFields.quotationAt = editingOrder.quotationAt || nowStr;
      updatedFields.orderedAt = editingOrder.orderedAt || nowStr;
      updatedFields.approvedAt = editingOrder.approvedAt || nowStr;
      updatedFields.paidAt = null;
      updatedFields.receivedAt = null;
      updatedFields.receivedQty = null;
      updatedFields.cancelledAt = null;
    } else if (editStatus === 'paid') {
      updatedFields.quotationAt = editingOrder.quotationAt || nowStr;
      updatedFields.orderedAt = editingOrder.orderedAt || nowStr;
      updatedFields.approvedAt = editingOrder.approvedAt || nowStr;
      updatedFields.paidAt = editingOrder.paidAt || nowStr;
      updatedFields.receivedAt = null;
      updatedFields.receivedQty = null;
      updatedFields.cancelledAt = null;
    } else if (editStatus === 'received') {
      updatedFields.quotationAt = editingOrder.quotationAt || nowStr;
      updatedFields.orderedAt = editingOrder.orderedAt || nowStr;
      updatedFields.approvedAt = editingOrder.approvedAt || nowStr;
      updatedFields.paidAt = editingOrder.paidAt || nowStr;
      updatedFields.receivedAt = editingOrder.receivedAt || nowStr;
      updatedFields.receivedQty = editingOrder.receivedQty || editQuantity;
      updatedFields.cancelledAt = null;
    } else if (editStatus === 'cancelled') {
      updatedFields.cancelledAt = editingOrder.cancelledAt || nowStr;
    }

    try {
      await updateDoc(doc(db, 'orders', editingOrder.id), updatedFields);
      addToast('success', 'ปรับปรุงใบสั่งซื้อสำเร็จ', `บันทึกการแก้ไขรายการ "${editOrderTitle}" เรียบร้อย`);
      setEditingOrder(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Handle delete order
  const handleDeleteOrder = async (id: string, title: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ที่ต้องการลบใบสั่งซื้อ "${title}" ออกจากระบบ?`)) {
      const path = `orders/${id}`;
      try {
        await deleteDoc(doc(db, 'orders', id));
        addToast('info', 'ลบใบสั่งซื้อสำเร็จ', `ลบรายการสั่งซื้อ "${title}" เรียบร้อย`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  };

  // Handle Status Update directly on the card
  const handleUpdateStatus = async (
    orderId: string,
    newStatus: ProductOrder['status'],
    additionalFields: Partial<ProductOrder> = {}
  ) => {
    const path = `orders/${orderId}`;
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) return;

    try {
      const nowStr = new Date().toISOString();
      const updates: any = { status: newStatus, ...additionalFields };
      
      if (newStatus === 'pending') {
        updates.quotationAt = null;
        updates.orderedAt = null;
        updates.approvedAt = null;
        updates.paidAt = null;
        updates.receivedAt = null;
        updates.receivedQty = null;
        updates.cancelledAt = null;
      } else if (newStatus === 'quotation') {
        updates.quotationAt = currentOrder.quotationAt || nowStr;
        updates.orderedAt = null;
        updates.approvedAt = null;
        updates.paidAt = null;
        updates.receivedAt = null;
        updates.receivedQty = null;
        updates.cancelledAt = null;
      } else if (newStatus === 'ordered') {
        updates.quotationAt = currentOrder.quotationAt || nowStr;
        updates.orderedAt = currentOrder.orderedAt || nowStr;
        updates.approvedAt = null;
        updates.paidAt = null;
        updates.receivedAt = null;
        updates.receivedQty = null;
        updates.cancelledAt = null;
      } else if (newStatus === 'approved') {
        updates.quotationAt = currentOrder.quotationAt || nowStr;
        updates.orderedAt = currentOrder.orderedAt || nowStr;
        updates.approvedAt = currentOrder.approvedAt || nowStr;
        updates.paidAt = null;
        updates.receivedAt = null;
        updates.receivedQty = null;
        updates.cancelledAt = null;
      } else if (newStatus === 'paid') {
        updates.quotationAt = currentOrder.quotationAt || nowStr;
        updates.orderedAt = currentOrder.orderedAt || nowStr;
        updates.approvedAt = currentOrder.approvedAt || nowStr;
        updates.paidAt = currentOrder.paidAt || nowStr;
        updates.receivedAt = null;
        updates.receivedQty = null;
        updates.cancelledAt = null;
      } else if (newStatus === 'received') {
        updates.quotationAt = currentOrder.quotationAt || nowStr;
        updates.orderedAt = currentOrder.orderedAt || nowStr;
        updates.approvedAt = currentOrder.approvedAt || nowStr;
        updates.paidAt = currentOrder.paidAt || nowStr;
        updates.receivedAt = currentOrder.receivedAt || nowStr;
        updates.receivedQty = currentOrder.receivedQty || currentOrder.quantity;
        updates.cancelledAt = null;
      } else if (newStatus === 'cancelled') {
        updates.cancelledAt = currentOrder.cancelledAt || nowStr;
      }
      
      await updateDoc(doc(db, 'orders', orderId), updates);
      
      let statusThai = '';
      switch (newStatus) {
        case 'pending': statusThai = 'ขอซื้อ'; break;
        case 'quotation': statusThai = 'ขอใบเสนอราคา'; break;
        case 'ordered': statusThai = 'เปิด PR/PO'; break;
        case 'approved': statusThai = 'อนุมัติ PR/PO'; break;
        case 'paid': statusThai = 'โอนเงิน'; break;
        case 'received': statusThai = 'ส่งของ / สำเร็จ'; break;
        case 'cancelled': statusThai = 'ยกเลิกรายการ'; break;
      }
      
      addToast('success', 'อัปเดตสถานะสำเร็จ', `เปลี่ยนสถานะใบสั่งซื้อเป็น "${statusThai}"`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Initiate step transition with details check
  const initiateStatusTransition = (order: ProductOrder, targetStatus: ProductOrder['status']) => {
    if (targetStatus === 'received') {
      openIntakeModal(order);
      return;
    }
    if (targetStatus === 'pending' || targetStatus === 'cancelled') {
      handleUpdateStatus(order.id, targetStatus);
      return;
    }

    // Set default fields and open modal
    setConfirmingStatusOrder(order);
    setConfirmingTargetStatus(targetStatus);
    setStepQuotationNo(order.quotationNo || '');
    setStepSupplier(order.supplier || '');
    setStepPrNo(order.prNo || getRequisitionNumber(order));
    setStepPoNo(order.poNo || '');
    setStepApproverName(order.approverName || localStorage.getItem('admin_email')?.split('@')[0] || '');
    setStepPaymentRef(order.paymentRef || '');
  };

  // Handle confirmation save for step-by-step fields
  const handleConfirmStepSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingStatusOrder || !confirmingTargetStatus) return;

    const fields: any = {};
    if (confirmingTargetStatus === 'quotation') {
      fields.quotationNo = stepQuotationNo.trim() || null;
      fields.supplier = stepSupplier.trim() || null;
    } else if (confirmingTargetStatus === 'ordered') {
      fields.prNo = stepPrNo.trim() || null;
      fields.poNo = stepPoNo.trim() || null;
      if (stepSupplier.trim()) {
        fields.supplier = stepSupplier.trim();
      }
    } else if (confirmingTargetStatus === 'approved') {
      fields.approverName = stepApproverName.trim() || null;
    } else if (confirmingTargetStatus === 'paid') {
      fields.paymentRef = stepPaymentRef.trim() || null;
    }

    await handleUpdateStatus(confirmingStatusOrder.id, confirmingTargetStatus, fields);
    
    // reset states
    setConfirmingStatusOrder(null);
    setConfirmingTargetStatus(null);
  };

  // Open intake modal
  const openIntakeModal = (order: ProductOrder) => {
    setIntakeOrder(order);
    setIntakeQty(order.quantity);
  };

  // Execute intake to stock
  const handleExecuteIntake = async () => {
    if (!intakeOrder) return;

    const path = `orders/${intakeOrder.id}`;
    try {
      // 1. If associated with a product, update stock in store
      if (intakeOrder.productId) {
        const reason = `นำเข้าพัสดุจากใบสั่งซื้อโดย ${intakeOrder.requesterName} (รหัสใบสั่งซื้อ: ${intakeOrder.id})`;
        await onAdjustStock(intakeOrder.productId, intakeQty, reason);
      }

      // 2. Update order status to 'received' with receipt timestamp
      const nowStr = new Date().toISOString();
      const updates: any = {
        status: 'received',
        quotationAt: intakeOrder.quotationAt || nowStr,
        orderedAt: intakeOrder.orderedAt || nowStr,
        approvedAt: intakeOrder.approvedAt || nowStr,
        paidAt: intakeOrder.paidAt || nowStr,
        receivedAt: intakeOrder.receivedAt || nowStr,
        receivedQty: intakeQty
      };

      await updateDoc(doc(db, 'orders', intakeOrder.id), updates);

      addToast(
        'success', 
        'รับของเข้าคลังเรียบร้อย', 
        `ปรับปรุงสถานะ และนำเข้า ${intakeQty} ${intakeOrder.unit || 'ชิ้น'} ของ "${intakeOrder.orderTitle}" เข้าสู่คลังสำเร็จ`
      );
      setIntakeOrder(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Sort and Filters implementation
  const filteredOrders = orders
    .filter(o => {
      const matchesSearch = 
        o.orderTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.remark && o.remark.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let matchesStatusTab = true;
      if (activeStatusTab === 'active') {
        matchesStatusTab = o.status !== 'received' && o.status !== 'cancelled';
      } else if (activeStatusTab === 'received') {
        matchesStatusTab = o.status === 'received';
      } else if (activeStatusTab === 'all') {
        matchesStatusTab = true;
      }

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatusTab && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'createdAt') {
        const valA = a.createdAt || '';
        const valB = b.createdAt || '';
        comparison = valA.localeCompare(valB);
      } else if (sortBy === 'totalPrice') {
        const valA = a.totalPrice || 0;
        const valB = b.totalPrice || 0;
        comparison = valA - valB;
      } else if (sortBy === 'quantity') {
        const valA = a.quantity || 0;
        const valB = b.quantity || 0;
        comparison = valA - valB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // KPI calculations
  const totalOrdersCount = orders.length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const inProgressCount = orders.filter(o => o.status === 'ordered' || o.status === 'shipping').length;
  const completedCount = orders.filter(o => o.status === 'received').length;
  
  const totalSpend = orders
    .filter(o => o.status !== 'cancelled' && o.totalPrice)
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' น.';
  };

  // Helper to generate professional Requisition Numbers
  const getRequisitionNumber = (order: ProductOrder) => {
    if (!order.createdAt) return `PR-GEN-${order.id.slice(-4).toUpperCase()}`;
    const dateStr = order.createdAt.split('T')[0].replace(/-/g, '');
    return `PR-${dateStr}-${order.id.slice(-4).toUpperCase()}`;
  };

  // Group by Job No logic
  const groupedJobs = React.useMemo(() => {
    const groups: { [key: string]: { jobNo: string; jobName: string; orders: ProductOrder[] } } = {};
    
    filteredOrders.forEach(o => {
      const key = o.jobNo ? o.jobNo.trim() : 'UNASSIGNED';
      if (!groups[key]) {
        groups[key] = {
          jobNo: o.jobNo ? o.jobNo.trim() : '',
          jobName: o.jobName ? o.jobName.trim() : '',
          orders: []
        };
      }
      groups[key].orders.push(o);
    });

    return Object.values(groups).sort((a, b) => {
      if (a.jobNo === '') return 1; // Unassigned at the bottom
      if (b.jobNo === '') return -1;
      return a.jobNo.localeCompare(b.jobNo);
    });
  }, [filteredOrders]);

  const toggleJobCollapsed = (jobNo: string) => {
    const key = jobNo || 'UNASSIGNED';
    setCollapsedJobs(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const renderOrderCard = (order: ProductOrder) => {
    let badgeColor = '';
    let statusLabel = '';
    let statusStepIndex = 0;

    switch (order.status) {
      case 'pending':
        badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
        statusLabel = '1. ขอซื้อ';
        statusStepIndex = 1;
        break;
      case 'quotation':
        badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
        statusLabel = '2. ขอใบเสนอราคา';
        statusStepIndex = 2;
        break;
      case 'ordered':
        badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
        statusLabel = '3. เปิด PR/PO';
        statusStepIndex = 3;
        break;
      case 'approved':
        badgeColor = 'bg-teal-50 text-teal-700 border-teal-200';
        statusLabel = '4. อนุมัติ PR/PO';
        statusStepIndex = 4;
        break;
      case 'paid':
        badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        statusLabel = '5. โอนเงินแล้ว';
        statusStepIndex = 5;
        break;
      case 'received':
        badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        statusLabel = '6. ส่งของสำเร็จ';
        statusStepIndex = 6;
        break;
      case 'cancelled':
        badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
        statusLabel = 'ยกเลิกจัดซื้อ';
        statusStepIndex = 0;
        break;
      default:
        badgeColor = 'bg-slate-50 text-slate-700 border-slate-200';
        statusLabel = 'รอตรวจสอบ';
        statusStepIndex = 1;
        break;
    }

    const prNumber = getRequisitionNumber(order);

    return (
      <div 
        key={order.id} 
        className="bg-white border border-slate-150 rounded-xl p-3 shadow-3xs hover:shadow-2xs transition-all relative overflow-hidden flex flex-col gap-2 border-l-2 border-l-indigo-500"
      >
        {/* Header bar / Metadata - highly compact */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
          {/* Left: PR Number, status badge & tiny Job No tag (if not in job mode) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-mono font-bold bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/60 shrink-0">
              {prNumber}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badgeColor}`}>
              {statusLabel}
            </span>
            {viewMode === 'all' && (order.jobNo || order.jobName) && (
              <span className="text-[8px] font-extrabold bg-amber-50 text-amber-800 border border-amber-150 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                <Briefcase className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                <span className="truncate max-w-[100px]">{order.jobNo || order.jobName}</span>
              </span>
            )}
          </div>
          
          {/* Right: Compact actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewingPoOrder(order)}
              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
              title="ดูเอกสารใบขอสั่งซื้อ"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleOpenEdit(order)}
              className="p-1 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
              title="แก้ไขใบขอสั่งซื้อ"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Content Section - Compact horizontal grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
          {/* Left: Product Title, requesters, and remark */}
          <div className="md:col-span-8 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs font-extrabold text-slate-800 font-sans tracking-tight leading-snug">
                {order.orderTitle}
              </h4>
            </div>
            
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9.5px] text-slate-400 font-sans">
              <span className="flex items-center gap-0.5">
                <User className="h-2.5 w-2.5 text-slate-400" /> แผนก: <strong className="text-slate-500">{order.requesterName}</strong>
              </span>
              {order.purchaserName && (
                <span className="flex items-center gap-0.5">
                  <User className="h-2.5 w-2.5 text-indigo-400" /> จัดซื้อ: <strong className="text-indigo-600 font-extrabold">{order.purchaserName}</strong>
                </span>
              )}
              <span className="flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5 text-slate-400" /> <span className="font-mono text-[9px]">{new Date(order.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}</span>
              </span>
            </div>

            {order.remark && (
              <p className="text-[9px] bg-slate-50/80 border border-slate-100/50 px-2 py-0.5 rounded text-slate-400 italic font-sans max-w-full truncate" title={order.remark}>
                {order.remark}
              </p>
            )}
          </div>

          {/* Right: Qty & Price - very compact badge style */}
          <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-3 bg-slate-50/50 rounded-lg p-1.5 border border-slate-100/40 text-right shrink-0">
            <div className="text-left md:text-right">
              <span className="text-[8px] text-slate-400 font-bold block leading-none">จำนวน</span>
              <span className="text-xs font-extrabold text-slate-800">
                {order.quantity} <span className="text-[10px] text-slate-500 font-medium">{order.unit || 'ชิ้น'}</span>
              </span>
            </div>
            
            <div className="h-5 w-px bg-slate-200 hidden md:block" />

            <div>
              <span className="text-[8px] text-slate-400 font-bold block leading-none">ราคารวม</span>
              <span className="text-xs font-extrabold text-indigo-600 block">
                {order.pricePerUnit ? `฿${(order.pricePerUnit * order.quantity).toLocaleString('th-TH')}` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom tracking steps tracker bar - ultra compact */}
        {order.status !== 'cancelled' ? (
          <div className="border-t border-slate-100 pt-1.5 mt-0.5">
            <div className="relative flex items-center justify-between w-full max-w-lg mx-auto px-1">
              {/* Progress Line */}
              <div className="absolute left-0 top-1/2 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
              
              {/* Colored active bar line */}
              <div 
                className="absolute left-0 top-1/2 h-0.5 bg-indigo-500 -translate-y-1/2 z-0 transition-all duration-300"
                style={{ 
                  width: statusStepIndex === 1 ? '0%' : 
                         statusStepIndex === 2 ? '20%' : 
                         statusStepIndex === 3 ? '40%' : 
                         statusStepIndex === 4 ? '60%' : 
                         statusStepIndex === 5 ? '80%' : '100%' 
                }}
              />

              {/* Steps - ultra compact */}
              {[
                { step: 1, key: 'pending', label: 'ขอซื้อ', icon: Clock },
                { step: 2, key: 'quotation', label: 'ใบเสนอราคา', icon: FileText },
                { step: 3, key: 'ordered', label: 'เปิด PR/PO', icon: ShoppingCart },
                { step: 4, key: 'approved', label: 'อนุมัติ', icon: CheckCircle },
                { step: 5, key: 'paid', label: 'โอนเงิน', icon: DollarSign },
                { step: 6, key: 'received', label: 'รับของ', icon: PackageCheck }
              ].map((stepObj) => {
                const StepIcon = stepObj.icon;
                const isCompleted = statusStepIndex >= stepObj.step;
                const isCurrent = statusStepIndex === stepObj.step;

                let stepTime = '';
                if (stepObj.key === 'pending') {
                  stepTime = order.createdAt;
                } else if (stepObj.key === 'quotation') {
                  stepTime = order.quotationAt || '';
                } else if (stepObj.key === 'ordered') {
                  stepTime = order.orderedAt || '';
                } else if (stepObj.key === 'approved') {
                  stepTime = order.approvedAt || '';
                } else if (stepObj.key === 'paid') {
                  stepTime = order.paidAt || '';
                } else if (stepObj.key === 'received') {
                  stepTime = order.receivedAt || '';
                }

                return (
                  <div 
                    key={stepObj.step} 
                    className="flex flex-col items-center z-10 cursor-pointer group"
                    onClick={() => {
                      initiateStatusTransition(order, stepObj.key as ProductOrder['status']);
                    }}
                    title={`คลิกเปลี่ยนสถานะ: ${stepObj.label}`}
                  >
                    <div 
                      className={`h-5 w-5 rounded-full flex items-center justify-center border transition-all ${
                        isCompleted 
                          ? isCurrent 
                            ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-100 scale-105' 
                            : 'bg-indigo-500 text-white border-indigo-500'
                          : 'bg-white text-slate-300 border-slate-200 group-hover:border-indigo-400 group-hover:text-indigo-650'
                      }`}
                    >
                      <StepIcon className="h-2.5 w-2.5" />
                    </div>
                    <span className={`text-[7.5px] font-sans font-bold mt-0.5 tracking-tighter scale-90 ${
                      isCurrent ? 'text-indigo-600 font-black' : isCompleted ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {stepObj.label}
                    </span>
                    {stepTime && (
                      <span className="text-[7px] font-mono font-bold text-indigo-500/70 block mt-0.5 scale-90 origin-top">
                        {new Date(stepTime).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-rose-50/50 px-2 py-1 rounded-lg border border-rose-100 flex items-center gap-1 mt-0.5">
            <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" />
            <span className="text-[8px] text-rose-700 font-bold font-sans">
              รายการนี้ถูกยกเลิกแล้ว
            </span>
          </div>
        )}

        {/* Bottom Status Update Quick buttons - micro actions */}
        {order.status !== 'received' && order.status !== 'cancelled' && (
          <div className="flex flex-wrap items-center justify-end gap-1 pt-1.5 border-t border-slate-100/50 mt-0.5">
            <span className="text-[8px] text-slate-400 font-bold uppercase mr-auto">
              ขั้นตอนถัดไป:
            </span>
            
            {order.status === 'pending' && (
              <>
                <button
                  onClick={() => initiateStatusTransition(order, 'quotation')}
                  className="px-2 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white rounded text-[8px] font-bold font-sans transition-all cursor-pointer border border-purple-200"
                >
                  เสนอราคา →
                </button>
                <button
                  onClick={() => initiateStatusTransition(order, 'ordered')}
                  className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded text-[8px] font-bold font-sans transition-all cursor-pointer border border-blue-200"
                >
                  เปิด PR/PO →
                </button>
              </>
            )}

            {order.status === 'quotation' && (
              <button
                onClick={() => initiateStatusTransition(order, 'ordered')}
                className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded text-[8px] font-bold font-sans transition-all cursor-pointer border border-blue-200"
              >
                ยืนยันเปิด PR/PO →
              </button>
            )}

            {order.status === 'ordered' && (
              <button
                onClick={() => initiateStatusTransition(order, 'approved')}
                className="px-2 py-0.5 bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white rounded text-[8px] font-bold font-sans transition-all cursor-pointer border border-teal-200"
              >
                อนุมัติ PR/PO →
              </button>
            )}

            {order.status === 'approved' && (
              <button
                onClick={() => initiateStatusTransition(order, 'paid')}
                className="px-2 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded text-[8px] font-bold font-sans transition-all cursor-pointer border border-indigo-200"
              >
                โอนเงินเรียบร้อย →
              </button>
            )}

            {order.status === 'paid' && (
              <button
                onClick={() => openIntakeModal(order)}
                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[8px] font-bold font-sans transition-all cursor-pointer flex items-center gap-0.5 shadow-2xs"
              >
                <PackageCheck className="h-3 w-3" />
                <span>รับของเข้าคลัง →</span>
              </button>
            )}

            <div className="h-3 w-px bg-slate-200 mx-0.5" />

            <button
              onClick={() => initiateStatusTransition(order, 'cancelled')}
              className="px-1.5 py-0.5 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 transition-all cursor-pointer text-[8px] font-bold"
            >
              ยกเลิก
            </button>

            <button
              onClick={() => handleDeleteOrder(order.id, order.orderTitle)}
              className="p-1 text-slate-300 hover:text-rose-600 rounded hover:bg-slate-50 transition-all cursor-pointer"
              title="ลบ"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Show delete only if completed or cancelled */}
        {(order.status === 'received' || order.status === 'cancelled') && (
          <div className="flex items-center justify-end pt-1">
            <button
              onClick={() => handleDeleteOrder(order.id, order.orderTitle)}
              className="p-1 text-slate-300 hover:text-rose-600 rounded hover:bg-rose-50 transition-all cursor-pointer flex items-center gap-0.5 text-[8px] font-sans font-bold"
            >
              <Trash2 className="h-3 w-3" />
              <span>ลบใบงาน</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div className="space-y-0.5 text-left">
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
            <ShoppingCart className="h-5.5 w-5.5 text-indigo-600" />
            <span>ขอจัดซื้อและติดตามสถานะพัสดุ (Procurement)</span>
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            เปิดคำสั่งพัสดุ ดึงรายการขาดแคลนจาก BOM และติดตามขั้นตอนการส่งมอบสินค้าแบบเรียลไทม์
          </p>
        </div>
        <div className="shrink-0 flex gap-2">
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-3xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{isFormOpen ? 'ปิดฟอร์มขอจัดซื้อ' : 'สร้างคำขอสั่งพัสดุใหม่'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        {/* Total Orders */}
        <div 
          onClick={() => setActiveStatusTab('all')}
          className={`bg-white p-4.5 rounded-xl border transition-all flex items-center gap-3.5 hover:bg-slate-50 cursor-pointer ${
            activeStatusTab === 'all' ? 'border-indigo-500 ring-2 ring-indigo-500/5 bg-indigo-50/10' : 'border-slate-100 shadow-3xs'
          }`}
        >
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg shrink-0">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">ใบขอสั่งซื้อสะสม</p>
              {activeStatusTab === 'all' && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
            </div>
            <h4 className="text-base font-bold text-slate-800 font-mono mt-0.5">{totalOrdersCount} <span className="text-[10px] font-sans text-slate-400 font-normal">รายการ</span></h4>
          </div>
        </div>

        {/* Pending Orders */}
        <div 
          onClick={() => setActiveStatusTab('active')}
          className={`bg-white p-4.5 rounded-xl border transition-all flex items-center gap-3.5 hover:bg-slate-50 cursor-pointer ${
            activeStatusTab === 'active' ? 'border-amber-400 ring-2 ring-amber-400/5 bg-amber-50/10' : 'border-slate-100 shadow-3xs'
          }`}
        >
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">ระหว่างจัดส่ง/ติดตาม</p>
              {activeStatusTab === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
            </div>
            <h4 className="text-base font-bold text-slate-800 font-mono mt-0.5">{pendingCount + inProgressCount} <span className="text-[10px] font-sans text-slate-400 font-normal">รายการ</span></h4>
          </div>
        </div>

        {/* Received / Intake */}
        <div 
          onClick={() => setActiveStatusTab('received')}
          className={`bg-white p-4.5 rounded-xl border transition-all flex items-center gap-3.5 hover:bg-slate-50 cursor-pointer ${
            activeStatusTab === 'received' ? 'border-emerald-500 ring-2 ring-emerald-500/5 bg-emerald-50/10' : 'border-slate-100 shadow-3xs'
          }`}
        >
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <PackageCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">สำเร็จ/รับสต็อกแล้ว</p>
              {activeStatusTab === 'received' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
            </div>
            <h4 className="text-base font-bold text-emerald-700 font-mono mt-0.5">{completedCount} <span className="text-[10px] font-sans text-slate-400 font-normal">รายการ</span></h4>
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-100 shadow-3xs flex items-center gap-3.5 hover:bg-slate-50 transition-all">
          <div className="p-2.5 bg-indigo-50 text-indigo-650 rounded-lg shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">รวมงบประมาณจัดซื้อ</p>
            <h4 className="text-base font-bold text-slate-800 font-mono mt-0.5">฿{totalSpend.toLocaleString('th-TH')}</h4>
          </div>
        </div>
      </div>

      {/* Main workspace layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: Order list, sorting, filters */}
        <div className="flex-grow space-y-4 lg:w-2/3">
          
          {/* Advanced Search, Filters & Sorting Bar */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
                {/* Search input */}
                <div className="relative w-full sm:w-60 shrink-0">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="สืบค้น ชื่อพัสดุ, รหัส, ผู้สั่ง..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white font-sans transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    id="order-search"
                  />
                </div>

                {/* View Mode Segmented Toggle */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
                  <button
                    onClick={() => setViewMode('job')}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-extrabold font-sans transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      viewMode === 'job'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Briefcase className="h-3 w-3" />
                    <span>แยกตาม JOB No.</span>
                  </button>
                  <button
                    onClick={() => setViewMode('all')}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-extrabold font-sans transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      viewMode === 'all'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ShoppingCart className="h-3 w-3" />
                    <span>รายการทั้งหมด</span>
                  </button>
                </div>

                {/* Status Segmented Toggle */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
                  <button
                    onClick={() => setActiveStatusTab('active')}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10.5px] font-black font-sans transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      activeStatusTab === 'active'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="แสดงเฉพาะใบสั่งซื้อพัสดุที่กำลังดำเนินการ 1-5 ขั้นตอน"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>กำลังดำเนินการ ({orders.filter(o => o.status !== 'received' && o.status !== 'cancelled').length})</span>
                  </button>
                  <button
                    onClick={() => setActiveStatusTab('received')}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10.5px] font-black font-sans transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      activeStatusTab === 'received'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="แสดงใบสั่งซื้อพัสดุที่ส่งของสำเร็จและตรวจรับของเข้าคลังเรียบร้อยแล้ว"
                  >
                    <PackageCheck className="h-3.5 w-3.5" />
                    <span>ส่งของสำเร็จ ({orders.filter(o => o.status === 'received').length})</span>
                  </button>
                  <button
                    onClick={() => setActiveStatusTab('all')}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10.5px] font-black font-sans transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      activeStatusTab === 'all'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="แสดงใบสั่งซื้อทั้งหมดในคลังระบบจัดซื้อ"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>ทั้งหมด ({orders.length})</span>
                  </button>
                </div>
              </div>

              {/* Sorting and Sorting Order controls */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end text-xs font-sans">
                <span className="text-slate-400 font-bold text-[10px] uppercase flex items-center gap-1">
                  <ArrowUpDown className="h-3 w-3" /> เรียงตาม:
                </span>
                <select
                  className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 focus:outline-hidden cursor-pointer"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="createdAt">วันที่สั่งซื้อ</option>
                  <option value="totalPrice">ราคารวม</option>
                  <option value="quantity">จำนวนสั่งซื้อ</option>
                </select>
              </div>
            </div>
          </div>
          {isFormOpen && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-in slide-in-from-top-4 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-xs font-black text-slate-800 font-sans flex items-center gap-1.5 uppercase tracking-wider">
                  <Plus className="h-4 w-4 text-indigo-600" />
                  <span>เพิ่มคำขออนุมัติสั่งพัสดุใหม่</span>
                </h3>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-700">ชื่อผู้ขอสั่งซื้อ / แผนกผู้รับผิดชอบ *</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                          <User className="h-3.5 w-3.5" />
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="เช่น คุณกมลวรรณ (แผนกควบคุมคุณภาพ)"
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs"
                          value={requesterName}
                          onChange={(e) => setRequesterName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-700">ชื่อคนจัดซื้อ / ผู้ดำเนินการจัดซื้อ</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-400 pointer-events-none">
                          <User className="h-3.5 w-3.5" />
                        </span>
                        <input
                          type="text"
                          placeholder="เช่น สมศักดิ์ (แผนกจัดซื้อ)"
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs"
                          value={purchaserName}
                          onChange={(e) => setPurchaserName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-extrabold text-slate-700">ผูกเชื่อมกับพัสดุในคลัง</label>
                        <span className="text-[10px] text-slate-400 font-medium font-sans">เพื่อสแกนและนำเข้าสะดวก</span>
                      </div>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs font-sans cursor-pointer"
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                      >
                        <option value="">-- สั่งพัสดุชิ้นใหม่ภายนอก (ไม่มีในระบบสต็อก) --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.sku ? `[${p.sku}]` : ''} - คงเหลือ {p.quantity} {p.unit || 'ชิ้น'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-700">ชื่อรายการพัสดุที่ขอสั่งซื้อ *</label>
                      <input
                        type="text"
                        required
                        placeholder="ระบุชื่ออุปกรณ์ แบรนด์ หรือรุ่นของพัสดุ"
                        className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs"
                        value={orderTitle}
                        onChange={(e) => setOrderTitle(e.target.value)}
                        disabled={!!selectedProductId}
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-3">
                    {/* Job details (Job.No and Job.Name) requested by the user */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-extrabold text-slate-700">Job.No (หมายเลขงาน)</label>
                        <input
                          type="text"
                          placeholder="เช่น Job-2024-001"
                          className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs"
                          value={jobNo}
                          onChange={(e) => setJobNo(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-extrabold text-slate-700">Job.Name (ชื่องาน)</label>
                        <input
                          type="text"
                          placeholder="เช่น ระบบควบคุมเครื่องจักร"
                          className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs"
                          value={jobName}
                          onChange={(e) => setJobName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-extrabold text-slate-700">จำนวนที่ขอสั่ง *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs font-mono font-bold"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-extrabold text-slate-700">หน่วยนับ</label>
                        <input
                          type="text"
                          placeholder="เช่น ม้วน, กล่อง, ตัว"
                          className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          disabled={!!selectedProductId}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-700">ราคาประมาณการต่อหน่วย (บาท)</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="ระบุราคาต้นทุนต่อหน่วย เช่น 350"
                        className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs font-mono font-bold text-indigo-900"
                        value={pricePerUnit || ''}
                        onChange={(e) => setPricePerUnit(Math.max(0, parseFloat(e.target.value) || 0))}
                      />
                    </div>

                    {pricePerUnit > 0 && (
                      <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/50 flex items-center justify-between font-sans">
                        <span className="text-slate-500 font-bold text-[10px] uppercase">ยอดราคารวมโดยประมาณ</span>
                        <span className="font-mono text-xs font-black text-indigo-700">
                          ฿{(pricePerUnit * quantity).toLocaleString('th-TH')}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-700">ข้อมูลลิงก์ผู้จัดจำหน่าย / หมายเหตุเพิ่มเติม</label>
                      <input
                        type="text"
                        placeholder="เช่น ลิงก์ร้านค้า Lazada, บจก. ซัพพลายเออร์, ต้องการด่วนก่อนวันศุกร์"
                        className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-bold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>บันทึกส่งคำสั่งซื้อ</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Order Cards/List */}
          {loading ? (
            <div className="py-20 text-center bg-white border border-slate-150 rounded-2xl">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-xs text-slate-400 font-sans">กำลังดึงฐานข้อมูลการสั่งซื้อและติดตามของ...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white border border-slate-150 rounded-2xl py-16 px-6 text-center shadow-2xs">
              <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto text-slate-300 mb-4 border border-slate-100">
                <ShoppingCart className="h-10 w-10" />
              </div>
              <h3 className="text-sm font-black text-slate-700 font-sans">ไม่พบบันทึกการขอสั่งพัสดุ</h3>
              <p className="text-xs text-slate-400 font-sans mt-1 max-w-sm mx-auto leading-relaxed">
                ยังไม่มีข้อมูลการขอสั่งซื้อพัสดุใดๆ ในหน่วยงาน หรือไม่มีใบสั่งซื้อที่ตรงกับตัวกรองสืบค้นปัจจุบันของคุณ
              </p>
              {!isFormOpen && (
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 mx-auto cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  <Plus className="h-4 w-4" />
                  <span>สร้างใบงานขอจัดซื้อใบแรก</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {viewMode === 'job' ? (
                groupedJobs.map(group => {
                  const key = group.jobNo || 'UNASSIGNED';
                  const isCollapsed = collapsedJobs.includes(key);
                  const totalJobSpend = group.orders
                    .filter(o => o.status !== 'cancelled' && o.totalPrice)
                    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
                  
                  return (
                    <div key={key} className="bg-slate-50 rounded-2xl border border-slate-200/60 p-3.5 space-y-3">
                      {/* Job Header */}
                      <div 
                        onClick={() => toggleJobCollapsed(group.jobNo)}
                        className="flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                            <Briefcase className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-800 font-sans">
                                {group.jobNo ? `Job No: ${group.jobNo}` : 'ทั่วไป / ไม่ระบุ Job No.'}
                              </span>
                              <span className="text-[10px] bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded-full font-bold font-mono">
                                {group.orders.length} รายการ
                              </span>
                            </div>
                            {group.jobName && (
                              <p className="text-[10.5px] text-slate-500 font-sans font-bold">
                                ชื่องาน: {group.jobName}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {totalJobSpend > 0 && (
                            <div className="text-right">
                              <span className="text-[8px] text-slate-400 font-bold block leading-none">งบประมาณ</span>
                              <span className="text-xs font-black text-indigo-600">
                                ฿{totalJobSpend.toLocaleString('th-TH')}
                              </span>
                            </div>
                          )}
                          <div className="p-1 hover:bg-slate-200/50 rounded-lg text-slate-500 transition-all shrink-0">
                            {isCollapsed ? (
                              <Plus className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Job Orders List */}
                      {!isCollapsed && (
                        <div className="space-y-2.5 pt-1.5 border-t border-slate-200/40 animate-in fade-in duration-200">
                          {group.orders.map(order => renderOrderCard(order))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="space-y-2.5">
                  {filteredOrders.map(order => renderOrderCard(order))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Side Info & Corporate Guidelines */}
        <div className="w-full lg:w-1/3 shrink-0 space-y-4">
          
          {/* Create Form Sticky block if not inline-open */}
          {!isFormOpen && (
            <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-xs font-black text-slate-800 font-sans flex items-center gap-1.5 uppercase tracking-wider">
                  <ShoppingCart className="h-4 w-4 text-indigo-600" />
                  <span>เพิ่มคำขอจัดซื้อสินค้า</span>
                </h3>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-4 text-xs font-sans">
                {/* Requester name */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">ชื่อผู้ขอสั่งซื้อ / แผนกงาน *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                      <User className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="เช่น สมศักดิ์ (QC), บัญชี"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs"
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Purchaser Name */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">ชื่อคนจัดซื้อ / ผู้ดำเนินการจัดซื้อ</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-400 pointer-events-none">
                      <User className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="เช่น สมศักดิ์ (แผนกจัดซื้อ)"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs"
                      value={purchaserName}
                      onChange={(e) => setPurchaserName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Associate with product in inventory */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">เชื่อมโยงกับสินค้าในคลัง</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs font-sans cursor-pointer"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                  >
                    <option value="">-- ไม่ระบุ (พัสดุภายนอก) --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} คงเหลือ {p.quantity} {p.unit || 'ชิ้น'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Order item name / title */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">ชื่อพัสดุที่ขอจัดซื้อ *</label>
                  <input
                    type="text"
                    required
                    placeholder="ระบุชื่อพัสดุ อุปกรณ์ หรือชิ้นส่วน"
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs"
                    value={orderTitle}
                    onChange={(e) => setOrderTitle(e.target.value)}
                    disabled={!!selectedProductId}
                  />
                </div>

                {/* Quantity, Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">จำนวนสั่ง *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs font-mono font-bold"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">หน่วยนับ</label>
                    <input
                      type="text"
                      placeholder="ชิ้น, ชุด, ม้วน"
                      className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      disabled={!!selectedProductId}
                    />
                  </div>
                </div>

                {/* Price Per Unit */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">ราคาทุนโดยประมาณต่อหน่วย (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="ระบุราคาทุนต่อหน่วย"
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs font-mono"
                    value={pricePerUnit || ''}
                    onChange={(e) => setPricePerUnit(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>บันทึกใบขอสั่งซื้อ</span>
                </button>
              </form>
            </div>
          )}

          {/* Corporate Purchase Guideline Cards */}
          <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xs">
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Building className="h-4 w-4" />
              <span>คู่มือการจัดซื้อสำหรับพนักงาน</span>
            </h4>
            <div className="text-[11px] text-slate-300 space-y-2.5 leading-relaxed font-sans">
              <div className="flex gap-2">
                <span className="text-indigo-400 font-extrabold">1.</span>
                <p><strong>บันทึกใบขออนุมัติ:</strong> กรอกรายละเอียดผู้สั่ง ชื่อพัสดุ และราคาทุนต่อหน่วยให้ถูกต้องก่อนบันทึก</p>
              </div>
              <div className="flex gap-2">
                <span className="text-indigo-400 font-extrabold">2.</span>
                <p><strong>อนุมัติและสั่งพัสดุ:</strong> ปรับเปลี่ยนสถานะเป็น <span className="text-blue-300 font-bold">สั่งของแล้ว</span> เมื่อฝ่ายจัดซื้อออกใบสั่งซื้อ (PO) จริงแก่ซัพพลายเออร์</p>
              </div>
              <div className="flex gap-2">
                <span className="text-indigo-400 font-extrabold">3.</span>
                <p><strong>ติดตามการขนส่ง:</strong> อัปเดตสถานะเป็น <span className="text-indigo-300 font-bold">กำลังจัดส่ง</span> เพื่ออำนวยความสะดวกแก่ฝ่ายคลังพัสดุในการเตรียมพื้นที่จัดเก็บ</p>
              </div>
              <div className="flex gap-2">
                <span className="text-indigo-400 font-extrabold">4.</span>
                <p><strong>รับของและสแกนเข้าสต็อก:</strong> เมื่อของจัดส่งถึงบริษัท กดปุ่ม <span className="text-emerald-400 font-bold">รับของเข้าคลัง</span> ตรวจนับจำนวนจริงเพื่อเพิ่มเข้าสต็อกคลังกลางโดยอัตโนมัติ</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Professional Corporate Edit Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-indigo-600" />
                <span>แก้ไขใบขอเสนอจัดซื้อพัสดุ (Edit Order Requisition)</span>
              </h3>
              <button 
                onClick={() => setEditingOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-sans">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Requester name */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">ชื่อผู้เสนอขอสั่งซื้อ *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                    value={editRequesterName}
                    onChange={(e) => setEditRequesterName(e.target.value)}
                  />
                </div>

                {/* Purchaser name */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">ชื่อคนจัดซื้อ / ผู้เสนอจัดซื้อ</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-bold text-indigo-900"
                    value={editPurchaserName}
                    onChange={(e) => setEditPurchaserName(e.target.value)}
                    placeholder="ยังไม่ได้ระบุ"
                  />
                </div>

                {/* Status selector */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">สถานะติดตามการซื้อ *</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-sans cursor-pointer"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                  >
                    <option value="pending">1. ขอซื้อ (Pending)</option>
                    <option value="quotation">2. ขอใบเสนอราคา (Quotation)</option>
                    <option value="ordered">3. เปิด PR/PO (Ordered)</option>
                    <option value="approved">4. อนุมัติ PR/PO (Approved)</option>
                    <option value="paid">5. โอนเงินแล้ว (Paid)</option>
                    <option value="received">6. ส่งของสำเร็จ/รับเข้าคลัง (Received)</option>
                    <option value="cancelled">ยกเลิกรายการสั่ง (Cancelled)</option>
                  </select>
                </div>

                {/* Job No */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Job.No (หมายเลขงาน)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                    value={editJobNo}
                    onChange={(e) => setEditJobNo(e.target.value)}
                    placeholder="เช่น Job-2024-001"
                  />
                </div>

                {/* Job Name */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-extrabold text-slate-700">Job.Name (ชื่องาน)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                    value={editJobName}
                    onChange={(e) => setEditJobName(e.target.value)}
                    placeholder="เช่น ระบบควบคุมเครื่องจักร"
                  />
                </div>

                {/* Product in inventory association */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-extrabold text-slate-700">ปรับเปลี่ยนการผูกสินค้าในคลัง</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-sans cursor-pointer"
                    value={editSelectedProductId}
                    onChange={(e) => setEditSelectedProductId(e.target.value)}
                  >
                    <option value="">-- ไม่ระบุ (พัสดุอิสระ / ไม่มีสินค้าในคลังร่วม) --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.sku ? `(${p.sku})` : ''} - คงเหลือ {p.quantity} {p.unit || 'ชิ้น'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Order title */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-extrabold text-slate-700">ชื่อรายการพัสดุที่ขอสั่งซื้อ *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                    value={editOrderTitle}
                    onChange={(e) => setEditOrderTitle(e.target.value)}
                    disabled={!!editSelectedProductId}
                  />
                </div>

                {/* Qty and unit */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">จำนวนที่เสนอซื้อ *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-bold"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">หน่วยนับ</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    disabled={!!editSelectedProductId}
                  />
                </div>

                {/* Price per unit */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-extrabold text-slate-700">ราคาต้นทุนประเมินต่อหน่วย (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-bold text-indigo-900"
                    value={editPricePerUnit || ''}
                    onChange={(e) => setEditPricePerUnit(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>

                {editPricePerUnit > 0 && (
                  <div className="sm:col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-150 flex items-center justify-between">
                    <span className="text-slate-500 font-bold text-[10px] uppercase">ราคารวมหลังแก้ไข</span>
                    <span className="font-mono text-xs font-black text-indigo-700">
                      ฿{(editPricePerUnit * editQuantity).toLocaleString('th-TH')}
                    </span>
                  </div>
                )}

                {/* PR & PO details */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">PR No. (เลขที่ใบขอซื้อ)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                    value={editPrNo}
                    onChange={(e) => setEditPrNo(e.target.value)}
                    placeholder="เช่น PR-2026-0001"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">PO No. (เลขที่ใบสั่งซื้อ)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                    value={editPoNo}
                    onChange={(e) => setEditPoNo(e.target.value)}
                    placeholder="เช่น PO-2026-0001"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Quotation No. (เลขที่ใบเสนอราคา)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                    value={editQuotationNo}
                    onChange={(e) => setEditQuotationNo(e.target.value)}
                    placeholder="เช่น QT-2026-001"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Supplier (ผู้จัดจำหน่าย/ซัพพลายเออร์)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                    value={editSupplier}
                    onChange={(e) => setEditSupplier(e.target.value)}
                    placeholder="เช่น บริษัท อะไหล่ จำกัด"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Approver (ผู้อนุมัติ)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                    value={editApproverName}
                    onChange={(e) => setEditApproverName(e.target.value)}
                    placeholder="ชื่อผู้มีอำนาจอนุมัติ"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Payment Ref (ข้อมูลอ้างอิงการจ่ายเงิน)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                    value={editPaymentRef}
                    onChange={(e) => setEditPaymentRef(e.target.value)}
                    placeholder="เช่น สลิปโอนเงิน / เลขที่บัญชี"
                  />
                </div>

                {/* Remarks */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-extrabold text-slate-700">ลิงก์ผู้ขาย / ข้อตกลงพิเศษ / หมายเหตุ</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-sans"
                    value={editRemark}
                    onChange={(e) => setEditRemark(e.target.value)}
                  />
                </div>

              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  บันทึกการปรับปรุง
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Step Confirmation Modal */}
      {confirmingStatusOrder && confirmingTargetStatus && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-indigo-650" />
                <span>ยืนยันข้อมูลการเปลี่ยนขั้นตอน</span>
              </h3>
              <button 
                onClick={() => {
                  setConfirmingStatusOrder(null);
                  setConfirmingTargetStatus(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmStepSave} className="space-y-4 text-xs font-sans">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <div className="font-bold text-slate-700">รายการ: <span className="text-slate-900 font-extrabold">{confirmingStatusOrder.orderTitle}</span></div>
                <div className="text-[10px] text-slate-500 font-bold">
                  เปลี่ยนสถานะจาก: <span className="text-amber-700">{confirmingStatusOrder.status.toUpperCase()}</span> ➔ <span className="text-emerald-700">{confirmingTargetStatus.toUpperCase()}</span>
                </div>
              </div>

              {confirmingTargetStatus === 'quotation' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">เลขที่ใบเสนอราคา (Quotation No.)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-bold text-slate-800"
                      value={stepQuotationNo}
                      onChange={(e) => setStepQuotationNo(e.target.value)}
                      placeholder="ระบุเลขที่ใบเสนอราคาจากผู้ขาย เช่น QT-2026-044"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">ผู้ขาย / ซัพพลายเออร์ (Supplier)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800"
                      value={stepSupplier}
                      onChange={(e) => setStepSupplier(e.target.value)}
                      placeholder="ระบุชื่อบริษัทร้านค้า/ซัพพลายเออร์"
                    />
                  </div>
                </div>
              )}

              {confirmingTargetStatus === 'ordered' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">เลขที่ใบขอซื้อ (PR No.)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-bold text-slate-800"
                      value={stepPrNo}
                      onChange={(e) => setStepPrNo(e.target.value)}
                      placeholder="เช่น PR-2026-0001"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">เลขที่ใบสั่งซื้อ (PO No.)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-bold text-slate-800"
                      value={stepPoNo}
                      onChange={(e) => setStepPoNo(e.target.value)}
                      placeholder="เช่น PO-2026-0001"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">ผู้ขาย / ซัพพลายเออร์ (Supplier)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800"
                      value={stepSupplier}
                      onChange={(e) => setStepSupplier(e.target.value)}
                      placeholder="ชื่อบริษัทร้านค้า/ซัพพลายเออร์"
                    />
                  </div>
                </div>
              )}

              {confirmingTargetStatus === 'approved' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">ชื่อผู้อนุมัติ (Approver)</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-bold text-slate-800"
                      value={stepApproverName}
                      onChange={(e) => setStepApproverName(e.target.value)}
                      placeholder="ชื่อผู้อนุมัติเอกสารเปิดจัดซื้อ"
                    />
                  </div>
                </div>
              )}

              {confirmingTargetStatus === 'paid' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">ข้อมูลการโอนเงิน / เลขอ้างอิงการจ่ายเงิน (Payment Ref) <span className="text-slate-400 font-bold font-sans text-[10px]">(ไม่บังคับ)</span></label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-mono text-slate-800"
                      value={stepPaymentRef}
                      onChange={(e) => setStepPaymentRef(e.target.value)}
                      placeholder="เช่น โอนผ่านธนาคารกสิกรไทย / สลิปโอนเงิน / เลขอ้างอิงธุรกรรม (ระบุหรือไม่ระบุก็ได้)"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingStatusOrder(null);
                    setConfirmingTargetStatus(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  ยืนยันปรับขั้นตอน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professional Corporate PDF Requisition Reissue Preview Modal (ใบขอสั่งสินค้าบริษัทใหญ่) */}
      {viewingPoOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-250 shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal actions strip */}
            <div className="flex items-center justify-between p-4 border-b border-slate-150 shrink-0">
              <h3 className="text-xs font-black text-slate-800 font-sans flex items-center gap-1.5 uppercase tracking-wider">
                <Printer className="h-4.5 w-4.5 text-indigo-600" />
                <span>ตัวอย่างเอกสารใบขออนุมัติสั่งพัสดุ (Purchase Requisition Preview)</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black font-sans flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>พิมพ์เอกสาร (Print)</span>
                </button>
                <button 
                  onClick={() => setViewingPoOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Document body (Designed to look like real standard corporate paper) */}
            <div className="flex-grow overflow-y-auto p-8 bg-slate-50 font-sans">
              
              <div className="bg-white p-8 border border-slate-300 shadow-md rounded-2xl mx-auto max-w-[210mm] min-h-[297mm] flex flex-col justify-between" id="print-requisition-area">
                
                {/* Letterhead */}
                <div className="space-y-4">
                  
                  <div className="flex justify-between items-start border-b-2 border-indigo-900 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-indigo-900 rounded-lg flex items-center justify-center text-white font-black text-sm">
                          HQ
                        </div>
                        <h2 className="text-base font-black text-slate-900 leading-none">
                          บจก. สต็อกแอนด์อินเวนทอรี สยาม
                        </h2>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        สำนักงานใหญ่: 123 อาคารสยามสแควร์ ชั้น 20 ถ.พระราม 1 เขตปทุมวัน กรุงเทพฯ 10330<br />
                        โทร: 02-123-4567 | อีเมล: procurement@stockinventory.co.th | เลขผู้เสียภาษี: 0105569999881
                      </p>
                    </div>
                    <div className="text-right">
                      <h1 className="text-base font-black text-indigo-900 uppercase tracking-tight">
                        ใบขออนุมัติสั่งพัสดุ
                      </h1>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Purchase Requisition
                      </p>
                    </div>
                  </div>

                  {/* Document Meta Info Table */}
                  <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-250">
                    <div className="space-y-1.5">
                      <p><strong>ผู้ขอเสนอจัดซื้อ (Requester):</strong> {viewingPoOrder.requesterName}</p>
                      <p><strong>ผู้ดำเนินการจัดซื้อ (Purchaser):</strong> {viewingPoOrder.purchaserName || <span className="text-slate-400 italic font-normal">ยังไม่ได้มอบหมาย</span>}</p>
                      <p><strong>แผนกงาน:</strong> แผนกวิศวกรรมและการผลิต (HQ Operations)</p>
                      <p><strong>ประเภทสินค้า:</strong> {viewingPoOrder.productId ? 'พัสดุเชื่อมสต็อกอัตโนมัติ' : 'วัสดุสิ้นเปลือง / พัสดุภายนอก'}</p>
                    </div>
                    <div className="space-y-1.5 text-right md:pr-4">
                      <p><strong>เลขที่ใบขออนุมัติ (PR No.):</strong> <span className="font-mono font-bold text-indigo-900">{getRequisitionNumber(viewingPoOrder)}</span></p>
                      <p><strong>วันที่ออกเอกสาร:</strong> {formatDate(viewingPoOrder.createdAt)}</p>
                      <p><strong>สถานะเอกสารปัจจุบัน:</strong> <span className="font-bold text-indigo-600 underline">{viewingPoOrder.status.toUpperCase()}</span></p>
                    </div>
                  </div>

                  {/* Document Items Table */}
                  <div className="pt-4 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      รายการสินค้าที่ขออนุมัติสั่งซื้อ (Itemized Requisition Details)
                    </p>
                    <table className="w-full border-collapse text-left text-[11px] text-slate-700 border border-slate-200">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-250 text-slate-800 font-bold">
                          <th className="py-2 px-3 text-center w-12 border-r border-slate-200">No.</th>
                          <th className="py-2 px-3 border-r border-slate-200">รายละเอียดสินค้า / พัสดุ</th>
                          <th className="py-2 px-3 text-center w-24 border-r border-slate-200">จำนวนสั่ง</th>
                          <th className="py-2 px-3 text-right w-28 border-r border-slate-200">ราคาประเมิน/หน่วย</th>
                          <th className="py-2 px-3 text-right w-32">จำนวนเงินรวม (บาท)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="py-4 px-3 text-center font-mono border-r border-slate-200">01</td>
                          <td className="py-4 px-3 border-r border-slate-200">
                            <p className="font-extrabold text-slate-900 leading-tight">{viewingPoOrder.orderTitle}</p>
                            {viewingPoOrder.productId && (
                              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">ID คลังพัสดุ: {viewingPoOrder.productId}</p>
                            )}
                            {viewingPoOrder.remark && (
                              <p className="text-[10px] text-slate-500 italic mt-1 font-sans">หมายเหตุผู้จัดซื้อ: {viewingPoOrder.remark}</p>
                            )}
                          </td>
                          <td className="py-4 px-3 text-center border-r border-slate-200 font-extrabold text-slate-800">
                            {viewingPoOrder.quantity} {viewingPoOrder.unit || 'ชิ้น'}
                          </td>
                          <td className="py-4 px-3 text-right border-r border-slate-200 font-mono font-bold text-slate-700">
                            {viewingPoOrder.pricePerUnit ? `฿${viewingPoOrder.pricePerUnit.toLocaleString('th-TH')}` : 'ไม่ระบุ'}
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-black text-indigo-950">
                            {viewingPoOrder.totalPrice ? `฿${viewingPoOrder.totalPrice.toLocaleString('th-TH')}` : 'ไม่ระบุ'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Price Calculations */}
                  {viewingPoOrder.totalPrice && (
                    <div className="flex justify-end pt-4">
                      <div className="w-64 space-y-1.5 text-[11px] text-slate-700">
                        <div className="flex justify-between">
                          <span className="text-slate-500">ยอดรวมไม่รวมภาษี (Subtotal):</span>
                          <span className="font-mono font-bold">฿{(viewingPoOrder.totalPrice * 0.93).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ภาษีมูลค่าเพิ่ม VAT 7%:</span>
                          <span className="font-mono font-bold">฿{(viewingPoOrder.totalPrice * 0.07).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1.5 text-xs font-black text-indigo-900">
                          <span>ยอดรวมสุทธิ (Grand Total):</span>
                          <span className="font-mono">฿{viewingPoOrder.totalPrice.toLocaleString('th-TH')}</span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Corporate Signature Boxes */}
                <div className="pt-20">
                  <div className="grid grid-cols-3 gap-4 text-[10px] text-slate-600 text-center">
                    
                    {/* Requester sign */}
                    <div className="space-y-4">
                      <div className="border-b border-slate-350 pb-1 h-8 flex items-end justify-center">
                        <span className="font-mono italic text-slate-400 text-[10px]">{viewingPoOrder.requesterName}</span>
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-800">ผู้ขอเสนออนุมัติสั่งพัสดุ</p>
                        <p className="text-[9px] text-slate-400">วันที่: {formatDate(viewingPoOrder.createdAt).split(' น.')[0]}</p>
                      </div>
                    </div>

                    {/* Stock Checker sign */}
                    <div className="space-y-4">
                      <div className="border-b border-slate-350 pb-1 h-8 flex items-end justify-center">
                        {viewingPoOrder.status === 'received' && (
                          <span className="font-mono text-emerald-600 font-black text-[9px] border border-emerald-300 px-1 py-0.5 bg-emerald-50 rounded-sm">VERIFIED ON INTAKE</span>
                        )}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-800">ผู้ตรวจสอบสินค้าคลังกลาง</p>
                        <p className="text-[9px] text-slate-400">วันที่: {viewingPoOrder.receivedAt ? formatDate(viewingPoOrder.receivedAt).split(' น.')[0] : '................................'}</p>
                      </div>
                    </div>

                    {/* Manager Approval sign */}
                    <div className="space-y-4">
                      <div className="border-b border-slate-350 pb-1 h-8 flex items-end justify-center">
                        {viewingPoOrder.status !== 'pending' && viewingPoOrder.status !== 'cancelled' && (
                          <span className="font-mono text-indigo-600 font-black text-[9px] border border-indigo-300 px-1 py-0.5 bg-indigo-50 rounded-sm">APPROVED</span>
                        )}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-800">ผู้อนุมัติการจัดซื้อจัดจ้าง</p>
                        <p className="text-[9px] text-slate-400">วันที่: ................................</p>
                      </div>
                    </div>

                  </div>
                  
                  {/* Footer Terms */}
                  <div className="text-center text-[9px] text-slate-400 pt-10 border-t border-slate-100 mt-10">
                    <p>ใบคำขอนี้ถือเป็นเอกสารภายในของบริษัทฯ การดัดแปลงหรือแก้ไขข้อมูลโดยไม่ได้รับอนุมัติมีโทษตามระเบียบขององค์กร</p>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* Intake / Receipts Confirmation Dialog */}
      {intakeOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-emerald-600" />
                <span>ยืนยันการรับพัสดุเข้าคลังจริง</span>
              </h3>
              <button 
                onClick={() => setIntakeOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans text-slate-700">
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-1.5">
                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">รายการที่จัดซื้อ</p>
                <h4 className="text-sm font-extrabold text-slate-800 font-sans">{intakeOrder.orderTitle}</h4>
                <div className="flex gap-4 text-[11px] text-slate-500 pt-1">
                  <span>ผู้เสนอซื้อ: <strong>{intakeOrder.requesterName}</strong></span>
                  <span>จำนวนตามเอกสาร: <strong>{intakeOrder.quantity} {intakeOrder.unit || 'ชิ้น'}</strong></span>
                </div>
              </div>

              {intakeOrder.productId ? (
                <div className="bg-emerald-50/40 border border-emerald-100 p-3.5 rounded-2xl space-y-2">
                  <div className="flex items-start gap-2 text-emerald-800">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">เชื่อมต่อกับระบบคลังสินค้าโดยตรง</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">เมื่อกดยืนยัน สต็อกของพัสดุในระบบคลังสินค้าจะเพิ่มขึ้นโดยอัตโนมัติ และจะมีการลงบันทึกประวัติการปรับสต็อก (Activity Logs)</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/40 border border-amber-100 p-3.5 rounded-2xl space-y-2">
                  <div className="flex items-start gap-2 text-amber-800">
                    <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">พัสดุภายนอก (ไม่ได้ผูกสต็อก)</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">ใบสั่งซื้อนี้ไม่ได้ระบุรายการพัสดุสต็อกร่วมในฐานข้อมูลคลัง ระบบจะบันทึกสถานะรับของเข้าไว้เป็นหลักฐาน แต่จะไม่มีผลกระทบต่อจำนวนจำนวนสินค้าคงเหลือ</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Intake quantity confirmation input */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800">จำนวนที่ได้รับพัสดุจริง *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-bold"
                    value={intakeQty}
                    onChange={(e) => setIntakeQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <span className="text-slate-500 font-bold shrink-0">{intakeOrder.unit || 'ชิ้น'}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIntakeOrder(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleExecuteIntake}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  ยืนยันนำเข้าสต็อก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
