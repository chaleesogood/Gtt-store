import React, { useState, useMemo } from 'react';
import { Product, Category, StockActivity } from '../types';
import {
  BarChart3,
  Calendar,
  Layers,
  MapPin,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Download,
  Search,
  Filter,
  RefreshCw,
  Package,
  FileSpreadsheet,
  CalendarDays,
  CheckCircle,
  AlertCircle,
  Boxes,
  Clock,
  ArrowUpDown
} from 'lucide-react';

interface ReportsViewProps {
  products: Product[];
  categories: Category[];
  activities: StockActivity[];
}

type ReportSubTab = 'stock' | 'movement' | 'sales' | 'alerts';

export default function ReportsView({ products, categories, activities }: ReportsViewProps) {
  // Navigation & Sub-tabs
  const [activeTab, setActiveTab] = useState<ReportSubTab>('stock');

  // Interactive Filter States
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Date Range Filter States
  const [dateRangePreset, setDateRangePreset] = useState<string>('30days'); // 'today' | '7days' | '30days' | 'all' | 'custom'
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Movement Report Aggregation Level
  const [movementGroupType, setMovementGroupType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Warehouses list
  const warehouses = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.warehouse) set.add(p.warehouse);
    });
    const list = Array.from(set);
    return list.length > 0 ? list : ['คลังสินค้าหลัก A', 'คลังสำรอง B', 'คลังสินค้าหน้าร้าน C'];
  }, [products]);

  // Handle Preset Date Ranges
  const handleDatePresetChange = (preset: string) => {
    setDateRangePreset(preset);
    const today = new Date();
    if (preset === 'today') {
      const dateStr = today.toISOString().split('T')[0];
      setStartDate(dateStr);
      setEndDate(dateStr);
    } else if (preset === '7days') {
      const prev = new Date();
      prev.setDate(today.getDate() - 7);
      setStartDate(prev.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === '30days') {
      const prev = new Date();
      prev.setDate(today.getDate() - 30);
      setStartDate(prev.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setStartDate('2026-01-01');
      setEndDate(today.toISOString().split('T')[0]);
    }
  };

  // Helper formatting functions
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(val);
  };

  const formatQty = (val: number) => {
    return new Intl.NumberFormat('th-TH').format(val);
  };

  // Filter products based on warehouse and category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesWarehouse = selectedWarehouse === 'all' || p.warehouse === selectedWarehouse;
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesWarehouse && matchesCategory && matchesSearch;
    });
  }, [products, selectedWarehouse, selectedCategory, searchQuery]);

  // Filter activities based on date range & warehouse
  const filteredActivities = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return activities.filter(act => {
      const actDate = new Date(act.timestamp);
      const inDateRange = actDate >= start && actDate <= end;
      
      // Match warehouse if a specific product is related
      let matchesWarehouse = true;
      if (selectedWarehouse !== 'all') {
        const prod = products.find(p => p.id === act.productId);
        matchesWarehouse = prod ? prod.warehouse === selectedWarehouse : false;
      }

      // Match category
      let matchesCategory = true;
      if (selectedCategory !== 'all') {
        const prod = products.find(p => p.id === act.productId);
        matchesCategory = prod ? prod.category === selectedCategory : false;
      }

      return inDateRange && matchesWarehouse && matchesCategory;
    });
  }, [activities, startDate, endDate, selectedWarehouse, selectedCategory, products]);

  // ==========================================
  // REPORT 1: Stock Report Grouped by Category & Warehouse
  // ==========================================
  const stockByCategory = useMemo(() => {
    return categories.map(cat => {
      const catProducts = filteredProducts.filter(p => p.category === cat.id);
      const totalQty = catProducts.reduce((sum, p) => sum + p.quantity, 0);
      const totalValue = catProducts.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
      const productCount = catProducts.length;
      return {
        ...cat,
        totalQty,
        totalValue,
        productCount
      };
    }).filter(c => c.productCount > 0);
  }, [categories, filteredProducts]);

  const stockByWarehouse = useMemo(() => {
    return warehouses.map(wh => {
      const whProducts = filteredProducts.filter(p => p.warehouse === wh || (!p.warehouse && wh === 'คลังสินค้าหลัก A'));
      const totalQty = whProducts.reduce((sum, p) => sum + p.quantity, 0);
      const totalValue = whProducts.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
      const productCount = whProducts.length;
      return {
        name: wh,
        totalQty,
        totalValue,
        productCount
      };
    }).filter(w => w.productCount > 0);
  }, [warehouses, filteredProducts]);

  // Max values for chart scaling
  const maxCategoryValue = useMemo(() => {
    return Math.max(...stockByCategory.map(c => c.totalValue), 1);
  }, [stockByCategory]);

  const maxWarehouseValue = useMemo(() => {
    return Math.max(...stockByWarehouse.map(w => w.totalValue), 1);
  }, [stockByWarehouse]);

  // ==========================================
  // REPORT 2: Daily, Weekly, Monthly Inflow/Outflow Movement Report
  // ==========================================
  const movementData = useMemo(() => {
    const groups: Record<string, { label: string; inQty: number; outQty: number; totalCount: number; timestamp: number }> = {};

    filteredActivities.forEach(act => {
      const date = new Date(act.timestamp);
      let groupKey = '';
      let label = '';

      if (movementGroupType === 'daily') {
        groupKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        label = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      } else if (movementGroupType === 'weekly') {
        // Calculate start of week (Sunday)
        const day = date.getDay();
        const diff = date.getDate() - day;
        const startOfWeek = new Date(date.setDate(diff));
        groupKey = startOfWeek.toISOString().split('T')[0];
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        
        label = `${startOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`;
      } else {
        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        label = date.toLocaleDateString('th-TH', { month: 'long', year: '2-digit' });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          label,
          inQty: 0,
          outQty: 0,
          totalCount: 0,
          timestamp: new Date(groupKey).getTime()
        };
      }

      const qty = Math.abs(act.quantityChange);
      if (act.type === 'in') {
        groups[groupKey].inQty += qty;
      } else if (act.type === 'out') {
        groups[groupKey].outQty += qty;
      } else if (act.type === 'adjust') {
        if (act.quantityChange > 0) {
          groups[groupKey].inQty += qty;
        } else {
          groups[groupKey].outQty += qty;
        }
      }
      groups[groupKey].totalCount += 1;
    });

    // Sort chronologically
    return Object.values(groups).sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredActivities, movementGroupType]);

  const maxMovementQty = useMemo(() => {
    let max = 1;
    movementData.forEach(m => {
      if (m.inQty > max) max = m.inQty;
      if (m.outQty > max) max = m.outQty;
    });
    return max;
  }, [movementData]);

  // ==========================================
  // REPORT 3: Top Selling & Low Selling Products Report
  // ==========================================
  const salesRanking = useMemo(() => {
    const salesMap: Record<string, { product: Product; soldQty: number; revenueValue: number; txCount: number }> = {};

    // Initialize all products with 0 sales
    filteredProducts.forEach(p => {
      salesMap[p.id] = {
        product: p,
        soldQty: 0,
        revenueValue: 0,
        txCount: 0
      };
    });

    // Aggregate "out" transactions (sales)
    filteredActivities.forEach(act => {
      if (act.productId && salesMap[act.productId]) {
        const qty = Math.abs(act.quantityChange);
        if (act.type === 'out' || (act.type === 'adjust' && act.quantityChange < 0)) {
          salesMap[act.productId].soldQty += qty;
          salesMap[act.productId].revenueValue += qty * salesMap[act.productId].product.price;
          salesMap[act.productId].txCount += 1;
        }
      }
    });

    const list = Object.values(salesMap);
    
    const bestSellers = [...list].sort((a, b) => b.soldQty - a.soldQty);
    const worstSellers = [...list].sort((a, b) => a.soldQty - b.soldQty);

    return { bestSellers, worstSellers };
  }, [filteredProducts, filteredActivities]);

  // ==========================================
  // REPORT 4: Low Stock & Expiry Alerts Report
  // ==========================================
  const alertsReport = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const outOfStock: Product[] = [];
    const lowStock: Product[] = [];
    
    const expired: Product[] = [];
    const expiring30: Product[] = [];
    const expiring90: Product[] = [];
    const safeStock: Product[] = [];

    filteredProducts.forEach(p => {
      // Stock warning
      if (p.quantity === 0) {
        outOfStock.push(p);
      } else if (p.quantity <= p.minAlert) {
        lowStock.push(p);
      }

      // Expiry tracking
      if (p.expiryDate) {
        const expDate = new Date(p.expiryDate);
        expDate.setHours(0, 0, 0, 0);
        const timeDiff = expDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysDiff < 0) {
          expired.push(p);
        } else if (daysDiff <= 30) {
          expiring30.push(p);
        } else if (daysDiff <= 90) {
          expiring90.push(p);
        } else {
          safeStock.push(p);
        }
      } else {
        safeStock.push(p);
      }
    });

    return {
      outOfStock,
      lowStock,
      expired,
      expiring30,
      expiring90,
      safeStock
    };
  }, [filteredProducts]);


  // ==========================================
  // EXPORT CSV WORKFLOW (Pragmatic & robust)
  // ==========================================
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add UTF-8 BOM for Thai encoding in Excel
    let filename = `report_${activeTab}_${startDate}_to_${endDate}.csv`;

    if (activeTab === 'stock') {
      csvContent += "กลุ่มสินค้า / คลังสินค้า,จำนวนสินค้าในหมวด,จำนวนสต็อกรวม (ชิ้น),มูลค่าสต็อกรวม (บาท)\n";
      csvContent += "--- แยกตามประเภทกลุ่มสินค้า ---\n";
      stockByCategory.forEach(c => {
        csvContent += `"${c.name}","${c.productCount} รายการ","${c.totalQty}","${c.totalValue}"\n`;
      });
      csvContent += "\n--- แยกตามสถานที่คลังเก็บสินค้า ---\n";
      stockByWarehouse.forEach(w => {
        csvContent += `"${w.name}","${w.productCount} รายการ","${w.totalQty}","${w.totalValue}"\n`;
      });
    } else if (activeTab === 'movement') {
      csvContent += "ช่วงเวลา / วันที่,จำนวนรับเข้าสะสม (ชิ้น),จำนวนจ่ายออกสะสม (ชิ้น),จำนวนรายการสุทธิ,จำนวนทรานแซกชัน\n";
      movementData.forEach(m => {
        const net = m.inQty - m.outQty;
        csvContent += `"${m.label}","${m.inQty}","${m.outQty}","${net}","${m.totalCount}"\n`;
      });
    } else if (activeTab === 'sales') {
      csvContent += "อันดับ,ชื่อสินค้า,รหัส SKU,ยอดขายออก (ชิ้น),รายรับประมาณการ (บาท),คงเหลือปัจจุบัน,คลังจัดเก็บ\n";
      csvContent += "--- สินค้ายอดขายสูงสุด (Best Sellers) ---\n";
      salesRanking.bestSellers.slice(0, 15).forEach((item, idx) => {
        csvContent += `"${idx + 1}","${item.product.name}","${item.product.sku}","${item.soldQty}","${item.revenueValue}","${item.product.quantity}","${item.product.warehouse || 'คลังหลัก A'}"\n`;
      });
    } else if (activeTab === 'alerts') {
      csvContent += "ประเภทการแจ้งเตือน,ชื่อสินค้า,รหัส SKU,จำนวนคงเหลือ,แจ้งเตือนขั้นต่ำ,คลังจัดเก็บ,วันหมดอายุ\n";
      csvContent += "--- สินค้าหมดสต็อก ---\n";
      alertsReport.outOfStock.forEach(p => {
        csvContent += `"สินค้าหมดคลัง","${p.name}","${p.sku}","${p.quantity}","${p.minAlert}","${p.warehouse || 'คลังหลัก A'}","${p.expiryDate || '-'}"\n`;
      });
      csvContent += "\n--- สินค้าเหลือน้อยใกล้หมด ---\n";
      alertsReport.lowStock.forEach(p => {
        csvContent += `"สินค้าเหลือน้อย","${p.name}","${p.sku}","${p.quantity}","${p.minAlert}","${p.warehouse || 'คลังหลัก A'}","${p.expiryDate || '-'}"\n`;
      });
      csvContent += "\n--- สินค้าหมดอายุ/ใกล้หมดอายุ ---\n";
      alertsReport.expired.forEach(p => {
        csvContent += `"หมดอายุแล้ว","${p.name}","${p.sku}","${p.quantity}","${p.minAlert}","${p.warehouse || 'คลังหลัก A'}","${p.expiryDate}"\n`;
      });
      alertsReport.expiring30.forEach(p => {
        csvContent += `"หมดอายุภายใน 30 วัน","${p.name}","${p.sku}","${p.quantity}","${p.minAlert}","${p.warehouse || 'คลังหลัก A'}","${p.expiryDate}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Executive summary counts
  const execSummary = useMemo(() => {
    const totalValue = products.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
    const totalInflow = filteredActivities.filter(a => a.type === 'in' || (a.type === 'adjust' && a.quantityChange > 0)).reduce((sum, a) => sum + Math.abs(a.quantityChange), 0);
    const totalOutflow = filteredActivities.filter(a => a.type === 'out' || (a.type === 'adjust' && a.quantityChange < 0)).reduce((sum, a) => sum + Math.abs(a.quantityChange), 0);
    const alertCount = alertsReport.outOfStock.length + alertsReport.lowStock.length + alertsReport.expired.length + alertsReport.expiring30.length;

    return {
      totalValue,
      totalInflow,
      totalOutflow,
      alertCount
    };
  }, [products, filteredActivities, alertsReport]);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-sans flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            ระบบรายงานและการวิเคราะห์เชิงลึก (Intelligence Reports)
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">วิเคราะห์ประวัติสต็อกคงคลัง การรับเข้า-เบิกจ่าย และระบบสินค้าควบคุมหมดอายุ</p>
        </div>
        
        {/* Actions bar (Export and Preset Quick Selectors) */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 rounded-xl transition-all cursor-pointer"
            id="btn-export-report-csv"
          >
            <FileSpreadsheet className="h-4 w-4" />
            ส่งออกไฟล์ Excel (Export CSV)
          </button>
        </div>
      </div>

      {/* SEARCH & INTERACTIVE DUAL FILTERS BAR */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Warehouse Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider block">แยกตามคลังสินค้า</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                id="select-report-warehouse"
              >
                <option value="all">ทุกคลังสินค้า ({warehouses.length} คลัง)</option>
                {warehouses.map((wh, idx) => (
                  <option key={idx} value={wh}>{wh}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider block">กรองตามหมวดหมู่กลุ่มสินค้า</label>
            <div className="relative">
              <Layers className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                id="select-report-category"
              >
                <option value="all">ทุกกลุ่มสินค้า ({categories.length} กลุ่ม)</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name.split(' (')[0]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range Preset */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider block">ช่วงเวลาประเมินรายงาน</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                value={dateRangePreset}
                onChange={(e) => handleDatePresetChange(e.target.value)}
                id="select-report-preset-dates"
              >
                <option value="today">วันนี้ (Today)</option>
                <option value="7days">7 วันล่าสุด (Last 7 Days)</option>
                <option value="30days">30 วันล่าสุด (Last 30 Days)</option>
                <option value="all">ประวัติทั้งหมด (All Time)</option>
                <option value="custom">กำหนดช่วงวันที่เอง (Custom)</option>
              </select>
            </div>
          </div>

          {/* Keyword Search */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider block">ค้นหาเจาะจงสินค้า</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหาชื่อสินค้า หรือ SKU..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="input-report-search"
              />
            </div>
          </div>
        </div>

        {/* Custom date range selectors if 'custom' is active */}
        {dateRangePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4.5 rounded-2xl border border-slate-100 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-sans">ตั้งแต่วันที่:</span>
              <input
                type="date"
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-sans">ถึงวันที่:</span>
              <input
                type="date"
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* EXECUTIVE KPI SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Value in selected scope */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">มูลค่าทุนประเมินรวมในขอบเขต</p>
          <h4 className="text-lg sm:text-xl font-bold text-slate-800 font-mono mt-1">{formatCurrency(execSummary.totalValue)}</h4>
          <span className="text-[10px] text-slate-400 font-sans block mt-1">อิงตามจำนวนสต็อกปัจจุบัน</span>
        </div>

        {/* KPI 2: Total scoped inflow */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">ยอดนำเข้าสต็อกรวม</p>
            <h4 className="text-lg sm:text-xl font-bold text-emerald-600 font-mono mt-1">+{formatQty(execSummary.totalInflow)} <span className="text-xs text-slate-400">ชิ้น</span></h4>
          </div>
          <span className="text-[10px] text-slate-400 font-sans block mt-1">ในช่วงเวลาที่ระบุ</span>
        </div>

        {/* KPI 3: Total scoped outflow */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">ยอดจ่ายออกคลังรวม</p>
            <h4 className="text-lg sm:text-xl font-bold text-rose-600 font-mono mt-1">-{formatQty(execSummary.totalOutflow)} <span className="text-xs text-slate-400">ชิ้น</span></h4>
          </div>
          <span className="text-[10px] text-slate-400 font-sans block mt-1">ในช่วงเวลาที่ระบุ</span>
        </div>

        {/* KPI 4: Alert item count */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">สินค้าเฝ้าระวังพิเศษ</p>
            <h4 className={`text-lg sm:text-xl font-bold font-mono mt-1 ${execSummary.alertCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {execSummary.alertCount} <span className="text-xs text-slate-400">รายการ</span>
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-sans block mt-1">หมดสต็อก / ใกล้หมดอายุ</span>
        </div>
      </div>

      {/* REPORT SWITCH TABS */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-3 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'stock'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="tab-report-stock"
        >
          <Boxes className="h-4 w-4" />
          1. สต็อกกลุ่มสินค้า & คลัง
        </button>
        <button
          onClick={() => setActiveTab('movement')}
          className={`px-4 py-3 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'movement'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="tab-report-movement"
        >
          <CalendarDays className="h-4 w-4" />
          2. ความเคลื่อนไหวรับเข้า-เบิกจ่าย
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-3 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'sales'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="tab-report-sales"
        >
          <TrendingUp className="h-4 w-4" />
          3. สินค้าขายดี & ขายอืด
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-3 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'alerts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="tab-report-alerts"
        >
          <AlertTriangle className="h-4 w-4" />
          4. แดชบอร์ดเฝ้าระวัง & วันหมดอายุ
        </button>
      </div>

      {/* RENDER ACTIVE TAB REPORT PANELS */}
      <div className="space-y-6">
        
        {/* ========================================== */}
        {/* REPORT 1: STOCK BY GROUP AND WAREHOUSE */}
        {/* ========================================== */}
        {activeTab === 'stock' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Section: Category Breakdown */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-indigo-600 rounded"></span>
                  รายงานสต็อกแยกตามประเภทกลุ่มสินค้า (Stock by Category)
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">การเปรียบเทียบสัดส่วนและมูลค่าสต็อกในคลังตามประเภทย่อย</p>
              </div>

              {/* Graphic Chart */}
              <div className="space-y-4">
                {stockByCategory.map(cat => {
                  const percentage = (cat.totalValue / maxCategoryValue) * 100;
                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 font-sans flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${cat.color.split(' ')[0]}`}></span>
                          {cat.name.split(' (')[0]}
                        </span>
                        <div className="text-right font-mono text-[11px]">
                          <span className="text-slate-800 font-bold">{formatQty(cat.totalQty)} ชิ้น</span>
                          <span className="text-slate-400 mx-1.5">|</span>
                          <span className="text-indigo-600 font-bold">{formatCurrency(cat.totalValue)}</span>
                        </div>
                      </div>
                      <div className="h-3 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 flex">
                        <div
                          style={{ width: `${percentage}%` }}
                          className="h-full bg-indigo-500 rounded-lg transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
                {stockByCategory.length === 0 && (
                  <div className="py-12 text-center text-xs text-slate-400 font-sans">ไม่มีสินค้าคงคลังในขอบเขตที่เลือก</div>
                )}
              </div>

              {/* Detailed Grid Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-sans font-bold border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">ชื่อหมวดหมู่กลุ่ม</th>
                      <th className="py-3 px-4 text-center">จำนวนสินค้า</th>
                      <th className="py-3 px-4 text-center">สต็อกรวม</th>
                      <th className="py-3 px-4 text-right">มูลค่ารวม (ราคาทุน)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {stockByCategory.map(cat => (
                      <tr key={cat.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-700">{cat.name}</td>
                        <td className="py-3 px-4 text-center text-slate-500">{cat.productCount} รายการ</td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800">{formatQty(cat.totalQty)} ชิ้น</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600">{formatCurrency(cat.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Section: Warehouse Breakdown */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-indigo-600 rounded"></span>
                  รายงานสต็อกแยกตามสถานที่คลังเก็บสินค้า (Stock by Warehouse)
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">วิเคราะห์สัดส่วนของมูลค่าและจำนวนชิ้นงานระหว่างคลังย่อยต่างๆ</p>
              </div>

              {/* Graphic Chart */}
              <div className="space-y-4">
                {stockByWarehouse.map((wh, idx) => {
                  const percentage = (wh.totalValue / maxWarehouseValue) * 100;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 font-sans flex items-center gap-1.5">
                          📍 {wh.name}
                        </span>
                        <div className="text-right font-mono text-[11px]">
                          <span className="text-slate-800 font-bold">{formatQty(wh.totalQty)} ชิ้น</span>
                          <span className="text-slate-400 mx-1.5">|</span>
                          <span className="text-indigo-600 font-bold">{formatCurrency(wh.totalValue)}</span>
                        </div>
                      </div>
                      <div className="h-3 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 flex">
                        <div
                          style={{ width: `${percentage}%` }}
                          className="h-full bg-emerald-500 rounded-lg transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
                {stockByWarehouse.length === 0 && (
                  <div className="py-12 text-center text-xs text-slate-400 font-sans">ไม่มีสินค้าคงคลังในคลังที่ระบุ</div>
                )}
              </div>

              {/* Detailed Grid Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-sans font-bold border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">ชื่อสถานที่จัดเก็บ / คลัง</th>
                      <th className="py-3 px-4 text-center">จำนวนสินค้า</th>
                      <th className="py-3 px-4 text-center">สต็อกรวม</th>
                      <th className="py-3 px-4 text-right">มูลค่ารวม (ราคาทุน)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {stockByWarehouse.map((wh, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-700">📍 {wh.name}</td>
                        <td className="py-3 px-4 text-center text-slate-500">{wh.productCount} รายการ</td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800">{formatQty(wh.totalQty)} ชิ้น</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600">{formatCurrency(wh.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================== */}
        {/* REPORT 2: MOVEMENT HISTORY (INFLOW & OUTFLOW) */}
        {/* ========================================== */}
        {activeTab === 'movement' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            
            {/* Header filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-indigo-600 rounded"></span>
                  รายงานสรุปและสถิติประวัติการรับเข้าและเบิกจ่ายสินค้าคลังสินค้า
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">วิเคราะห์สัดส่วนสินค้าเคลื่อนไหวเพื่อตรวจจับช่วงเวลาที่คลังมีสภาวะโหลดสูงสุด</p>
              </div>
              
              {/* Aggregation Type toggle */}
              <div className="inline-flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setMovementGroupType('daily')}
                  className={`px-3 py-1.5 text-[10px] font-bold font-sans rounded-lg transition-all cursor-pointer ${
                    movementGroupType === 'daily' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  สรุปรายวัน
                </button>
                <button
                  onClick={() => setMovementGroupType('weekly')}
                  className={`px-3 py-1.5 text-[10px] font-bold font-sans rounded-lg transition-all cursor-pointer ${
                    movementGroupType === 'weekly' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  สรุปรายสัปดาห์
                </button>
                <button
                  onClick={() => setMovementGroupType('monthly')}
                  className={`px-3 py-1.5 text-[10px] font-bold font-sans rounded-lg transition-all cursor-pointer ${
                    movementGroupType === 'monthly' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  สรุปรายเดือน
                </button>
              </div>
            </div>

            {/* Visual SVG Double Bar Chart */}
            <div className="space-y-4">
              <div className="h-64 border border-slate-100 rounded-2xl bg-slate-50/50 p-6 flex flex-col justify-between">
                
                {/* Visual Chart content */}
                <div className="flex-grow flex items-end gap-3 sm:gap-6 md:gap-8 justify-around pt-2">
                  {movementData.map((m, idx) => {
                    const inPct = (m.inQty / maxMovementQty) * 100;
                    const outPct = (m.outQty / maxMovementQty) * 100;
                    
                    return (
                      <div key={idx} className="flex flex-col items-center flex-grow max-w-[60px] h-full group relative">
                        {/* Tooltip on Hover */}
                        <div className="absolute -top-12 bg-slate-800 text-white text-[9px] font-mono p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none min-w-[110px] text-center">
                          <p className="font-bold border-b border-slate-700 pb-0.5 mb-1 text-indigo-300">{m.label}</p>
                          <p className="text-emerald-400">เข้า: +{m.inQty} ชิ้น</p>
                          <p className="text-rose-400">ออก: -{m.outQty} ชิ้น</p>
                        </div>

                        {/* Comparative Dual Bars */}
                        <div className="flex items-end gap-1.5 w-full h-full justify-center">
                          {/* Inflow bar */}
                          <div
                            style={{ height: `${Math.max(inPct, 3)}%` }}
                            className="w-2.5 sm:w-4 bg-emerald-400 rounded-t-sm hover:bg-emerald-500 transition-all duration-300 relative"
                          />
                          {/* Outflow bar */}
                          <div
                            style={{ height: `${Math.max(outPct, 3)}%` }}
                            className="w-2.5 sm:w-4 bg-rose-400 rounded-t-sm hover:bg-rose-500 transition-all duration-300 relative"
                          />
                        </div>

                        {/* Label */}
                        <span className="text-[9px] font-bold text-slate-400 font-sans mt-2 text-center line-clamp-1 w-full" title={m.label}>
                          {m.label}
                        </span>
                      </div>
                    );
                  })}
                  {movementData.length === 0 && (
                    <div className="w-full flex flex-col items-center justify-center py-10 text-center text-xs text-slate-400 font-sans">
                      <Clock className="h-8 w-8 text-slate-300 mb-2" />
                      ไม่มีประวัติรายการเคลื่อนไหวรับเข้าและจ่ายออกในช่วงเวลาที่เลือก
                    </div>
                  )}
                </div>

                {/* Legend Chart Indicators */}
                <div className="border-t border-slate-100 pt-4 mt-2 flex items-center gap-6 justify-center text-xs font-sans">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-2 rounded-sm bg-emerald-400"></span>
                    <span className="text-slate-500">จำนวนรับสินค้าเข้า (Inflow Qty)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-2 rounded-sm bg-rose-400"></span>
                    <span className="text-slate-500">จำนวนจ่ายสินค้าออก (Outflow Qty)</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Detailed aggregate data table */}
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-sans font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">ขอบเขตช่วงเวลาประเมิน</th>
                    <th className="py-3 px-4 text-center">รับเข้าสะสม (ชิ้น)</th>
                    <th className="py-3 px-4 text-center">เบิกจ่ายออกสะสม (ชิ้น)</th>
                    <th className="py-3 px-4 text-center">จำนวนสุทธิ (Net Difference)</th>
                    <th className="py-3 px-4 text-right">จำนวนรายการประมวลผล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {[...movementData].reverse().map((m, idx) => {
                    const netVal = m.inQty - m.outQty;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-700">{m.label}</td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-emerald-600">+{formatQty(m.inQty)}</td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-rose-600">-{formatQty(m.outQty)}</td>
                        <td className={`py-3 px-4 text-center font-mono font-bold ${netVal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {netVal >= 0 ? '+' : ''}{formatQty(netVal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">{m.totalCount} รายการบัญชี</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================== */}
        {/* REPORT 3: BEST & WORST SELLING PRODUCTS */}
        {/* ========================================== */}
        {activeTab === 'sales' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Best Selling Products (สินค้าขายดี) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-1.5">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  สินค้าที่มียอดเบิกจ่ายสูงสุด (Best Selling Products)
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">จัดอันดับสินค้าที่มีปริมาณการส่งออกหรือยอดขายสูงสุดในรอบ 30 วันที่ผ่านมา</p>
              </div>

              <div className="space-y-4">
                {salesRanking.bestSellers.filter(item => item.soldQty > 0).slice(0, 5).map((item, idx) => {
                  return (
                    <div key={item.product.id} className="flex items-center gap-4 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      {/* Rank number badge */}
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black font-sans shadow-sm ${
                        idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-amber-50 text-amber-600' : 'bg-white text-slate-400 border border-slate-100'
                      }`}>
                        {idx + 1}
                      </span>
                      
                      {/* Product details */}
                      <img
                        src={item.product.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'}
                        alt={item.product.name}
                        className="w-10 h-10 object-cover rounded-xl bg-slate-100"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-grow min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate font-sans">{item.product.name}</h4>
                        <span className="text-[10px] font-mono font-semibold text-slate-400 tracking-tight">{item.product.sku}</span>
                      </div>

                      {/* Sales quantities info */}
                      <div className="text-right font-sans">
                        <p className="text-xs font-black text-emerald-600 font-mono">-{item.soldQty} ชิ้น</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">รวมเงิน: {formatCurrency(item.revenueValue)}</p>
                      </div>
                    </div>
                  );
                })}
                {salesRanking.bestSellers.filter(item => item.soldQty > 0).length === 0 && (
                  <div className="py-12 text-center text-xs text-slate-400 font-sans">ไม่มีประวัติการขายสินค้าในช่วงเวลาที่ระบุ</div>
                )}
              </div>
            </div>

            {/* Right Column: Slow Moving Products (สินค้าขายอืด / ยอดขายต่ำสุด) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-1.5">
                  <TrendingDown className="h-5 w-5 text-rose-500" />
                  สินค้าที่ค้างสต็อกหรือมียอดขายต่ำสุด (Slow Moving Products)
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">รายการสินค้าที่ไม่ขยับสต็อกหรืออัตราจ่ายออกช้าที่สุด เพื่อวิเคราะห์ลดต้นทุนจม</p>
              </div>

              <div className="space-y-4">
                {salesRanking.worstSellers.slice(0, 5).map((item, idx) => {
                  return (
                    <div key={item.product.id} className="flex items-center gap-4 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-sans bg-slate-100 text-slate-400 border border-slate-200">
                        {idx + 1}
                      </span>
                      
                      <img
                        src={item.product.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'}
                        alt={item.product.name}
                        className="w-10 h-10 object-cover rounded-xl bg-slate-100"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-grow min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate font-sans">{item.product.name}</h4>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-150">📍 {item.product.warehouse || 'คลังหลัก A'}</span>
                      </div>

                      {/* Stock availability */}
                      <div className="text-right font-sans">
                        <p className="text-xs font-black text-slate-600 font-mono">จ่ายออก {item.soldQty} ชิ้น</p>
                        <p className="text-[10px] font-bold text-indigo-600 mt-0.5">ในคลัง: {item.product.quantity} ชิ้น</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ========================================== */}
        {/* REPORT 4: STOCK ALERT & EXPIRY STATUS */}
        {/* ========================================== */}
        {activeTab === 'alerts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Section: Stock levels (Out of Stock / Low Stock) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-1.5">
                  <AlertCircle className="h-5 w-5 text-rose-500" />
                  รายงานเตือนภัยสต็อกคงคลังชำรุดขาดแคลน
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">รายการสินค้าคลังที่ถึงระดับอันตราย หมดคลัง หรือเหลือน้อยกว่าขั้นต่ำ</p>
              </div>

              {/* Warnings List */}
              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                {/* Out of Stock Section first */}
                {alertsReport.outOfStock.map((p) => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-rose-50/50 border border-rose-100 rounded-2xl hover:bg-rose-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded-xl border border-rose-100"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <span className="inline-block px-2 py-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-md uppercase">สินค้าหมดเกลี้ยง (Out)</span>
                        <h4 className="text-xs font-black text-slate-800 truncate font-sans mt-1">{p.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">SKU: {p.sku} | 📍 {p.warehouse || 'คลังหลัก A'}</span>
                      </div>
                    </div>
                    <div className="text-right font-sans">
                      <p className="text-xs font-black text-rose-600 font-mono">คงเหลือ: 0 ชิ้น</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">เกณฑ์เตือน: {p.minAlert} ชิ้น</p>
                    </div>
                  </div>
                ))}

                {/* Low Stock Section */}
                {alertsReport.lowStock.map((p) => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50/30 border border-amber-100 rounded-2xl hover:bg-amber-50/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded-xl border border-amber-100"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <span className="inline-block px-2 py-0.5 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-md">เหลือน้อยวิกฤต (Low)</span>
                        <h4 className="text-xs font-bold text-slate-800 truncate font-sans mt-1">{p.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">SKU: {p.sku} | 📍 {p.warehouse || 'คลังหลัก A'}</span>
                      </div>
                    </div>
                    <div className="text-right font-sans">
                      <p className="text-xs font-black text-amber-600 font-mono">คงเหลือ: {p.quantity} ชิ้น</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">เกณฑ์เตือน: {p.minAlert} ชิ้น</p>
                    </div>
                  </div>
                ))}

                {alertsReport.outOfStock.length === 0 && alertsReport.lowStock.length === 0 && (
                  <div className="py-16 text-center text-xs text-slate-400 font-sans border border-dashed border-slate-200 rounded-2xl">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    คลังสินค้าปกติปลอดภัยดีทุกรายการ ไม่มีรายงานสินค้าหมดหรือเหลือน้อย
                  </div>
                )}
              </div>
            </div>

            {/* Right Section: Expiry status (หมดอายุ / ใกล้หมดอายุ) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-1.5">
                  <Clock className="h-5 w-5 text-indigo-500" />
                  รายงานติดตามควบคุมวันหมดอายุสินค้า (Expiry Date Tracker)
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">ระบบเฝ้าระวังควบคุมสินค้าที่มีอายุจำกัดเพื่อคัดแยกและป้องกันการจำหน่ายสินค้าหมดอายุ</p>
              </div>

              {/* Expiry Analysis List */}
              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                {/* Expired Products (หมดอายุแล้ว) */}
                {alertsReport.expired.map(p => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-rose-50 border border-rose-100 rounded-2xl hover:bg-rose-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image || 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=120'}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded-xl border border-rose-200"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <span className="inline-block px-2 py-0.5 text-[9px] font-bold text-white bg-rose-600 rounded-md">🔴 หมดอายุแล้ว (Expired)</span>
                        <h4 className="text-xs font-black text-slate-800 truncate font-sans mt-1">{p.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">SKU: {p.sku} | 📍 {p.warehouse || 'คลังหลัก A'}</span>
                      </div>
                    </div>
                    <div className="text-right font-sans">
                      <p className="text-xs font-black text-rose-600 font-mono">หมดอายุ: {p.expiryDate}</p>
                      <span className="text-[9px] font-bold text-rose-500 block mt-1">คัดออกจากคลังด่วน!</span>
                    </div>
                  </div>
                ))}

                {/* Expiring in 30 days */}
                {alertsReport.expiring30.map(p => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl hover:bg-amber-100/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image || 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=120'}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded-xl border border-amber-200"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <span className="inline-block px-2 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 rounded-md">⏳ หมดอายุภายใน 30 วัน</span>
                        <h4 className="text-xs font-bold text-slate-800 truncate font-sans mt-1">{p.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">SKU: {p.sku} | 📍 {p.warehouse || 'คลังหลัก A'}</span>
                      </div>
                    </div>
                    <div className="text-right font-sans">
                      <p className="text-xs font-black text-amber-600 font-mono">หมดอายุ: {p.expiryDate}</p>
                      <span className="text-[9px] font-bold text-amber-500 block mt-1">กรุณาเร่งจัดจำหน่าย</span>
                    </div>
                  </div>
                ))}

                {/* Expiring in 90 days */}
                {alertsReport.expiring90.map(p => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl hover:bg-indigo-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image || 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=120'}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded-xl border border-slate-100"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <span className="inline-block px-2 py-0.5 text-[9px] font-semibold text-indigo-700 bg-indigo-50 rounded-md">⚡ หมดอายุต่ำกว่า 90 วัน</span>
                        <h4 className="text-xs font-medium text-slate-700 truncate font-sans mt-1">{p.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">SKU: {p.sku} | 📍 {p.warehouse || 'คลังหลัก A'}</span>
                      </div>
                    </div>
                    <div className="text-right font-sans">
                      <p className="text-xs font-bold text-indigo-600 font-mono">หมดอายุ: {p.expiryDate}</p>
                      <span className="text-[9px] text-slate-400 block mt-1">สัญญานปลอดภัย</span>
                    </div>
                  </div>
                ))}

                {alertsReport.expired.length === 0 && alertsReport.expiring30.length === 0 && alertsReport.expiring90.length === 0 && (
                  <div className="py-16 text-center text-xs text-slate-400 font-sans border border-dashed border-slate-200 rounded-2xl">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    สินค้าคลังจำกัดอายุทั้งหมดปกติดี ไม่มีรายงานสินค้าหมดอายุหรือหมดอายุเร็วๆ นี้
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
