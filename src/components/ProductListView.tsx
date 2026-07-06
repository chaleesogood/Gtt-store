import React, { useState, useRef } from 'react';
import { Product, Category } from '../types';
import { Search, Filter, Plus, Edit3, Trash2, PlusCircle, MinusCircle, Upload, Eye, EyeOff, X, Image as ImageIcon, ExternalLink, Layers, List, ChevronDown, ChevronUp, ChevronRight, Package } from 'lucide-react';
import CategoryView from './CategoryView';
import { INITIAL_CATEGORIES } from '../initialData';

interface ProductListViewProps {
  products: Product[];
  categories: Category[];
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditProduct: (id: string, updated: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  onAdjustStock: (id: string, change: number, reason: string) => void;
  statusFilter: string;
  onSetStatusFilter: (filter: string) => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onEditCategory: (id: string, updated: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
}

// Curated stock photos for quick selection
const PRESET_IMAGES = [
  { name: 'สมาร์ทโฟน/มือถือ', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=60' },
  { name: 'โน้ตบุ๊ก/คอมพิวเตอร์', url: 'https://images.unsplash.com/photo-1496181130204-755241544e3f?w=300&auto=format&fit=crop&q=60' },
  { name: 'หูฟังไร้สาย', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=60' },
  { name: 'เสื้อยืดแฟชั่น', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=60' },
  { name: 'กระเป๋าเป้สะพายหลัง', url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&auto=format&fit=crop&q=60' },
  { name: 'แก้วน้ำเก็บอุณหภูมิ', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=60' },
  { name: 'อาหารเสริม/ขวดแก้ว', url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300&auto=format&fit=crop&q=60' },
  { name: 'รองเท้าผ้าใบ', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&auto=format&fit=crop&q=60' },
];

export default function ProductListView({
  products,
  categories,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onAdjustStock,
  statusFilter,
  onSetStatusFilter,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: ProductListViewProps) {
  // Filters & Search
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'categories'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formCostPrice, setFormCostPrice] = useState(0);
  const [formQuantity, setFormQuantity] = useState(0);
  const [formMinAlert, setFormMinAlert] = useState(5);
  const [formImage, setFormImage] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('คลังสินค้าหลัก A');
  const [formExpiryDate, setFormExpiryDate] = useState('');

  // Image Upload States
  const [imagePreview, setImagePreview] = useState('');
  const [showGallery, setShowGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Quick Adjustment Modal/Popover State
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(1);
  const [adjustReason, setAdjustReason] = useState('รับของเข้า / ปรับปรุงสต็อก');
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === 'low') {
      matchesStatus = p.quantity > 0 && p.quantity <= p.minAlert;
    } else if (statusFilter === 'out') {
      matchesStatus = p.quantity === 0;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Build a merged list of categories to handle any missing category definitions in the DB gracefully
  const mergedCategories = React.useMemo(() => {
    const list = [...categories];
    // Find all unique product category IDs
    const productCategoryIds = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    
    productCategoryIds.forEach((catId) => {
      if (!list.some((c) => c.id === catId)) {
        const defaultCat = INITIAL_CATEGORIES.find((c) => c.id === catId);
        list.push({
          id: catId,
          name: defaultCat?.name || (catId === 'cat-9uc8blz' ? 'กลุ่มจัดซื้อเฉพาะกิจ' : `กลุ่มสินค้า ${catId}`),
          description: defaultCat?.description || 'หมวดหมู่สินค้าอ้างอิงจากข้อมูลผลิตภัณฑ์ในระบบ',
          color: defaultCat?.color || 'bg-slate-100 text-slate-800 border-slate-200',
        });
      }
    });
    return list;
  }, [categories, products]);

  const getCategoryName = (catId: string) => {
    const cat = mergedCategories.find((c) => c.id === catId);
    return cat ? cat.name : 'ทั่วไป';
  };

  const getCategoryBadgeClass = (catId: string) => {
    const cat = mergedCategories.find((c) => c.id === catId);
    return cat ? cat.color : 'bg-slate-100 text-slate-800 border-slate-200';
  };

  // Open Modal for Create
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku(`SKU-${Math.floor(100000 + Math.random() * 900000)}`);
    setFormCategory(mergedCategories[0]?.id || '');
    setFormPrice(0);
    setFormCostPrice(0);
    setFormQuantity(0);
    setFormMinAlert(5);
    setFormImage('');
    setFormDescription('');
    setFormSourceUrl('');
    setImagePreview('');
    setShowGallery(false);
    setFormWarehouse('คลังสินค้าหลัก A');
    setFormExpiryDate('');
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSku(product.sku);
    setFormCategory(product.category);
    setFormPrice(product.price);
    setFormCostPrice(product.costPrice);
    setFormQuantity(product.quantity);
    setFormMinAlert(product.minAlert);
    setFormImage(product.image);
    setImagePreview(product.image);
    setFormDescription(product.description);
    setFormSourceUrl(product.sourceUrl || '');
    setShowGallery(false);
    setFormWarehouse(product.warehouse || 'คลังสินค้าหลัก A');
    setFormExpiryDate(product.expiryDate || '');
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSku.trim()) return;

    const productData = {
      name: formName,
      sku: formSku,
      category: formCategory,
      price: Number(formCostPrice),
      costPrice: Number(formCostPrice),
      quantity: Number(formQuantity),
      minAlert: Number(formMinAlert),
      image: formImage || imagePreview,
      description: formDescription,
      sourceUrl: formSourceUrl,
      warehouse: formWarehouse,
      expiryDate: formExpiryDate,
    };

    if (editingProduct) {
      onEditProduct(editingProduct.id, productData);
    } else {
      onAddProduct(productData);
    }
    setIsModalOpen(false);
  };

  // Base64 file reader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormImage(base64String);
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag-and-Drop Image handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormImage(base64String);
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectPresetImage = (url: string) => {
    setFormImage(url);
    setImagePreview(url);
    setShowGallery(false);
  };

  // Quick quantity quick buttons on row (direct interaction)
  const handleQuickAdd = (p: Product) => {
    onAdjustStock(p.id, 1, 'ปุ่มลัด: เพิ่มสินค้าเข้าคลัง 1 ชิ้น');
  };

  const handleQuickMinus = (p: Product) => {
    if (p.quantity > 0) {
      onAdjustStock(p.id, -1, 'ปุ่มลัด: ลดจำนวน/จ่ายออก 1 ชิ้น');
    }
  };

  // Open Detailed Stock adjustment panel
  const handleOpenAdjustDialog = (p: Product) => {
    setAdjustingProduct(p);
    setAdjustAmount(1);
    setAdjustType('in');
    setAdjustReason(p.quantity === 0 ? 'นำสินค้าเข้าสต็อกล็อตใหม่' : 'ปรับเปลี่ยนคลังสินค้าประจำวัน');
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const finalAmount = adjustType === 'in' ? adjustAmount : -adjustAmount;
    
    // Safety check for negative stock
    if (adjustType === 'out' && adjustingProduct.quantity < adjustAmount) {
      alert('ไม่สามารถหักสินค้าเกินจำนวนที่มีอยู่ในคลังปัจจุบันได้!');
      return;
    }

    onAdjustStock(adjustingProduct.id, finalAmount, adjustReason);
    setAdjustingProduct(null);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(num);
  };

  // Group products by category
  const productsByCategory = mergedCategories.reduce((acc, cat) => {
    const catProducts = filteredProducts.filter((p) => p.category === cat.id);
    if (catProducts.length > 0) {
      acc.push({
        category: cat,
        products: catProducts,
      });
    }
    return acc;
  }, [] as { category: Category; products: Product[] }[]);

  // Any products that don't match any category
  const uncategorizedProducts = filteredProducts.filter(
    (p) => !mergedCategories.some((cat) => cat.id === p.category)
  );
  if (uncategorizedProducts.length > 0) {
    productsByCategory.push({
      category: {
        id: 'uncategorized',
        name: 'สินค้าทั่วไป / ไม่มีหมวดหมู่',
        description: 'สินค้าที่ไม่ได้ถูกระบุหมวดหมู่',
        color: 'bg-slate-100 text-slate-800 border-slate-200',
      },
      products: uncategorizedProducts,
    });
  }

  return (
    <div className="space-y-6">
      {/* Sub-tab switcher */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab('products')}
          className={`pb-3 px-6 text-xs font-black tracking-wide font-sans transition-all border-b-2 relative -mb-[2px] cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'products'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <Package className="h-4.5 w-4.5" />
          รายการสินค้าพัสดุ (Products)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('categories')}
          className={`pb-3 px-6 text-xs font-black tracking-wide font-sans transition-all border-b-2 relative -mb-[2px] cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'categories'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <Layers className="h-4.5 w-4.5" />
          กลุ่มสินค้า & หมวดหมู่ (Categories)
        </button>
      </div>

      {activeSubTab === 'categories' ? (
        <CategoryView
          categories={categories}
          products={products}
          onAddCategory={onAddCategory}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
        />
      ) : (
        <>
          {/* Search & Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch justify-between bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        
        {/* Left: Searches and category selection */}
        <div className="flex flex-col sm:flex-row gap-3 flex-grow max-w-3xl">
          {/* Search text */}
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า หรือ รหัส SKU..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="input-product-search"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category drop */}
          <div className="relative min-w-[180px] flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
            <Filter className="h-4 w-4 text-slate-400 mr-2 flex-shrink-0" />
            <select
              className="bg-transparent border-none text-sm text-slate-700 focus:outline-none w-full font-sans cursor-pointer appearance-none"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              id="select-category-filter"
            >
              <option value="all">ทุกหมวดหมู่ ({mergedCategories.length})</option>
              {mergedCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name.split(' (')[0]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Trigger add product */}
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex-shrink-0"
          id="btn-add-product"
        >
          <Plus className="h-4 w-4" /> เพิ่มสินค้าใหม่
        </button>
      </div>

      {/* Category Filter Buttons */}
      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        <span className="text-xs font-bold text-slate-500 font-sans uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0">
          <Filter className="h-3.5 w-3.5 text-slate-400" /> โชว์เฉพาะหมวดหมู่:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'all'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
            id="btn-cat-filter-all"
          >
            ทั้งหมด ({products.length})
          </button>
          {mergedCategories.map((cat) => {
            const count = products.filter((p) => p.category === cat.id).length;
            const isSelected = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? `${cat.color} border-current shadow-sm font-bold ring-1 ring-current`
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
                id={`btn-cat-filter-${cat.id}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-current' : 'bg-slate-400'}`}></span>
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-status Filters (All, Out of stock, Low stock) & View Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSetStatusFilter('all')}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            id="btn-filter-status-all"
          >
            ทั้งหมด ({products.length})
          </button>
          <button
            onClick={() => onSetStatusFilter('low')}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              statusFilter === 'low'
                ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            id="btn-filter-status-low"
          >
            ใกล้หมดคลัง ({products.filter((p) => p.quantity > 0 && p.quantity <= p.minAlert).length})
          </button>
          <button
            onClick={() => onSetStatusFilter('out')}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              statusFilter === 'out'
                ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            id="btn-filter-status-out"
          >
            สินค้าหมดคลัง ({products.filter((p) => p.quantity === 0).length})
          </button>
        </div>

        {/* View Layout Toggle */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto shadow-sm border border-slate-200/40">
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'grouped'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="btn-viewmode-grouped"
            type="button"
          >
            <Layers className="h-3.5 w-3.5" />
            แยกกลุ่มหมวดหมู่
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'list'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="btn-viewmode-list"
            type="button"
          >
            <List className="h-3.5 w-3.5" />
            รายการทั้งหมด
          </button>
        </div>
      </div>

      {/* Product Grid / Table */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
          <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto text-slate-400 mb-4">
            <Search className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700 font-sans">ไม่พบรายการสินค้าที่ค้นหา</h3>
          <p className="text-xs text-slate-400 font-sans mt-1 max-w-sm mx-auto">
            ลองปรับเปลี่ยนรหัส SKU ชื่อสินค้า หรือเลือกหมวดหมู่ใหม่อีกครั้ง
          </p>
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-6">
          {/* Collapse/Expand Controls */}
          <div className="flex justify-between items-center bg-slate-50/50 border border-slate-150 rounded-xl px-4 py-2.5 shadow-sm">
            <span className="text-xs font-bold text-slate-500 font-sans flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-slate-400" /> จัดการแสดงผลกลุ่มสินค้า:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const updated: Record<string, boolean> = {};
                  productsByCategory.forEach((g) => {
                    updated[g.category.id] = true;
                  });
                  setCollapsedCategories(updated);
                }}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50/50 bg-white border border-slate-200 rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                id="btn-collapse-all"
                type="button"
              >
                <ChevronUp className="h-3.5 w-3.5" /> ยุบทั้งหมด
              </button>
              <button
                onClick={() => {
                  setCollapsedCategories({});
                }}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50/50 bg-white border border-slate-200 rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                id="btn-expand-all"
                type="button"
              >
                <ChevronDown className="h-3.5 w-3.5" /> ขยายทั้งหมด
              </button>
            </div>
          </div>

          <div className="space-y-8">
            {productsByCategory.map((group) => {
              const totalQty = group.products.reduce((sum, p) => sum + p.quantity, 0);
              const totalCostVal = group.products.reduce((sum, p) => sum + p.costPrice * p.quantity, 0);
              const totalSalesVal = group.products.reduce((sum, p) => sum + p.price * p.quantity, 0);
              const isCollapsed = !!collapsedCategories[group.category.id];

              return (
                <div key={group.category.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id={`category-group-${group.category.id}`}>
                  {/* Category Header with Stats */}
                  <div
                    className="bg-slate-50/75 border-b border-slate-100 py-3.5 px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/100 transition-colors"
                    onClick={() => toggleCategoryCollapse(group.category.id)}
                    id={`group-header-${group.category.id}`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                      <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full border shadow-sm ${group.category.color}`}>
                        {group.category.name.split(' (')[0]}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 font-sans">
                        ({group.products.length} รายการสินค้า)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-500 font-sans" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-100/80 shadow-sm">
                        <span className="text-slate-400">สต็อกรวม:</span>
                        <span className="font-bold text-slate-800">{totalQty} ชิ้น</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-100/80 shadow-sm">
                        <span className="text-slate-400">มูลค่าทุน:</span>
                        <span className="font-bold text-indigo-600">{formatCurrency(totalCostVal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Table for this Category */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/30 border-b border-slate-100 text-xs font-bold text-slate-400 font-sans uppercase tracking-wider">
                            <th className="py-3.5 px-6 min-w-[240px]">สินค้า (Product Details)</th>
                            <th className="py-3.5 px-4 min-w-[150px]">รหัส SKU</th>
                            <th className="py-3.5 px-4 text-right min-w-[120px]">ต้นทุน (฿)</th>
                            <th className="py-3.5 px-4 text-center min-w-[160px]">จำนวนสต็อกคงเหลือ (Real-time)</th>
                            <th className="py-3.5 px-6 text-right min-w-[150px]">การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {group.products.map((p) => {
                            const isOutOfStock = p.quantity === 0;
                            const isLowStock = p.quantity > 0 && p.quantity <= p.minAlert;
                            
                            let stockColor = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                            let stockLabel = 'ในคลังปลอดภัย';
                            if (isOutOfStock) {
                              stockColor = 'bg-rose-50 text-rose-800 border-rose-100 animate-pulse';
                              stockLabel = 'หมดคลัง';
                            } else if (isLowStock) {
                              stockColor = 'bg-amber-50 text-amber-800 border-amber-100';
                              stockLabel = 'เหลือน้อยใกล้หมด';
                            }

                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                {/* Name & Photo */}
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-4">
                                    <img
                                      src={p.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'}
                                      alt={p.name}
                                      className="w-12 h-12 object-cover rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="min-w-0">
                                      <h4 className="font-bold text-slate-800 font-sans leading-tight line-clamp-2" title={p.name}>{p.name}</h4>
                                      <p className="text-xs text-slate-400 font-sans mt-1 line-clamp-1 italic">{p.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                                      <div className="mt-1 flex flex-wrap gap-1.5 items-center">
                                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold text-indigo-700 bg-indigo-50 rounded border border-indigo-100">
                                          📍 {p.warehouse || 'คลังสินค้าหลัก A'}
                                        </span>
                                        {p.expiryDate && (
                                          <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold text-rose-700 bg-rose-50 rounded border border-rose-100">
                                            📅 หมดอายุ: {new Date(p.expiryDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                                          </span>
                                        )}
                                      </div>
                                      {p.sourceUrl && (
                                        <div className="mt-1.5 flex items-center">
                                          <a
                                            href={p.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-all bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/80"
                                            id={`link-source-${p.id}`}
                                          >
                                            <ExternalLink className="h-2.5 w-2.5" /> ลิงก์ที่มาสินค้า
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* SKU */}
                                <td className="py-4 px-4">
                                  <div className="text-xs font-mono font-bold text-slate-500 tracking-tight">{p.sku}</div>
                                </td>

                                {/* Cost */}
                                <td className="py-4 px-4 text-right">
                                  <div className="font-bold text-slate-800 font-sans">{formatCurrency(p.costPrice)}</div>
                                </td>

                                {/* Real-time quantity counter / adjusting buttons */}
                                <td className="py-4 px-4">
                                  <div className="flex flex-col items-center gap-1.5">
                                    <div className="flex items-center gap-2.5 bg-slate-100 p-1 rounded-xl w-fit">
                                      <button
                                        onClick={() => handleQuickMinus(p)}
                                        disabled={p.quantity <= 0}
                                        className="text-slate-400 hover:text-rose-600 disabled:opacity-40 transition-colors p-0.5 rounded-lg hover:bg-white cursor-pointer"
                                        title="ลดสต็อกทีละ 1 ชิ้น"
                                        id={`btn-quick-minus-item-grp-${p.id}`}
                                      >
                                        <MinusCircle className="h-4.5 w-4.5" />
                                      </button>
                                      <span className="font-bold text-sm text-slate-800 w-10 text-center font-mono">
                                        {p.quantity}
                                      </span>
                                      <button
                                        onClick={() => handleQuickAdd(p)}
                                        className="text-slate-400 hover:text-emerald-600 transition-colors p-0.5 rounded-lg hover:bg-white cursor-pointer"
                                        title="เพิ่มสต็อกทีละ 1 ชิ้น"
                                        id={`btn-quick-plus-item-grp-${p.id}`}
                                      >
                                        <PlusCircle className="h-4.5 w-4.5" />
                                      </button>
                                    </div>
                                    <div className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${stockColor}`}>
                                      {stockLabel} ({p.quantity} / {p.minAlert})
                                    </div>
                                  </div>
                                </td>

                                {/* CRUD Actions */}
                                <td className="py-4 px-6 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleOpenAdjustDialog(p)}
                                      className="px-2.5 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-100 rounded-lg transition-colors cursor-pointer"
                                      title="ทำรายการรับเข้า/จ่ายออกละเอียด"
                                      id={`btn-adjust-details-item-grp-${p.id}`}
                                    >
                                      ทำรายการ
                                    </button>
                                    <button
                                      onClick={() => handleOpenEditModal(p)}
                                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                      title="แก้ไขสินค้า"
                                      id={`btn-edit-item-grp-${p.id}`}
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => onDeleteProduct(p.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                      title="ลบสินค้าออกจากระบบ"
                                      id={`btn-delete-item-grp-${p.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-center text-xs text-slate-400 font-sans shadow-sm">
            แยกกลุ่มตามประเภทสินค้าเสร็จสมบูรณ์ แสดงทั้งหมด {filteredProducts.length} สินค้าในหมวดหมู่ที่เลือก
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="table-products">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 font-sans uppercase tracking-wider">
                  <th className="py-4 px-6 min-w-[240px]">สินค้า (Product Details)</th>
                  <th className="py-4 px-4 min-w-[150px]">หมวดหมู่ / รหัส SKU</th>
                  <th className="py-4 px-4 text-right min-w-[120px]">ต้นทุน (฿)</th>
                  <th className="py-4 px-4 text-center min-w-[160px]">จำนวนสต็อกคงเหลือ (Real-time)</th>
                  <th className="py-4 px-6 text-right min-w-[150px]">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.quantity === 0;
                  const isLowStock = p.quantity > 0 && p.quantity <= p.minAlert;
                  
                  let stockColor = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                  let stockLabel = 'ในคลังปลอดภัย';
                  if (isOutOfStock) {
                    stockColor = 'bg-rose-50 text-rose-800 border-rose-100 animate-pulse';
                    stockLabel = 'หมดคลัง';
                  } else if (isLowStock) {
                    stockColor = 'bg-amber-50 text-amber-800 border-amber-100';
                    stockLabel = 'เหลือน้อยใกล้หมด';
                  }

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      {/* Name & Photo */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4.5">
                          <img
                            src={p.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'}
                            alt={p.name}
                            className="w-13 h-13 object-cover rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 font-sans leading-tight line-clamp-2" title={p.name}>{p.name}</h4>
                            <p className="text-xs text-slate-400 font-sans mt-1 line-clamp-1 italic">{p.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                            {p.sourceUrl && (
                              <div className="mt-1.5 flex items-center">
                                <a
                                  href={p.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-all bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/80"
                                  id={`link-source-${p.id}`}
                                >
                                  <ExternalLink className="h-2.5 w-2.5" /> ลิงก์ที่มาสินค้า
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category & SKU */}
                      <td className="py-4 px-4">
                        <span className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-full border mb-1.5 ${getCategoryBadgeClass(p.category)}`}>
                          {getCategoryName(p.category).split(' (')[0]}
                        </span>
                        <div className="text-xs font-mono font-bold text-slate-500 tracking-tight">{p.sku}</div>
                      </td>

                      {/* Cost */}
                      <td className="py-4 px-4 text-right">
                        <div className="font-bold text-slate-800 font-sans">{formatCurrency(p.costPrice)}</div>
                      </td>

                      {/* Real-time quantity counter / adjusting buttons */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col items-center gap-1.5">
                          {/* Live quantity adjuster */}
                          <div className="flex items-center gap-2.5 bg-slate-100 p-1 rounded-xl w-fit">
                            <button
                              onClick={() => handleQuickMinus(p)}
                              disabled={p.quantity <= 0}
                              className="text-slate-400 hover:text-rose-600 disabled:opacity-40 transition-colors p-0.5 rounded-lg hover:bg-white cursor-pointer"
                              title="ลดสต็อกทีละ 1 ชิ้น"
                              id={`btn-quick-minus-item-${p.id}`}
                            >
                              <MinusCircle className="h-4.5 w-4.5" />
                            </button>
                            <span className="font-bold text-sm text-slate-800 w-10 text-center font-mono">
                              {p.quantity}
                            </span>
                            <button
                              onClick={() => handleQuickAdd(p)}
                              className="text-slate-400 hover:text-emerald-600 transition-colors p-0.5 rounded-lg hover:bg-white cursor-pointer"
                              title="เพิ่มสต็อกทีละ 1 ชิ้น"
                              id={`btn-quick-plus-item-${p.id}`}
                            >
                              <PlusCircle className="h-4.5 w-4.5" />
                            </button>
                          </div>

                          {/* Level indicator badge */}
                          <div className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${stockColor}`}>
                            {stockLabel} ({p.quantity} / {p.minAlert})
                          </div>
                        </div>
                      </td>

                      {/* CRUD Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Detailed stock movement */}
                          <button
                            onClick={() => handleOpenAdjustDialog(p)}
                            className="px-2.5 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-100 rounded-lg transition-colors cursor-pointer"
                            title="ทำรายการรับเข้า/จ่ายออกละเอียด"
                            id={`btn-adjust-details-item-${p.id}`}
                          >
                            ทำรายการ
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            title="แก้ไขสินค้า"
                            id={`btn-edit-item-${p.id}`}
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDeleteProduct(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="ลบสินค้าออกจากระบบ"
                            id={`btn-delete-item-${p.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 text-xs text-slate-400 font-sans">
            แสดง {filteredProducts.length} จาก {products.length} สินค้าทั้งหมดในสต็อกระบบ
          </div>
        </div>
      )}

      {/* -------------------- ADD / EDIT MODAL -------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col p-6 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800 font-sans">
                {editingProduct ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าเข้าคลังใหม่'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="space-y-5 py-4 flex-grow">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">ชื่อสินค้า <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมาร์ทโฟน X1 Neo"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                {/* SKU Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">รหัสสินค้า / SKU <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น EL-SP-001"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans font-mono uppercase transition-all"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">หมวดหมู่กลุ่มสินค้า <span className="text-rose-500">*</span></label>
                  <select
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all cursor-pointer"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {mergedCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Minimum Alert level */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">จำนวนแจ้งเตือนขั้นต่ำ (Min Alarm) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="เช่น 5"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                    value={formMinAlert}
                    onChange={(e) => setFormMinAlert(Math.max(1, Number(e.target.value)))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cost price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">ราคาทุนสินค้า (฿) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(Math.max(0, Number(e.target.value)))}
                  />
                </div>

                {/* Initial Stock level */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">
                    {editingProduct ? 'จำนวนคงเหลือปัจจุบัน' : 'จำนวนสต็อกเริ่มต้น'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Math.max(0, Number(e.target.value)))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Warehouse Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">สถานที่จัดเก็บ / คลังสินค้า <span className="text-rose-500">*</span></label>
                  <select
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all cursor-pointer"
                    value={formWarehouse}
                    onChange={(e) => setFormWarehouse(e.target.value)}
                  >
                    <option value="คลังสินค้าหลัก A">คลังสินค้าหลัก A</option>
                    <option value="คลังสำรอง B">คลังสำรอง B</option>
                    <option value="คลังสินค้าหน้าร้าน C">คลังสินค้าหน้าร้าน C</option>
                  </select>
                </div>

                {/* Expiry Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">วันหมดอายุของสินค้า (Expiry Date)</label>
                  <input
                    type="date"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 font-sans">คำอธิบาย/รายละเอียดสินค้า</label>
                <textarea
                  placeholder="เช่น สเปคสินค้า รายละเอียดบรรจุภัณฑ์ การรับประกัน..."
                  rows={2}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all resize-none"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  id="input-product-desc"
                />
              </div>

              {/* Source/Reference URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 font-sans flex items-center gap-1">
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" /> ลิงก์ที่มา/แหล่งอ้างอิงสินค้า (URL)
                </label>
                <input
                  type="url"
                  placeholder="เช่น https://shopee.co.th/... หรือเว็บซัพพลายเออร์"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                  value={formSourceUrl}
                  onChange={(e) => setFormSourceUrl(e.target.value)}
                  id="input-product-source-url"
                />
              </div>

              {/* Advanced Image upload / drag and drop */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600 font-sans">รูปภาพประกอบสินค้า</label>
                  <button
                    type="button"
                    onClick={() => setShowGallery(!showGallery)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon className="h-3.5 w-3.5" /> {showGallery ? 'ปิดคลังรูปภาพสำเร็จ' : 'เลือกจากคลังภาพสำเร็จรูป'}
                  </button>
                </div>

                {showGallery && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-[11px] text-slate-400 font-sans mb-3">คลิกเลือกภาพคุณภาพสูงสำหรับหมวดสินค้าประเภทต่างๆ:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {PRESET_IMAGES.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectPresetImage(img.url)}
                          className="group relative rounded-xl overflow-hidden border border-slate-200 h-16 text-left focus:outline-none cursor-pointer"
                        >
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                            <span className="text-[9px] font-bold text-white line-clamp-1">{img.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Drag / Drop Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all relative overflow-hidden flex flex-col sm:flex-row items-center gap-4 ${
                    isDragOver ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                  }`}
                >
                  {/* File input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Image Preview or Icon */}
                  <div className="relative flex-shrink-0">
                    {imagePreview ? (
                      <div className="relative group">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-xl border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormImage('');
                            setImagePreview('');
                          }}
                          className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white p-1 rounded-full shadow-sm hover:bg-rose-600 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* Upload Info */}
                  <div className="text-left flex-grow">
                    <h5 className="text-xs font-bold text-slate-700 font-sans">ลากไฟล์รูปภาพมาวางที่นี่ หรือ</h5>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline mt-1 cursor-pointer"
                    >
                      คลิกเพื่อเลือกไฟล์จากอุปกรณ์คอมพิวเตอร์ของคุณ
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1 font-sans">รองรับ JPG, PNG และ WebP (แนะนำไฟล์ขนาดเล็กลงคลังได้เร็วขึ้น)</p>
                  </div>
                </div>
              </div>

              {/* Form Footer Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
                  id="btn-submit-product-form"
                >
                  {editingProduct ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้าเข้าสต็อก'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* -------------------- DETAILED TRANSACTION DIALOG -------------------- */}
      {adjustingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 font-sans">ทำรายการสินค้า: {adjustingProduct.name}</h3>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAdjustSubmit} className="space-y-4 mt-4">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAdjustType('in')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    adjustType === 'in' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  นำสินค้าเข้าสต็อก (+)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('out')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    adjustType === 'out' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  จ่ายสินค้าออก/ขาย (-)
                </button>
              </div>

              {/* Current Quantity display */}
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-sans">จำนวนสินค้าในคลังปัจจุบัน:</span>
                <span className="font-bold text-slate-800 font-mono">{adjustingProduct.quantity} ชิ้น</span>
              </div>

              {/* Adjustment amount input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 font-sans">จำนวนที่ต้องการเปลี่ยนแปลง <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, Number(e.target.value)))}
                />
              </div>

              {/* Reason description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 font-sans">หมายเหตุ/รายละเอียดของรายการ <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ตรวจนับคลังสินค้าประจำสัปดาห์"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer ${
                    adjustType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                  id="btn-submit-quick-adjust"
                >
                  บันทึกรายการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
