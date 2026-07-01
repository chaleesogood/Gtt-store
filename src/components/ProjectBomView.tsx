import React, { useState } from 'react';
import { Product, Bom, BomItem, Project } from '../types';
import { 
  FolderKanban, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  X, 
  Search, 
  Briefcase, 
  Info,
  ChevronRight,
  TrendingUp,
  Boxes,
  Loader2,
  Check,
  AlertCircle,
  Tag
} from 'lucide-react';
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

interface ProjectBomViewProps {
  products: Product[];
  boms: Bom[];
  projects: Project[];
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

export default function ProjectBomView({ products, boms, projects, addToast }: ProjectBomViewProps) {
  const [activeTab, setActiveTab] = useState<'projects' | 'boms'>('projects');
  
  // Search / Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<Bom | null>(null);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedBom, setSelectedBom] = useState<Bom | null>(null);

  // BOM Form state
  const [bomName, setBomName] = useState('');
  const [bomDescription, setBomDescription] = useState('');
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [productToAddQty, setProductToAddQty] = useState(1);
  const [bomItemBrand, setBomItemBrand] = useState('');
  const [bomItemUnit, setBomItemUnit] = useState('PCS');
  const [bomItemPrNo, setBomItemPrNo] = useState('');
  const [bomItemRemark, setBomItemRemark] = useState('');
  const [bomItemPrice, setBomItemPrice] = useState(0);

  // Project Form state
  const [projectJobNo, setProjectJobNo] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectBomId, setProjectBomId] = useState('');
  const [projectRequiredQty, setProjectRequiredQty] = useState(1);
  const [projectStatus, setProjectStatus] = useState<Project['status']>('pending');

