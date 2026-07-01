import React from 'react';
import { Product, Category, StockActivity } from '../types';
import { Package, AlertTriangle, TrendingUp, DollarSign, Plus, ArrowRight } from 'lucide-react';

interface DashboardViewProps {
  products: Product[];
  categories: Category[];
  activities: StockActivity[];
  onQuickRestock: (productId: string, amount: number) => void;
  onNavigateToTab: (tab: string) => void;
  onSetStatusFilter: (filter: string) => void;
}

export default function DashboardView({
  products,
  categories,
  activities,
  onQuickRestock,
  onNavigateToTab,
  onSetStatusFilter,
}: DashboardViewProps) {
  // Calculations
  const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalValue = products.reduce((sum, p) => sum + p.quantity * p.price, 0);
  const totalCost = products.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
  const estimatedProfit = totalValue - totalCost;

  const lowStockProducts = products.filter((p) => p.quantity > 0 && p.quantity <= p.minAlert);
  const outOfStockProducts = products.filter((p) => p.quantity === 0);

  // Stock status distributions
  const healthyCount = products.filter((p) => p.quantity > p.minAlert).length;
  const lowCount = lowStockProducts.length;
  const outCount = outOfStockProducts.length;
  const totalCount = products.length || 1; // avoid divide by zero

  // Category distribution
  const categoryStats = categories.map((cat) => {
    const catProducts = products.filter((p) => p.category === cat.id);
    const count = catProducts.length;
    const value = catProducts.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
    const qty = catProducts.reduce((sum, p) => sum + p.quantity, 0);
    return {
      ...cat,
      count,
      value,
      qty,
    };
  });

  // Recent 4 activities
  const recentActivities = [...activities]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 4);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH').format(num);
  };

  const handleAlertClick = (status: string) => {
    onSetStatusFilter(status);
    onNavigateToTab('products');
  };

  return (
    <div className="space-y-6">
      {/* Header section with quick statistics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-sans tracking-tight">ภาพรวมคลังสินค้า</h2>
          <p className="text-sm text-slate-500 font-sans mt-0.5">ข้อมูลสต็อกสินค้าและการแจ้งเตือนแบบเรียลไทม์</p>
        </div>
        <div className="text-xs text-slate-500 font-mono bg-white/70 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-1.5 self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          อัปเดตล่าสุด: {new Date().toLocaleTimeString('th-TH')} น.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total items */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <Package className="h-6 w-6" />
            </div>
            <span className="text-xs text-emerald-600 font-sans bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
              มีสินค้าทั้งหมด {products.length} รายการ
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-sans text-slate-500 font-medium">จำนวนสินค้าในคลังรวม</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1 font-sans tracking-tight">
              {formatNumber(totalItems)} <span className="text-lg font-medium text-slate-400">ชิ้น</span>
            </h3>
          </div>
        </div>

        {/* Card 2: Stock value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <span className="text-xs text-slate-500 font-sans">คำนวณจากราคาทุน</span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-sans text-slate-500 font-medium">มูลค่าทุนรวมในคลัง</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1 font-sans tracking-tight">
              ฿{formatNumber(totalCost)}
            </h3>
          </div>
        </div>

        {/* Card 3: Out of stock alert */}
        <button
          onClick={() => handleAlertClick('out')}
          className="text-left bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-rose-100 transition-all duration-300 cursor-pointer group"
          id="btn-kpi-out-of-stock"
        >
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-xl transition-colors ${outCount > 0 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            {outCount > 0 && (
              <span className="text-xs text-rose-600 font-sans bg-rose-50 px-2.5 py-1 rounded-full font-semibold">
                ต้องสั่งด่วน!
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm font-sans text-slate-500 font-medium group-hover:text-rose-600 transition-colors">สินค้าหมด (Out of Stock)</p>
            <h3 className={`text-3xl font-bold mt-1 font-sans tracking-tight ${outCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {outCount} <span className="text-lg font-medium text-slate-400">รายการ</span>
            </h3>
          </div>
        </button>

        {/* Card 4: Low stock alert */}
        <button
          onClick={() => handleAlertClick('low')}
          className="text-left bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-100 transition-all duration-300 cursor-pointer group"
          id="btn-kpi-low-stock"
        >
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-xl transition-colors ${lowCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            {lowCount > 0 && (
              <span className="text-xs text-amber-600 font-sans bg-amber-50 px-2.5 py-1 rounded-full font-medium">
                ควรเติมสินค้า
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm font-sans text-slate-500 font-medium group-hover:text-amber-600 transition-colors">สินค้าใกล้หมด (Low Stock)</p>
            <h3 className={`text-3xl font-bold mt-1 font-sans tracking-tight ${lowCount > 0 ? 'text-amber-500' : 'text-slate-800'}`}>
              {lowCount} <span className="text-lg font-medium text-slate-400">รายการ</span>
            </h3>
          </div>
        </button>
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle Column (Stock warning details & charts) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Notifications / Warning Center */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-sans">ศูนย์แจ้งเตือนสินค้าขาดแคลน</h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">รายการสินค้าหมดหรือเหลือน้อยกว่าค่าขั้นต่ำ</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-sans">
                  พบทั้งหมด {outCount + lowCount} รายการ
                </span>
              </div>
            </div>

            {outCount + lowCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <div className="p-3 bg-emerald-50 rounded-full text-emerald-500 mb-3">
                  <Package className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-700 font-sans">สินค้าทุกรายการอยู่ในเกณฑ์ปกติ!</h4>
                <p className="text-xs text-slate-400 font-sans mt-1 max-w-xs">ไม่มีสินค้าที่หมดหรือเหลือน้อยกว่าจำนวนขั้นต่ำในขณะนี้</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {/* Out of Stock Section first */}
                {outOfStockProducts.map((p) => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 rounded-xl transition-all">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded-lg bg-slate-100 border border-rose-100"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-100 rounded">หมด</span>
                          <h4 className="text-sm font-bold text-slate-800 font-sans line-clamp-1">{p.name}</h4>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">รหัส: {p.sku}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-rose-100">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-400 font-sans block">สถานะ</span>
                        <span className="text-sm font-bold text-rose-600 font-sans">0 ชิ้น</span>
                      </div>
                      <button
                        onClick={() => onQuickRestock(p.id, 10)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                        id={`btn-quick-restock-out-${p.id}`}
                      >
                        <Plus className="h-3.5 w-3.5" /> เติมคลัง (+10)
                      </button>
                    </div>
                  </div>
                ))}

                {/* Low Stock Section second */}
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50/50 hover:bg-amber-50 border border-amber-100 rounded-xl transition-all">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded-lg bg-slate-100 border border-amber-100"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 rounded">เหลือน้อย</span>
                          <h4 className="text-sm font-bold text-slate-800 font-sans line-clamp-1">{p.name}</h4>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">รหัส: {p.sku} • แจ้งเตือนขั้นต่ำ: {p.minAlert} ชิ้น</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-amber-100">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-400 font-sans block">คงเหลือ</span>
                        <span className="text-sm font-bold text-amber-600 font-sans">{p.quantity} ชิ้น</span>
                      </div>
                      <button
                        onClick={() => onQuickRestock(p.id, 20)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                        id={`btn-quick-restock-low-${p.id}`}
                      >
                        <Plus className="h-3.5 w-3.5" /> เติมคลัง (+20)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Visual Category Breakdown & Health Ratio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card Stock Health Level */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 font-sans mb-4">สัดส่วนความปลอดภัยของสินค้า</h3>
              
              <div className="space-y-4">
                {/* Visual stacked bar */}
                <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    style={{ width: `${(healthyCount / totalCount) * 100}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                    title={`ปลอดภัย: ${healthyCount} รายการ`}
                  />
                  <div
                    style={{ width: `${(lowCount / totalCount) * 100}%` }}
                    className="bg-amber-500 h-full transition-all duration-500"
                    title={`ใกล้หมด: ${lowCount} รายการ`}
                  />
                  <div
                    style={{ width: `${(outCount / totalCount) * 100}%` }}
                    className="bg-rose-500 h-full transition-all duration-500"
                    title={`หมดคลัง: ${outCount} รายการ`}
                  />
                </div>

                {/* Legend & Count */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block mr-1"></span>
                    <span className="text-slate-500 font-sans block mt-1">ปลอดภัย</span>
                    <span className="font-bold text-emerald-700 text-sm">{healthyCount} รายการ</span>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block mr-1"></span>
                    <span className="text-slate-500 font-sans block mt-1">ใกล้หมด</span>
                    <span className="font-bold text-amber-700 text-sm">{lowCount} รายการ</span>
                  </div>
                  <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block mr-1"></span>
                    <span className="text-slate-500 font-sans block mt-1">หมดแล้ว</span>
                    <span className="font-bold text-rose-700 text-sm">{outCount} รายการ</span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-sans text-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                  *สัดส่วนความสมบูรณ์ของคลังสินค้าวัดจากเกณฑ์จำนวนขั้นต่ำที่กำหนดของสินค้าแต่ละตัว
                </div>
              </div>
            </div>

            {/* Product Category Stock Distribution */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 font-sans mb-4 font-semibold">จำแนกตามประเภทสินค้า</h3>
              
              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {categoryStats.map((stat) => {
                  const maxVal = Math.max(...categoryStats.map(s => s.value), 1);
                  const percentage = (stat.value / maxVal) * 100;
                  return (
                    <div key={stat.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-sans">
                        <span className="font-bold text-slate-700 line-clamp-1">{stat.name.split(' (')[0]}</span>
                        <div className="flex items-center gap-2 text-slate-500">
                          <span>{stat.qty} ชิ้น</span>
                          <span className="font-bold text-slate-800">฿{formatNumber(stat.value)}</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Right Column (Activities Log & Quick Stats) */}
        <div className="space-y-6">
          
          {/* Recent Operations */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 font-sans">ประวัติการทำรายการล่าสุด</h3>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">ความเคลื่อนไหวสินค้าเรียลไทม์</p>
                </div>
                <button
                  onClick={() => onNavigateToTab('logs')}
                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                  title="ดูประวัติทั้งหมด"
                  id="btn-view-all-logs"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>

              {recentActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                  <p className="text-xs font-sans">ยังไม่มีประวัติความเคลื่อนไหวในขณะนี้</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivities.map((act) => {
                    const isPlus = act.type === 'in' || (act.type === 'adjust' && act.quantityChange > 0);
                    const isMinus = act.type === 'out' || (act.type === 'adjust' && act.quantityChange < 0);
                    
                    let badgeClass = 'text-slate-600 bg-slate-50 border-slate-100';
                    let label = 'ปรับสต็อก';
                    if (act.type === 'in') {
                      badgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                      label = 'รับสินค้าเข้า';
                    } else if (act.type === 'out') {
                      badgeClass = 'text-rose-700 bg-rose-50 border-rose-100';
                      label = 'ขายออก/จ่ายออก';
                    }

                    return (
                      <div key={act.id} className="flex gap-3 items-start border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                        <div className={`mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass} flex-shrink-0`}>
                          {label}
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 font-sans line-clamp-1">{act.productName}</h4>
                          <p className="text-[11px] text-slate-500 font-sans mt-0.5 line-clamp-1 italic">
                            "{act.reason || 'ไม่ได้ระบุหมายเหตุ'}"
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono block mt-1">
                            {new Date(act.timestamp).toLocaleTimeString('th-TH')} น.
                          </span>
                        </div>
                        <div className={`text-xs font-bold font-mono text-right flex-shrink-0 ${isPlus ? 'text-emerald-600' : isMinus ? 'text-rose-600' : 'text-slate-600'}`}>
                          {isPlus ? '+' : ''}{act.quantityChange} ชิ้น
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl p-4 text-white shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-100 font-sans">มูลค่าต้นทุนสต็อกในคลัง</p>
                  <h4 className="text-xl font-bold font-sans mt-1">฿{formatNumber(totalCost)}</h4>
                </div>
                <div className="text-right">
                  <p className="text-xs text-indigo-100 font-sans">จำนวนสินค้าทั้งหมด</p>
                  <h4 className="text-xl font-bold font-sans text-emerald-300 mt-1">
                    {formatNumber(totalItems)} ชิ้น
                  </h4>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