  const [isDeducting, setIsDeducting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Column width state for resizable table columns
  const [colWidths, setColWidths] = useState<{ [key: string]: number }>({
    no: 48,
    code: 120,
    sku: 250,
    status: 110,
    brand: 110,
    qty: 70,
    unit: 60,
    total: 130,
    price: 110,
    totalPrice: 120,
    prNo: 90,
    poNo: 90,
    remark: 150,
    actions: 60,
  });

  const handleResizeStart = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[colKey] || 100;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setColWidths(prev => ({
        ...prev,
        [colKey]: Math.max(30, startWidth + deltaX)
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Active Worksheet addition state
  const [worksheetSelectedProductId, setWorksheetSelectedProductId] = useState('');
  const [worksheetAddQty, setWorksheetAddQty] = useState(1);
  const [bomViewMultiplier, setBomViewMultiplier] = useState(1);

  const activeBom = selectedBom ? (boms.find(b => b.id === selectedBom.id) || selectedBom) : null;
  const activeProject = selectedProject ? (projects.find(p => p.id === selectedProject.id) || selectedProject) : null;

  // -------------------- BOM HANDLERS --------------------
  const handleOpenAddBom = () => {
    setEditingBom(null);
    setBomName('');
    setBomDescription('');
    setBomItems([]);
    setSelectedProductToAdd('');
    setProductToAddQty(1);
    setBomItemBrand('');
    setBomItemUnit('PCS');
    setBomItemPrNo('');
    setBomItemRemark('');
    setBomItemPrice(0);
    setIsBomModalOpen(true);
  };

  const handleOpenEditBom = (bom: Bom) => {
    setEditingBom(bom);
    setBomName(bom.name);
    setBomDescription(bom.description);
    setBomItems([...bom.items]);
    setSelectedProductToAdd('');
    setProductToAddQty(1);
    setBomItemBrand('');
    setBomItemUnit('PCS');
    setBomItemPrNo('');
    setBomItemRemark('');
    setBomItemPrice(0);
    setIsBomModalOpen(true);
  };

  const handleSelectProductForBom = (productId: string) => {
    setSelectedProductToAdd(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setBomItemBrand(prod.brand || '');
      setBomItemUnit(prod.unit || 'PCS');
      setBomItemPrice(prod.costPrice || prod.price || 0);
    } else {
      setBomItemBrand('');
      setBomItemUnit('PCS');
      setBomItemPrice(0);
    }
  };

  const handleAddProductToBom = () => {
    if (!selectedProductToAdd) return;
    const prod = products.find(p => p.id === selectedProductToAdd);
    if (!prod) return;

    // Check if already in items
    const existingIndex = bomItems.findIndex(item => item.productId === prod.id);
    if (existingIndex > -1) {
      const updated = [...bomItems];
      updated[existingIndex].quantity += productToAddQty;
      updated[existingIndex].brand = bomItemBrand;
      updated[existingIndex].unit = bomItemUnit;
      updated[existingIndex].prNo = bomItemPrNo;
      updated[existingIndex].remark = bomItemRemark;
      updated[existingIndex].priceUnit = bomItemPrice;
      setBomItems(updated);
    } else {
      setBomItems([...bomItems, {
        productId: prod.id,
        productName: prod.name,
        quantity: productToAddQty,
        brand: bomItemBrand,
        unit: bomItemUnit,
        prNo: bomItemPrNo,
        remark: bomItemRemark,
        priceUnit: bomItemPrice
      }]);
    }
    
    setSelectedProductToAdd('');
    setProductToAddQty(1);
    setBomItemBrand('');
    setBomItemUnit('PCS');
    setBomItemPrNo('');
    setBomItemRemark('');
    setBomItemPrice(0);
  };

  const handleRemoveProductFromBom = (productId: string) => {
    setBomItems(bomItems.filter(item => item.productId !== productId));
  };

  const handleSaveBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomName.trim()) {
      addToast('warning', 'ข้อมูลไม่สมบูรณ์', 'กรุณาระบุชื่อโครงสร้าง BOM');
      return;
    }
    if (bomItems.length === 0) {
      addToast('warning', 'ข้อมูลไม่สมบูรณ์', 'กรุณาเพิ่มสินค้า/วัตถุดิบอย่างน้อย 1 รายการใน BOM');
      return;
    }

    try {
      const bomId = editingBom ? editingBom.id : `bom-${Math.random().toString(36).substring(2, 9)}`;
      const savedBom: Bom = {
        id: bomId,
        name: bomName,
        description: bomDescription,
        items: bomItems,
        createdAt: editingBom ? editingBom.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'boms', bomId), savedBom);
      addToast('success', editingBom ? 'อัปเดต BOM สำเร็จ' : 'บันทึก BOM สำเร็จ', `บันทึกสูตรสินค้า ${bomName} ลงในฐานข้อมูลคลังแล้ว`);
      setIsBomModalOpen(false);
    } catch (err: any) {
      addToast('warning', 'บันทึกข้อมูลไม่สำเร็จ', err.message);
    }
  };

  const handleDeleteBom = async (id: string, name: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโครงสร้าง BOM: "${name}"?`)) {
      try {
        await deleteDoc(doc(db, 'boms', id));
        addToast('success', 'ลบ BOM สำเร็จ', `ลบสูตร ${name} ออกจากฐานข้อมูลเรียบร้อยแล้ว`);
        if (selectedBom?.id === id) setSelectedBom(null);
      } catch (err: any) {
        addToast('warning', 'ลบข้อมูลล้มเหลว', err.message);
      }
    }
  };

  const handleAddBomItem = async (bomId: string, productId: string, quantity: number = 1) => {
    const bom = boms.find(b => b.id === bomId);
    if (!bom) return;

    if (bom.items.some(item => item.productId === productId)) {
      addToast('warning', 'มีรายการนี้อยู่แล้ว', 'สินค้าชิ้นนี้ถูกกำหนดในสูตร BOM นี้อยู่แล้ว');
      return;
    }

    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const newItem: BomItem = {
      productId: prod.id,
      productName: prod.name,
      quantity: quantity,
      unit: prod.unit || 'PCS',
      brand: prod.brand || '',
      priceUnit: prod.costPrice ?? prod.price ?? 0,
      prNo: '',
      poNo: '',
      remark: ''
    };

    const updatedItems = [...bom.items, newItem];

    try {
      await updateDoc(doc(db, 'boms', bomId), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
      addToast('success', 'เพิ่มพัสดุสำเร็จ', `เพิ่ม "${prod.name}" เข้าสูตร BOM เรียบร้อยแล้ว`);
      setWorksheetSelectedProductId('');
      setWorksheetAddQty(1);
    } catch (err: any) {
      addToast('warning', 'เกิดข้อผิดพลาดในการเพิ่มพัสดุ', err.message);
    }
  };

  const handleUpdateBomItem = async (bomId: string, itemIndex: number, field: keyof BomItem, value: any) => {
    const bom = boms.find(b => b.id === bomId);
    if (!bom) return;

    const updatedItems = [...bom.items];
    const item = { ...updatedItems[itemIndex] };

    if (field === 'quantity') {
      item.quantity = Math.max(1, parseInt(value) || 1);
    } else if (field === 'priceUnit') {
      item.priceUnit = Math.max(0, parseFloat(value) || 0);
    } else {
      // @ts-ignore
      item[field] = value;
    }

    updatedItems[itemIndex] = item;

    try {
      await updateDoc(doc(db, 'boms', bomId), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
      addToast('success', 'บันทึกค่าสำเร็จ', `อัปเดตข้อมูลพัสดุเรียบร้อยแล้ว`);
    } catch (err: any) {
      addToast('warning', 'เกิดข้อผิดพลาดในการอัปเดต', err.message);
    }
  };

  const handleUpdateProjectRequiredQty = async (projectId: string, newQty: number) => {
    const qty = Math.max(1, newQty);
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        requiredQuantity: qty,
        updatedAt: new Date().toISOString()
      });
      addToast('success', 'ปรับปรุงจำนวนชุดสำเร็จ', `เปลี่ยนจำนวนสั่งผลิตประกอบเป็น ${qty} ชุดแล้ว`);
    } catch (err: any) {
      addToast('warning', 'ไม่สามารถปรับปรุงจำนวนชุดได้', err.message);
    }
  };

  const handleRemoveBomItemByIndex = async (bomId: string, itemIndex: number) => {
    const bom = boms.find(b => b.id === bomId);
    if (!bom) return;

    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแถวสินค้าพัสดุนี้จากสูตรประกอบ BOM?`)) {
      const updatedItems = [...bom.items];
      const removedItemName = updatedItems[itemIndex].productName;
      updatedItems.splice(itemIndex, 1);

      try {
        await updateDoc(doc(db, 'boms', bomId), {
          items: updatedItems,
          updatedAt: new Date().toISOString()
        });
        addToast('success', 'ลบสินค้าสำเร็จ', `นำพัสดุ "${removedItemName}" ออกเรียบร้อยแล้ว`);
      } catch (err: any) {
        addToast('warning', 'เกิดข้อผิดพลาดในการลบ', err.message);
      }
    }
  };

  const handleCreateSampleM580Bom = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);

      // 1. Write Products
      const sampleProducts = [
        {
          id: 'prod-schneider-cpu',
          sku: 'BMEP582020',
          name: 'M580 CPU MODULE',
          category: 'cat-1',
          price: 15500.00,
          costPrice: 12385.75,
          quantity: 10,
          minAlert: 2,
          image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300&auto=format&fit=crop&q=60',
          description: 'M580 CPU module with Ethernet backplane support',
          brand: 'SCHNEIDER',
          unit: 'PCS',
          supplier: 'Schneider Electric Thailand',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'prod-schneider-base',
          sku: 'BMEXBP0800',
          name: 'M580 PLC BASE 8 SLOT',
          category: 'cat-1',
          price: 750.00,
          costPrice: 500.00,
          quantity: 10,
          minAlert: 2,
          image: 'https://images.unsplash.com/photo-1597484211616-39171f23c72a?w=300&auto=format&fit=crop&q=60',
          description: 'Modicon X80 I/O backplane 8 slots for Ethernet configurations',
          brand: 'SCHNEIDER',
          unit: 'PCS',
          supplier: 'Schneider Electric Thailand',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'prod-schneider-io',
          sku: 'BMXAMM0600',
          name: 'Module NLC-IO-6I-04QTP-01A Analogue',
          category: 'cat-1',
          price: 10500.00,
          costPrice: 8000.00,
          quantity: 10,
          minAlert: 2,
          image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&auto=format&fit=crop&q=60',
          description: 'Modicon mixed analog input/output module with 4 channels input / 2 channels output',
          brand: 'SCHNEIDER',
          unit: 'PCS',
          supplier: 'Schneider Electric Thailand',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      for (const p of sampleProducts) {
        batch.set(doc(db, 'products', p.id), p);
      }

      // 2. Write BOM
      const sampleBom: Bom = {
        id: 'bom-m580-sample',
        name: 'ตู้คอนโทรล Schneider Modicon M580 (BOM ตัวอย่างใบสั่งงาน)',
        description: 'โครงสร้างรายการพัสดุและวิเคราะห์ต้นทุนประกอบระบบ CPU, Rack Base, I/O สำหรับตู้ควบคุม PLC อัจฉริยะ',
        items: [
          {
            productId: 'prod-schneider-cpu',
            productName: 'M580 CPU MODULE',
            quantity: 1,
            unit: 'PCS',
            brand: 'SCHNEIDER',
            prNo: 'P.R-GTT2605-0794',
            remark: 'ขอราคาแล้ว',
            priceUnit: 12385.75
          },
          {
            productId: 'prod-schneider-base',
            productName: 'M580 PLC BASE 8 SLOT',
            quantity: 1,
            unit: 'PCS',
            brand: 'SCHNEIDER',
            prNo: 'P.R-GTT2605-0794',
            remark: 'ขอราคาแล้ว',
            priceUnit: 500.00
          },
          {
            productId: 'prod-schneider-io',
            productName: 'Module NLC-IO-6I-04QTP-01A Analogue',
            quantity: 1,
            unit: 'PCS',
            brand: 'SCHNEIDER',
            prNo: 'P.R-GTT2605-0794',
            remark: 'ขอราคาแล้ว',
            priceUnit: 8000.00
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      batch.set(doc(db, 'boms', sampleBom.id), sampleBom);

      // 3. Write Project
      const sampleProject: Project = {
        id: 'proj-m580-sample',
        jobNo: 'JOB-GTT2605',
        name: 'งานประกอบตู้ไฟฟ้าควบคุม PLC M580 (2 เซ็ต)',
        description: 'งานประกอบและเชื่อมต่อโครงสร้างระบบคอนโทรลเลอร์ Modicon M580 ตามใบงานสั่งผลิต (ต้องการทั้งหมด 2 ชุด)',
        status: 'pending',
        bomId: 'bom-m580-sample',
        requiredQuantity: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stockDeducted: false
      };
      batch.set(doc(db, 'projects', sampleProject.id), sampleProject);

      await batch.commit();
      addToast('success', 'โหลดข้อมูลตัวอย่างสำเร็จ!', 'สร้าง 3 สินค้าชิ้นส่วนหลัก, 1 สูตร BOM และ 1 ใบโปรเจ็ค (Job No: JOB-GTT2605) เรียบร้อยแล้ว');
      setSelectedProject(sampleProject);
    } catch (err: any) {
      addToast('warning', 'โหลดข้อมูลตัวอย่างไม่สำเร็จ', err.message);
    } finally {
      setIsSeeding(false);
    }
  };


  // -------------------- PROJECT HANDLERS --------------------
  const handleOpenAddProject = () => {
    setEditingProject(null);
    setProjectJobNo('');
    setProjectName('');
    setProjectDescription('');
    setProjectBomId(boms[0]?.id || '');
    setProjectRequiredQty(1);
    setProjectStatus('pending');
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (proj: Project) => {
    setEditingProject(proj);
    setProjectJobNo(proj.jobNo || '');
    setProjectName(proj.name);
    setProjectDescription(proj.description);
    setProjectBomId(proj.bomId);
    setProjectRequiredQty(proj.requiredQuantity);
    setProjectStatus(proj.status);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      addToast('warning', 'ข้อมูลไม่สมบูรณ์', 'กรุณาระบุชื่อโปรเจ็ค');
      return;
    }

    try {
      const projId = editingProject ? editingProject.id : `proj-${Math.random().toString(36).substring(2, 9)}`;
      const savedProject: Project = {
        id: projId,
        jobNo: projectJobNo,
        name: projectName,
        description: projectDescription,
        status: projectStatus,
        bomId: projectBomId,
        requiredQuantity: projectRequiredQty,
        createdAt: editingProject ? editingProject.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: projectStatus === 'completed' ? new Date().toISOString() : (editingProject?.completedAt || undefined),
        stockDeducted: editingProject ? (editingProject.stockDeducted || false) : false
      };

      await setDoc(doc(db, 'projects', projId), savedProject);
      addToast('success', editingProject ? 'อัปเดตโปรเจ็คสำเร็จ' : 'สร้างโปรเจ็คใหม่สำเร็จ', `บันทึกโครงการ ${projectName} เรียบร้อยแล้ว`);
      setIsProjectModalOpen(false);
    } catch (err: any) {
      addToast('warning', 'ทำรายการไม่สำเร็จ', err.message);
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจ็ค: "${name}"?`)) {
      try {
        await deleteDoc(doc(db, 'projects', id));
        addToast('success', 'ลบโปรเจ็คเรียบร้อย', `ลบโครงการ ${name} แล้ว`);
        if (selectedProject?.id === id) setSelectedProject(null);
      } catch (err: any) {
        addToast('warning', 'ลบข้อมูลล้มเหลว', err.message);
      }
    }
  };

  // -------------------- STOCK DEDUCTION ACTION --------------------
  const handleDeductProjectStock = async (project: Project) => {
    const bom = boms.find(b => b.id === project.bomId);
    if (!bom) {
      addToast('warning', 'ไม่พบสูตร BOM', 'โปรเจ็คนี้ไม่มีโครงสร้างสินค้า BOM ที่ถูกต้อง');
      return;
    }

    // 1. Audit stock availability first
    const shortfalls: { productName: string; needed: number; available: number }[] = [];
    bom.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      const needed = item.quantity * project.requiredQuantity;
      const available = p ? p.quantity : 0;
      if (available < needed) {
        shortfalls.push({
          productName: item.productName || p?.name || 'สินค้า',
          needed,
          available
        });
      }
    });

    if (shortfalls.length > 0) {
      const msg = shortfalls.map(s => `- ${s.productName}: ต้องการ ${s.needed} ชิ้น (ในคลังมี ${s.available} ชิ้น)`).join('\n');
      if (!confirm(`⚠️ สต็อกสินค้าไม่พอสำหรับเบิกประกอบรายการดังต่อไปนี้:\n${msg}\n\nคุณยังคงต้องการดำเนินการเบิกประกอบและยอมให้สต็อกติดลบหรือไม่?`)) {
        return;
      }
    } else {
      if (!confirm(`คุณต้องการยืนยัน "เบิกสต็อกสินค้า" จำนวน ${project.requiredQuantity} ชุดสำหรับโปรเจ็ค "${project.name}" หรือไม่? การทำรายการนี้จะหักจำนวนสต็อกจริงทันที`)) {
        return;
      }
    }

    setIsDeducting(true);
    try {
      const batch = writeBatch(db);
      
      // Update each product's stock quantity and write an activity log
      for (const item of bom.items) {
        const prodRef = doc(db, 'products', item.productId);
        const currentProd = products.find(p => p.id === item.productId);
        
        const deductQty = item.quantity * project.requiredQuantity;
        const oldQty = currentProd ? currentProd.quantity : 0;
        const newQty = oldQty - deductQty;

        // 1. Update product quantity
        batch.update(prodRef, {
          quantity: newQty,
          updatedAt: new Date().toISOString()
        });

        // 2. Add Stock activity
        const actId = `act-${Math.random().toString(36).substring(2, 9)}`;
        const actRef = doc(db, 'activities', actId);
        batch.set(actRef, {
          id: actId,
          productId: item.productId,
          productName: item.productName,
          type: 'out',
          quantityChange: -deductQty,
          oldQuantity: oldQty,
          newQuantity: newQty,
          reason: `เบิกตัดยอดประกอบใช้ในโปรเจ็ค: ${project.name}`,
          timestamp: new Date().toISOString()
        });
      }

      // Mark project stockDeducted as true
      const projRef = doc(db, 'projects', project.id);
      batch.update(projRef, {
        stockDeducted: true,
        status: 'in_progress', // auto set to in_progress upon stock deduction
        updatedAt: new Date().toISOString()
      });

      await batch.commit();
      addToast('success', 'เบิกสต็อกสินค้าประกอบสำเร็จ', `หักสต็อกวัตถุดิบ ${bom.items.length} รายการสำหรับ ${project.name} เรียบร้อยแล้ว`);
      
      // Update selected project state
      setSelectedProject(prev => prev && prev.id === project.id ? { ...prev, stockDeducted: true, status: 'in_progress' } : prev);
    } catch (err: any) {
      addToast('warning', 'เกิดข้อผิดพลาดในการตัดสต็อก', err.message);
    } finally {
      setIsDeducting(false);
    }
  };


  // -------------------- STATISTICS & COMPUTATIONS --------------------
  const getBomFinancials = (bom: Bom) => {
    let totalCost = 0;
    let totalRetail = 0;
    bom.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      if (p) {
        totalCost += p.costPrice * item.quantity;
        totalRetail += p.price * item.quantity;
      }
    });
    const profit = totalRetail - totalCost;
    const margin = totalRetail > 0 ? (profit / totalRetail) * 100 : 0;
    return { totalCost, totalRetail, profit, margin };
  };

  const getProjectStatusBadgeClass = (status: Project['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'in_progress':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-100';
    }
  };

  const getProjectStatusLabel = (status: Project['status']) => {
    switch (status) {
      case 'pending': return 'รอดำเนินการ (Pending)';
      case 'in_progress': return 'กำลังทำ (In Progress)';
      case 'completed': return 'ส่งมอบแล้ว (Completed)';
      case 'cancelled': return 'ยกเลิก (Cancelled)';
    }
  };

  // Filter lists
  const filteredBoms = boms.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.jobNo && p.jobNo.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const renderWorksheetCards = (items: any[], requiredQty: number = 1, isProjectView: boolean = false, bomId?: string) => {
    return (
      <div className="space-y-4">
        {/* Add Item form block inside BOM */}
        {bomId && (
          <div id="bom-direct-addition" className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                <Boxes className="h-4 w-4 text-indigo-600" />
                จัดการเพิ่มชิ้นส่วนประกอบเข้าระบบใบงาน (BOM Direct Addition)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">1. เลือกพัสดุในสต็อก:</span>
                <select
                  id="worksheet-product-select"
                  value={worksheetSelectedProductId}
                  onChange={(e) => setWorksheetSelectedProductId(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- ค้นหา/เลือกสินค้าวัตถุดิบ --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku}) [ในคลัง: {p.quantity} {p.unit || 'PCS'}]</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">2. จำนวนต่อชุด:</span>
                <input
                  id="worksheet-qty-input"
                  type="number"
                  min={1}
                  value={worksheetAddQty}
                  onChange={(e) => setWorksheetAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-sans text-center font-bold text-slate-800"
                />
              </div>
              <div className="flex items-end">
                <button
                  id="btn-worksheet-add"
                  type="button"
                  onClick={() => handleAddBomItem(bomId, worksheetSelectedProductId, worksheetAddQty)}
                  disabled={!worksheetSelectedProductId}
                  className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>เพิ่มเข้าใบงาน BOM</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unified Multiplier Controller block */}
        <div id="bom-multiplier-controller" className="bg-gradient-to-r from-indigo-50 to-indigo-100/40 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-left shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider">
              BOM CONFIG
            </span>
          </div>
          <div className="flex items-center gap-2.5 bg-white border border-indigo-200 px-4 py-2 rounded-xl shadow-xs shrink-0">
            <span className="text-xs font-extrabold text-slate-700">จำนวนเครื่อง:</span>
            <input
              type="number"
              min={1}
              value={requiredQty}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value) || 1);
                if (isProjectView && activeProject) {
                  handleUpdateProjectRequiredQty(activeProject.id, val);
                } else {
                  setBomViewMultiplier(val);
                }
              }}
              className="w-20 py-1 px-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-center text-sm font-black text-indigo-700 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs font-black text-indigo-600">เครื่อง (ชุด)</span>
          </div>
        </div>

        {items.length === 0 ? (
          <div id="empty-worksheet" className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
            <Boxes className="h-10 w-10 text-slate-300 mx-auto mb-2 animate-pulse" />
            <p className="text-xs font-bold text-slate-500">ไม่มีรายการชิ้นส่วนพัสดุใน BOM นี้</p>
            <p className="text-[10px] text-slate-400">กรุณาเลือกพัสดุและระบุจำนวนเพื่อบันทึกข้อมูลด้านบน</p>
          </div>
        ) : (
          <div id="worksheet-table-container" className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs bg-white">
            {(() => {
              const activeTableWidth = 
                colWidths.no + 
                colWidths.code + 
                colWidths.sku + 
                (isProjectView ? colWidths.status : 0) + 
                colWidths.brand + 
                colWidths.qty + 
                colWidths.unit + 
                colWidths.total + 
                colWidths.price + 
                colWidths.totalPrice + 
                colWidths.prNo + 
                colWidths.poNo + 
                colWidths.remark + 
                colWidths.actions;

              const renderResizeHandle = (colKey: string) => (
                <div 
                  onMouseDown={(e) => handleResizeStart(colKey, e)}
                  className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-indigo-300/60 active:bg-indigo-500 z-10 select-none group-hover:border-r group-hover:border-indigo-300/40"
                  title="ลากเพื่อปรับขนาดคอลัมน์"
                />
              );

              return (
                <table 
                  className="border-collapse text-left text-xs text-slate-700 font-sans"
                  style={{ width: activeTableWidth, tableLayout: 'fixed' }}
                >
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 text-[10px] font-black uppercase tracking-wider border-b border-slate-200/60">
                      <th 
                        className="py-3 px-3 text-center rounded-tl-2xl relative select-none group border-r border-slate-200/30"
                        style={{ width: colWidths.no, minWidth: colWidths.no, maxWidth: colWidths.no }}
                      >
                        No.
                        {renderResizeHandle('no')}
                      </th>
                      <th 
                        className="py-3 px-3 relative select-none group border-r border-slate-200/30"
                        style={{ width: colWidths.code, minWidth: colWidths.code, maxWidth: colWidths.code }}
                      >
                        Code
                        {renderResizeHandle('code')}
                      </th>
                      <th 
                        className="py-3 px-3 relative select-none group border-r border-slate-200/30"
                        style={{ width: colWidths.sku, minWidth: colWidths.sku, maxWidth: colWidths.sku }}
                      >
                        Name
                        {renderResizeHandle('sku')}
                      </th>
                      {isProjectView && (
                        <th 
                          className="py-3 px-3 relative select-none group border-r border-slate-200/30"
                          style={{ width: colWidths.status, minWidth: colWidths.status, maxWidth: colWidths.status }}
                        >
                          สถานะสต็อก
                          {renderResizeHandle('status')}
                        </th>
                      )}
                      <th 
                        className="py-3 px-3 relative select-none group border-r border-slate-200/30"
                        style={{ width: colWidths.brand, minWidth: colWidths.brand, maxWidth: colWidths.brand }}
                      >
                        BRAND NAME
                        {renderResizeHandle('brand')}
                      </th>
                      <th 
                        className="py-3 px-3 text-center relative select-none group border-r border-slate-200/30"
                        style={{ width: colWidths.qty, minWidth: colWidths.qty, maxWidth: colWidths.qty }}
                      >
                        จำนวน
                        {renderResizeHandle('qty')}
                      </th>
                      <th 
                        className="py-3 px-2 text-center relative select-none group border-r border-slate-200/30"
                        style={{ width: colWidths.unit, minWidth: colWidths.unit, maxWidth: colWidths.unit }}
                      >
                        หน่วย
                        {renderResizeHandle('unit')}
                      </th>
                      <th 
                        className="py-3 px-3 text-center bg-indigo-50/60 font-black text-indigo-900 border-l border-r border-indigo-200/50 shadow-inner relative select-none group"
                        style={{ width: colWidths.total, minWidth: colWidths.total, maxWidth: colWidths.total }}
                      >
                        Total
                        {renderResizeHandle('total')}
                      </th>
                      <th 
                        className="py-3 px-3 relative select-none group border-r border-slate-200/30"
                        style={{ width: colWidths.price, minWidth: colWidths.price, maxWidth: colWidths.price }}
                      >
                        ราคา
                        {renderResizeHandle('price')}
                      </th>
                      <th 
                        className="py-3 px-3 relative select-none group border-r border-slate-200/30"
                        style={{ width: colWidths.totalPrice, minWidth: colWidths.totalPrice, maxWidth: colWidths.totalPrice }}
                      >
                        ราคารวม
                        {renderResizeHandle('totalPrice')}
                      </th>
                      <th 
                        className="py-3 px-3 relative select-none group border-r border-slate-200/30"
                        style={{ width: colWidths.prNo, minWidth: colWidths.prNo, maxWidth: colWidths.prNo }}
                      >
                        PR NO.
                        {renderResizeHandle('prNo')}
                      </th>
                      <th 
                        className="py-3 px-3 relative select-none group border-r border-slate-200/30"
                        style={{ width: colWidths.poNo, minWidth: colWidths.poNo, maxWidth: colWidths.poNo }}
                      >
                        PO NO.
                        {renderResizeHandle('poNo')}
                      </th>
                      <th 
                        className="py-3 px-3 relative select-none group border-r border-slate-200/30"
                        style={{ width: colWidths.remark, minWidth: colWidths.remark, maxWidth: colWidths.remark }}
                      >
                        หมายเหตุ
                        {renderResizeHandle('remark')}
                      </th>
                      <th 
                        className="py-3 px-3 text-center rounded-tr-2xl relative select-none group"
                        style={{ width: colWidths.actions, minWidth: colWidths.actions, maxWidth: colWidths.actions }}
                      >
                        การจัดการ
                        {renderResizeHandle('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const prod = products.find(p => p.id === item.productId);
                      const brand = item.brand || prod?.brand || '-';
                      const sku = prod?.sku || item.productId;
                      const unit = item.unit || prod?.unit || 'PCS';
                      const priceUnit = item.priceUnit ?? prod?.costPrice ?? prod?.price ?? 0;
                      const totalQty = item.quantity * requiredQty;
                      const totalPrice = priceUnit * totalQty;

                      // Check stock availability if in project view
                      let isLowStock = false;
                      if (isProjectView && prod) {
                        isLowStock = prod.quantity < totalQty;
                      }

                      return (
                        <tr 
                          id={`worksheet-row-${item.productId || index}`}
                          key={item.productId || index} 
                          className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${
                            isLowStock ? 'bg-rose-50/10 hover:bg-rose-50/20' : 'even:bg-slate-50/10'
                          }`}
                        >
                          {/* No. */}
                          <td 
                            className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 truncate"
                            style={{ width: colWidths.no, minWidth: colWidths.no, maxWidth: colWidths.no }}
                          >
                            {index + 1}
                          </td>

                          {/* CODE */}
                          <td 
                            className="py-2.5 px-3 font-mono font-bold text-slate-600 text-[11px] truncate" 
                            title={sku}
                            style={{ width: colWidths.code, minWidth: colWidths.code, maxWidth: colWidths.code }}
                          >
                            {sku}
                          </td>

                          {/* Product Name */}
                          <td 
                            className="py-2.5 px-3 font-bold text-slate-800 text-[11px] truncate"
                            title={item.productName}
                            style={{ width: colWidths.sku, minWidth: colWidths.sku, maxWidth: colWidths.sku }}
                          >
                            {bomId ? (
                              <InlineInput
                                value={item.productName}
                                onSave={(val) => handleUpdateBomItem(bomId, index, 'productName', val)}
                                className="font-bold text-[11px] text-slate-800"
                              />
                            ) : (
                              <span>
                                {item.productName}
                              </span>
                            )}
                          </td>

                          {/* Stock Status (if in project view) */}
                          {isProjectView && (
                            <td 
                              className="py-2.5 px-3 truncate"
                              style={{ width: colWidths.status, minWidth: colWidths.status, maxWidth: colWidths.status }}
                            >
                              {prod ? (
                                isLowStock ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 truncate max-w-full">
                                    <AlertCircle className="h-3 w-3 shrink-0" /> ไม่พอ: มี {prod.quantity}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 truncate max-w-full">
                                    <Check className="h-3 w-3 shrink-0" /> พอ: มี {prod.quantity}
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold">ไม่มีข้อมูล</span>
                              )}
                            </td>
                          )}

                          {/* Brand Name */}
                          <td 
                            className="py-2.5 px-3 text-[11px] font-medium text-slate-700 truncate" 
                            title={brand}
                            style={{ width: colWidths.brand, minWidth: colWidths.brand, maxWidth: colWidths.brand }}
                          >
                            <div className="flex items-center gap-1 truncate">
                              <Tag className="h-3 w-3 text-slate-400 shrink-0" />
                              {bomId ? (
                                <InlineInput
                                  value={item.brand || ''}
                                  onSave={(val) => handleUpdateBomItem(bomId, index, 'brand', val)}
                                  placeholder="ระบุยี่ห้อ"
                                  className="font-bold text-slate-700 text-[11px]"
                                />
                              ) : (
                                <span className="truncate">{brand}</span>
                              )}
                            </div>
                          </td>

                          {/* Qty per machine */}
                          <td 
                            className="py-2.5 px-3 text-center truncate"
                            style={{ width: colWidths.qty, minWidth: colWidths.qty, maxWidth: colWidths.qty }}
                          >
                            {bomId ? (
                              <div className="inline-flex items-center justify-center gap-1 bg-slate-50 border border-slate-200 px-1 py-0.5 rounded-md w-full">
                                <InlineInput
                                  type="number"
                                  value={item.quantity}
                                  onSave={(val) => handleUpdateBomItem(bomId, index, 'quantity', val)}
                                  className="font-black font-mono text-xs text-slate-800 text-center w-full min-w-0"
                                />
                              </div>
                            ) : (
                              <span className="font-bold font-mono text-[11px] text-slate-800 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 block truncate">
                                {item.quantity}
                              </span>
                            )}
                          </td>

                          {/* Unit */}
                          <td 
                            className="py-2.5 px-2 text-center text-[10px] font-mono font-bold text-slate-500 truncate"
                            style={{ width: colWidths.unit, minWidth: colWidths.unit, maxWidth: colWidths.unit }}
                          >
                            {unit}
                          </td>

                          {/* Total Qty */}
                          <td 
                            className="py-2.5 px-3 text-center bg-indigo-50/20 font-black text-indigo-700 font-mono text-xs border-l border-r border-indigo-100/40 truncate"
                            style={{ width: colWidths.total, minWidth: colWidths.total, maxWidth: colWidths.total }}
                          >
                            <div className="flex flex-col items-center justify-center leading-none truncate">
                              <span className="font-extrabold text-indigo-700 text-sm truncate">{totalQty} {unit}</span>
                              <span className="text-[9px] text-slate-400 font-bold mt-1 truncate">
                                ({item.quantity} × {requiredQty})
                              </span>
                            </div>
                          </td>

                          {/* Price / Unit */}
                          <td 
                            className="py-2.5 px-3 text-slate-600 font-mono truncate"
                            style={{ width: colWidths.price, minWidth: colWidths.price, maxWidth: colWidths.price }}
                          >
                            {bomId ? (
                              <span className="inline-flex items-center text-[11px] w-full min-w-0">
                                ฿
                                <InlineInput
                                  type="number"
                                  value={priceUnit}
                                  onSave={(val) => handleUpdateBomItem(bomId, index, 'priceUnit', val)}
                                  className="font-bold font-mono text-slate-600 w-full text-[11px]"
                                />
                              </span>
                            ) : (
                              <span className="font-bold text-[11px]">
                                ฿{priceUnit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>

                          {/* Total Price */}
                          <td 
                            className="py-2.5 px-3 font-mono font-extrabold text-slate-800 text-[11px] truncate"
                            style={{ width: colWidths.totalPrice, minWidth: colWidths.totalPrice, maxWidth: colWidths.totalPrice }}
                          >
                            ฿{totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>

                          {/* PR No */}
                          <td 
                            className="py-2.5 px-3 truncate"
                            style={{ width: colWidths.prNo, minWidth: colWidths.prNo, maxWidth: colWidths.prNo }}
                          >
                            {bomId ? (
                              <InlineInput
                                value={item.prNo || ''}
                                onSave={(val) => handleUpdateBomItem(bomId, index, 'prNo', val)}
                                placeholder="-"
                                className="font-mono font-bold text-blue-600 text-[11px]"
                              />
                            ) : (
                              <span className="font-mono font-bold text-blue-600 text-[11px]">{item.prNo || '-'}</span>
                            )}
                          </td>

                          {/* PO No */}
                          <td 
                            className="py-2.5 px-3 truncate"
                            style={{ width: colWidths.poNo, minWidth: colWidths.poNo, maxWidth: colWidths.poNo }}
                          >
                            {bomId ? (
                              <InlineInput
                                value={item.poNo || ''}
                                onSave={(val) => handleUpdateBomItem(bomId, index, 'poNo', val)}
                                placeholder="-"
                                className="font-mono font-medium text-slate-600 text-[11px]"
                              />
                            ) : (
                              <span className="font-mono font-medium text-slate-600 text-[11px]">{item.poNo || '-'}</span>
                            )}
                          </td>

                          {/* Remark */}
                          <td 
                            className="py-2.5 px-3 truncate"
                            style={{ width: colWidths.remark, minWidth: colWidths.remark, maxWidth: colWidths.remark }}
                          >
                            {bomId ? (
                              <InlineInput
                                value={item.remark || ''}
                                onSave={(val) => handleUpdateBomItem(bomId, index, 'remark', val)}
                                placeholder="-"
                                className="font-medium text-indigo-600 text-[11px]"
                              />
                            ) : (
                              <span className="font-medium text-indigo-600 text-[11px]">{item.remark || '-'}</span>
                            )}
                          </td>

                          {/* Delete Action */}
                          <td 
                            className="py-2.5 px-3 text-center truncate"
                            style={{ width: colWidths.actions, minWidth: colWidths.actions, maxWidth: colWidths.actions }}
                          >
                            {bomId && (
                              <button
                                id={`btn-remove-item-${index}`}
                                type="button"
                                onClick={() => handleRemoveBomItemByIndex(bomId, index)}
                                className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                                title="ลบพัสดุออกจาก BOM"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Tab Control & Stats Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl shadow-lg shadow-slate-900/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-indigo-400" />
            <h2 className="text-lg font-bold font-sans">ระบบจัดการแผนงานและวัตถุดิบประกอบ (Projects & BOM)</h2>
          </div>
          <p className="text-xs text-slate-400">บริหารชุดคำสั่งพัสดุและเบิกถอนสต็อกสินค้าสำหรับประกอบโปรเจ็ค</p>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-xl self-start sm:self-center">
          <button 
            onClick={() => { setActiveTab('projects'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'projects' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <Briefcase className="h-4 w-4" />
            ระบบโปรเจ็ค ({projects.length})
          </button>
          <button 
            onClick={() => { setActiveTab('boms'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'boms' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            โครงสร้างสูตรสินค้า BOM ({boms.length})
          </button>
        </div>
      </div>

      {/* Sample BOM Seeding Banner */}
      {!projects.some(p => p.id === 'proj-m580-sample') && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500 text-white rounded-xl">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="space-y-1 text-left">
              <h4 className="text-xs font-bold text-slate-800">มีตัวอย่างใบงาน BOM จากรูปแล้ว!</h4>
              <p className="text-[11px] text-slate-500">คุณสามารถเปิดโครงร่างรายการ BOM ยี่ห้อ SCHNEIDER (M580 CPU, PLC Base, Module Analogue) พร้อมระบบสถิติและการคำนวณอัตโนมัติได้ในคลิกเดียว</p>
            </div>
          </div>
          <button
            onClick={handleCreateSampleM580Bom}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold font-sans transition-all shadow-md cursor-pointer whitespace-nowrap"
          >
            {isSeeding ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                กำลังโหลด...
              </>
            ) : (
              <>
                <span>✨ โหลด BOM ตัวอย่าง</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Full-Width Layout containing Lists */}
      <div className="space-y-5">

          
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'projects' ? 'ค้นหาโปรเจ็ค...' : 'ค้นหาสูตรสินค้า BOM...'}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans placeholder-slate-400 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {activeTab === 'projects' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-44 py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans font-medium text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="pending">รอดำเนินการ (Pending)</option>
                <option value="in_progress">กำลังทำ (In Progress)</option>
                <option value="completed">ส่งมอบแล้ว (Completed)</option>
                <option value="cancelled">ยกเลิก (Cancelled)</option>
              </select>
            )}

            <button
              onClick={activeTab === 'projects' ? handleOpenAddProject : handleOpenAddBom}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold font-sans transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 cursor-pointer flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              {activeTab === 'projects' ? 'สร้างโปรเจ็ค' : 'สร้างสูตร BOM'}
            </button>
          </div>

          {/* Lists */}
          {activeTab === 'projects' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.length === 0 ? (
                <div className="col-span-full bg-white border border-slate-200/80 rounded-2xl py-12 px-6 text-center space-y-3">
                  <Briefcase className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-600">ไม่พบข้อมูลโปรเจ็คที่ระบุ</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">คลิกปุ่ม "สร้างโปรเจ็ค" ด้านบน เพื่อเชื่อมต่อชุดสินค้าประกอบ BOM เข้ากับแผนงานติดตั้งหรือขายของคุณ</p>
                </div>
              ) : (
                filteredProjects.map((project) => {
                  const associatedBom = boms.find(b => b.id === project.bomId);
                  const isDeducted = project.stockDeducted;
                  return (
                    <div 
                      key={project.id}
                      onClick={() => { setSelectedProject(project); setSelectedBom(null); }}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer text-left space-y-4 group relative ${selectedProject?.id === project.id ? 'bg-indigo-50/20 border-indigo-400/80 shadow-md shadow-indigo-600/5' : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-md'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getProjectStatusBadgeClass(project.status)}`}>
                              {getProjectStatusLabel(project.status)}
                            </span>
                            {project.jobNo && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                                Job: {project.jobNo}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{project.name}</h3>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-80 hover:opacity-100" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => handleOpenEditProject(project)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไขโปรเจ็ค"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteProject(project.id, project.name)}
                            className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors cursor-pointer"
                            title="ลบโปรเจ็ค"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 font-sans line-clamp-2 h-8 leading-relaxed">
                        {project.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                      </p>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-sans">
                        <div className="flex flex-col">
                          <span className="text-slate-400">โครงสร้าง BOM:</span>
                          <span className="font-bold text-slate-700">{associatedBom ? associatedBom.name : 'ไม่ได้ผูกสูตร'}</span>
                        </div>

                        <div className="flex flex-col text-right">
                          <span className="text-slate-400">ประกอบ ({project.requiredQuantity} ชุด):</span>
                          {isDeducted ? (
                            <span className="font-bold text-emerald-600 flex items-center gap-1 justify-end">
                              <CheckCircle2 className="h-3.5 w-3.5" /> เบิกสต็อกแล้ว
                            </span>
                          ) : (
                            <span className="font-bold text-amber-600 flex items-center gap-1 justify-end">
                              <AlertCircle className="h-3.5 w-3.5" /> ยังไม่เบิกของ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBoms.length === 0 ? (
                <div className="col-span-full bg-white border border-slate-200/80 rounded-2xl py-12 px-6 text-center space-y-3">
                  <FileSpreadsheet className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-600">ไม่พบสูตรสินค้า BOM ที่ระบุ</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">คลิกปุ่ม "สร้างสูตร BOM" ด้านบน เพื่อออกแบบโครงร่างพัสดุและกำหนดราคากลางสำหรับใช้ในโปรเจ็ค</p>
                </div>
              ) : (
                filteredBoms.map((bom) => {
                  const itemCost = bom.items.reduce((sum, item) => {
                    const prod = products.find(p => p.id === item.productId);
                    const cost = item.priceUnit ?? prod?.costPrice ?? prod?.price ?? 0;
                    return sum + (cost * item.quantity);
                  }, 0);
                  return (
                    <div 
                      key={bom.id}
                      onClick={() => { setSelectedBom(bom); setSelectedProject(null); }}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer text-left space-y-4 group relative ${selectedBom?.id === bom.id ? 'bg-indigo-50/20 border-indigo-400/80 shadow-md shadow-indigo-600/5' : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-md'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">
                            ${bom.items.length} รายการพัสดุ
                          </span>
                          <h3 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">${bom.name}</h3>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-80 hover:opacity-100" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => handleOpenEditBom(bom)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไขสูตร BOM"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteBom(bom.id, bom.name)}
                            className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors cursor-pointer"
                            title="ลบสูตร BOM"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 font-sans line-clamp-2 h-8 leading-relaxed">
                        ${bom.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                      </p>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-sans">
                        <span className="text-slate-400">ต้นทุนวัตถุดิบรวม:</span>
                        <span className="font-bold font-mono text-slate-700">฿${itemCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

      </div>

      {/* -------------------- DETAIL MODAL: PROJECT & BOM WORKSHEET (SHOWS CENTERED ON SCREEN) -------------------- */}
      {(selectedProject || selectedBom) && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-7xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl text-left animate-in zoom-in-95 duration-200 border border-slate-200/80">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-indigo-600 font-mono tracking-wider uppercase">
                  {selectedProject ? 'รายละเอียดโปรเจ็คและวัตถุดิบสำหรับเบิกประกอบ' : 'รายละเอียดโครงสร้างสูตรสินค้า BOM (BOM Recipe)'}
                </span>
                <div className="flex items-center gap-3">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {selectedProject ? activeProject?.name : activeBom?.name}
                  </h3>
                  {selectedProject && activeProject && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getProjectStatusBadgeClass(activeProject.status)}`}>
                      {getProjectStatusLabel(activeProject.status)}
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => { setSelectedProject(null); setSelectedBom(null); }}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable content area */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              
              {/* Info section for Project or BOM */}
              {selectedProject && activeProject && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] text-slate-400 block font-bold font-sans">จำนวนสั่งผลิตประกอบ:</span>
                      <span className="text-sm font-black text-slate-800 font-mono">{activeProject.requiredQuantity} ชุดประกอบ</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] text-slate-400 block font-bold font-sans">หมายเลขสั่งงาน (Job No.):</span>
                      <span className="text-sm font-black text-slate-800 font-mono">{activeProject.jobNo || '-'}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] text-slate-400 block font-bold font-sans">ผู้ประสานงานโครงการ:</span>
                      <span className="text-sm font-bold text-slate-800">{activeProject.customerName || '-'}</span>
                    </div>
                    <div className="col-span-full bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-bold font-sans mb-1">รายละเอียดแผนงานติดตั้ง/เป้าหมายโครงการ:</span>
                      <p className="text-xs text-slate-600 leading-relaxed">{activeProject.description || 'ไม่มีข้อมูลอธิบายรายละเอียดโปรเจ็ค'}</p>
                    </div>
                  </div>

                  {/* Associated BOM Details & Stock Audit */}
                  {(() => {
                    const bom = boms.find(b => b.id === activeProject.bomId);
                    if (!bom) {
                      return (
                        <div className="py-8 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl">
                          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto animate-bounce" />
                          <p className="text-xs font-bold text-slate-600">ไม่มีสูตร BOM กำหนดไว้ในโครงการ</p>
                          <p className="text-[10px] text-slate-400">กรุณาแก้ไขโปรเจ็คและเชื่อมโยงเข้าสูตร BOM วัตถุดิบประกอบ</p>
                        </div>
                      );
                    }

                    // Check stock for the whole project list
                    let allStockAvailable = true;
                    const evaluatedItems = bom.items.map(item => {
                      const p = products.find(prod => prod.id === item.productId);
                      const totalNeeded = item.quantity * activeProject.requiredQuantity;
                      const currentStock = p ? p.quantity : 0;
                      const isSufficient = currentStock >= totalNeeded;
                      if (!isSufficient) allStockAvailable = false;
                      
                      return {
                        ...item,
                        currentStock,
                        totalNeeded,
                        isSufficient,
                        unitPrice: p?.price || 0,
                        unitCost: p?.costPrice || 0
                      };
                    });

                    const projectFinancials = getBomFinancials(bom);

                    return (
                      <div className="space-y-5">
                        {/* Multiplier / Action Box */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-150 bg-slate-50/50">
                          <div className="space-y-1 text-left">
                            <h4 className="text-xs font-bold text-slate-800">การหักสต็อกคลังสินค้าพัสดุสำหรับโครงการ</h4>
                            <p className="text-[10px] text-slate-500">กรุณาตรวจสอบจำนวนพัสดุแต่ละรายการในตาราง BOM Worksheet ด้านล่างก่อนทำรายการเบิก</p>
                          </div>

                          <div className="flex flex-wrap gap-3 items-center">
                            {/* Stock status banner */}
                            {activeProject.stockDeducted ? (
                              <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold border-emerald-200 shadow-xs">
                                <Check className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0" />
                                <span>เบิกพัสดุประกอบและหักคลังสต็อกเรียบร้อยแล้ว</span>
                              </div>
                            ) : (
                              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${allStockAvailable ? 'bg-sky-50 text-sky-800 border-sky-150' : 'bg-rose-50 text-rose-800 border-rose-150'}`}>
                                {allStockAvailable ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 text-sky-600 flex-shrink-0" />
                                    <span>พัสดุครบพร้อมประกอบ</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                                    <span>สต็อกไม่เพียงพอ</span>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Stock deduction button */}
                            {!activeProject.stockDeducted && (
                              <button
                                onClick={() => handleDeductProjectStock(activeProject)}
                                disabled={isDeducting}
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-400 text-white font-bold rounded-xl text-xs font-sans transition-all shadow-md cursor-pointer whitespace-nowrap"
                              >
                                {isDeducting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    กำลังดำเนินการ...
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3 fill-current" />
                                    เบิกวัตถุดิบประกอบ (Deduct Stock)
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Stock items checklist / BOM Worksheet Cards */}
                        <div className="space-y-3 bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
                          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 animate-pulse">
                              <Boxes className="h-4.5 w-4.5 text-indigo-500" /> รายการจัดชุดประกอบพัสดุสำหรับโครงการ (BOM Cards)
                            </span>
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md font-mono font-bold">
                              {evaluatedItems.length} รายการพัสดุ
                            </span>
                          </div>
                          <div>
                            {renderWorksheetCards(evaluatedItems, activeProject.requiredQuantity, true, activeProject.bomId)}
                          </div>
                        </div>

                        {/* Cost summary */}
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-sans">
                          <div className="flex gap-6 items-center text-left">
                            <div>
                              <span className="text-slate-400 block text-[10px]">ต้นทุนวัตถุดิบ/ชุด</span>
                              <span className="font-bold font-mono text-slate-700 text-sm">฿{projectFinancials.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">ราคาประเมินขาย/ชุด</span>
                              <span className="font-bold font-mono text-slate-700 text-sm">฿{projectFinancials.totalRetail.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                          <div className="sm:text-right">
                            <span className="text-slate-400 block text-[10px]">มูลค่าต้นทุนโครงการรวม ({activeProject.requiredQuantity} ชุด)</span>
                            <span className="font-extrabold font-mono text-indigo-600 text-lg">฿{(projectFinancials.totalCost * activeProject.requiredQuantity).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedBom && activeBom && (
                <div className="space-y-5">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold font-sans mb-1">รายละเอียดสูตร / จุดประสงค์:</span>
                    <p className="text-xs text-slate-600 leading-relaxed">{activeBom.description || 'ไม่มีข้อมูลอธิบายสูตร BOM'}</p>
                  </div>

                  {/* Items in BOM / BOM Worksheet Cards */}
                  <div className="space-y-3 bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 animate-pulse">
                        <Boxes className="h-4.5 w-4.5 text-indigo-500" /> รายการจัดชุดวัตถุดิบประกอบ (BOM Recipe Cards)
                      </span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-mono font-bold">
                        {activeBom.items.length} รายการพัสดุ
                      </span>
                    </div>
                    <div>
                      {renderWorksheetCards(activeBom.items, bomViewMultiplier, false, activeBom.id)}
                    </div>
                  </div>

                  {/* Financial calculations */}
                  {(() => {
                    const fin = getBomFinancials(activeBom);
                    const totalCostScaled = fin.totalCost * bomViewMultiplier;
                    const totalRetailScaled = fin.totalRetail * bomViewMultiplier;
                    const profitScaled = fin.profit * bomViewMultiplier;
                    
                    return (
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                        <div className="text-left space-y-0.5">
                          <span className="text-[10px] text-slate-400 block">ต้นทุนวัตถุดิบรวม ({bomViewMultiplier} เครื่อง) (Cost Price)</span>
                          <span className="text-sm font-black text-slate-800 font-mono">฿{totalCostScaled.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-left space-y-0.5">
                          <span className="text-[10px] text-slate-400 block">ราคาประเมินขายรวม ({bomViewMultiplier} เครื่อง) (Retail Price)</span>
                          <span className="text-sm font-black text-slate-800 font-mono">฿{totalRetailScaled.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-indigo-500 block">กำไรขั้นต้นประเมิน ({bomViewMultiplier} เครื่อง) (Margin)</span>
                            <span className="text-sm font-black text-indigo-700 font-mono">฿{profitScaled.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <span className="text-xs font-extrabold text-indigo-600 bg-white px-2.5 py-1 rounded-lg shadow-xs">
                            + {fin.margin.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>

            {/* Footer with Close button */}
            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => { setSelectedProject(null); setSelectedBom(null); }}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs font-sans transition-all cursor-pointer shadow-xs"
              >
                ปิดตารางประกอบพัสดุ
              </button>
            </div>
          </div>
        </div>
      )}



      {/* -------------------- MODAL: BOM FORM -------------------- */}
      {isBomModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-left animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-800">
                {editingBom ? 'แก้ไขสูตร BOM สินค้าสำเร็จรูป' : 'เพิ่มสูตรสินค้าสำเร็จรูป (BOM Recipe)'}
              </h3>
              <button 
                onClick={() => setIsBomModalOpen(false)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveBom} className="flex-grow overflow-y-auto p-6 space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">ชื่อสูตรสินค้า / BOM Name *</label>
                <input
                  type="text"
                  value={bomName}
                  onChange={(e) => setBomName(e.target.value)}
                  placeholder="เช่น ตู้ควบคุมระบบน้ำอัจฉริยะ 3 เฟส, แผง Solar 5kW, เซ็ตไฟหน้าเรือนกระจก"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">คำอธิบายสูตรพ่วง</label>
                <textarea
                  value={bomDescription}
                  onChange={(e) => setBomDescription(e.target.value)}
                  placeholder="อธิบายรายละเอียดการใช้งาน หรือคำแนะนำในการประกอบชุดอุปกรณ์พ่วงนี้..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Items section inside BOM */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Boxes className="h-4 w-4 text-indigo-500" />
                  รายการสินค้าวัตถุดิบพ่วงในเซ็ต:
                </h4>

                {/* Add Item form block */}
                <div className="p-4 bg-white border border-slate-200/60 rounded-2xl space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-3 space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">1. เลือกสินค้าพัสดุในคลัง:</span>
                      <select
                        value={selectedProductToAdd}
                        onChange={(e) => handleSelectProductForBom(e.target.value)}
                        className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
                      >
                        <option value="">-- ค้นหา/เลือกสินค้าสำเร็จรูปหรือชิ้นส่วนประกอบ --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku}) [มี {p.quantity} {p.unit || 'PCS'}]</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">2. จำนวนที่ระบุ:</span>
                      <input
                        type="number"
                        min={1}
                        value={productToAddQty}
                        onChange={(e) => setProductToAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-center font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 border-t border-slate-100">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-medium block">ยี่ห้อ (Brand):</span>
                      <input
                        type="text"
                        value={bomItemBrand}
                        onChange={(e) => setBomItemBrand(e.target.value)}
                        placeholder="เช่น SCHNEIDER"
                        className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-sans focus:outline-hidden"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-medium block">หน่วยนับ (Unit):</span>
                      <input
                        type="text"
                        value={bomItemUnit}
                        onChange={(e) => setBomItemUnit(e.target.value)}
                        placeholder="PCS / SET"
                        className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-sans focus:outline-hidden"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-medium block">ต้นทุนประเมิน/หน่วย:</span>
                      <input
                        type="number"
                        step="any"
                        value={bomItemPrice}
                        onChange={(e) => setBomItemPrice(parseFloat(e.target.value) || 0)}
                        className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono font-bold focus:outline-hidden text-right text-indigo-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-medium block">เลข PR NO.:</span>
                      <input
                        type="text"
                        value={bomItemPrNo}
                        onChange={(e) => setBomItemPrNo(e.target.value)}
                        placeholder="P.R-GTT2605-0794"
                        className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono focus:outline-hidden"
                      />
                    </div>

                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 font-medium block">หมายเหตุ (Remark):</span>
                      <input
                        type="text"
                        value={bomItemRemark}
                        onChange={(e) => setBomItemRemark(e.target.value)}
                        placeholder="เช่น ขอราคาแล้ว"
                        className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-sans focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddProductToBom}
                      disabled={!selectedProductToAdd}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      <span>➕ เพิ่มลงโครงสร้าง BOM</span>
                    </button>
                  </div>
                </div>

                {/* Current BOM items list table */}
                <div className="border border-slate-100 bg-white rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase font-sans border-b border-slate-100">
                        <th className="p-2 pl-3">สินค้า</th>
                        <th className="p-2 text-center w-20">จำนวน</th>
                        <th className="p-2 text-center w-12">ลบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bomItems.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-[11px] text-slate-400 font-sans">
                            ยังไม่มีพัสดุพ่วงในสูตรนี้ กรุณาเพิ่มจากด้านบน
                          </td>
                        </tr>
                      ) : (
                        bomItems.map((item) => (
                          <tr key={item.productId} className="text-xs text-slate-700">
                            <td className="p-2 pl-3 font-medium truncate max-w-[200px]">{item.productName}</td>
                            <td className="p-2 text-center font-bold font-mono">{item.quantity}</td>
                            <td className="p-2 text-center">
                              <button 
                                type="button"
                                onClick={() => handleRemoveProductFromBom(item.productId)}
                                className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBomModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  บันทึกสูตร BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* -------------------- MODAL: PROJECT FORM -------------------- */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl text-left animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-800">
                {editingProject ? 'แก้ไขข้อมูลระบบโปรเจ็ค' : 'เพิ่มโครงการระบบ (Create New Project)'}
              </h3>
              <button 
                onClick={() => setIsProjectModalOpen(false)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveProject} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-600">Job No. (หมายเลขใบงาน)</label>
                  <input
                    type="text"
                    value={projectJobNo}
                    onChange={(e) => setProjectJobNo(e.target.value)}
                    placeholder="เช่น JOB-69001"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">ชื่อโปรเจ็ค / Project Name *</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="เช่น ติดตั้ง Solar Roof House คุณประเสริฐ, งานตู้ MDB อาคารสำนักงานใหญ่"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">รายละเอียดแผนงานติดตั้ง/ส่งมอบ</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="ระบุสถานที่ติดตั้ง รายละเอียดการนัดหมาย ระยะเวลารับประกัน หรือคำอธิบายเพิ่มเติม..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">ผูกสูตรประกอบพัสดุ (BOM Recipe) *</label>
                  <select
                    value={projectBomId}
                    onChange={(e) => setProjectBomId(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  >
                    <option value="">-- กรุณาเลือกสูตรสินค้า BOM --</option>
                    {boms.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">จำนวนชุดประกอบที่ต้องการใช้ *</label>
                  <input
                    type="number"
                    min={1}
                    value={projectRequiredQty}
                    onChange={(e) => setProjectRequiredQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {editingProject && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">สถานะโปรเจ็ค</label>
                  <select
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value as Project['status'])}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-600 focus:outline-hidden"
                  >
                    <option value="pending">รอดำเนินการ (Pending)</option>
                    <option value="in_progress">กำลังทำ (In Progress)</option>
                    <option value="completed">ส่งมอบแล้ว (Completed)</option>
                    <option value="cancelled">ยกเลิก (Cancelled)</option>
                  </select>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {editingProject ? 'บันทึกการแก้ไข' : 'สร้างโปรเจ็คใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
