import React, { useState } from 'react';
import { Product, Category } from '../types';
import { ShoppingBag, PlusCircle, AlertTriangle, Play, RefreshCw, ShoppingCart, CheckCircle, Flame } from 'lucide-react';

interface SimulationViewProps {
  products: Product[];
  categories: Category[];
  onAdjustStock: (id: string, change: number, reason: string) => void;
}

export default function SimulationView({ products, categories, onAdjustStock }: SimulationViewProps) {
  const [salesCounter, setSalesCounter] = useState(0);
  const [lastActivity, setLastActivity] = useState<string>('');

  const handleQuickSell = (product: Product) => {
    if (product.quantity <= 0) return;
    onAdjustStock(product.id, -1, 'รายการขายหน้าร้าน (จำลองระบบ POS)');
    setSalesCounter((prev) => prev + 1);
    setLastActivity(`ขายสินค้า "${product.name}" จำนวน 1 ชิ้นสำเร็จ`);
  };

  const handleQuickRestock = (product: Product) => {
    onAdjustStock(product.id, 10, 'นำส่งของเติมคลังเร่งด่วน (จำลองระบบขนส่ง)');
    setLastActivity(`เติมสินค้า "${product.name}" จำนวน +10 ชิ้นเข้าสต็อกคลังสำเร็จ`);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Product cards for selling & restocking */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 font-sans">แผงควบคุมระบบหน้าร้านจำลอง (Simulator POS)</h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">ทดสอบคลิกขายสินค้าออก หรือเติมสต็อก เพื่อทดสอบการทำงานแบบเรียลไทม์</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map((p) => {
            const isOutOfStock = p.quantity === 0;
            const isLowStock = p.quantity > 0 && p.quantity <= p.minAlert;

            return (
              <div
                key={p.id}
                className={`bg-white border p-4.5 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between transition-all duration-300 ${
                  isOutOfStock ? 'border-rose-200 bg-rose-50/10' : 'border-slate-100 hover:shadow-md'
                }`}
              >
                {/* Out of Stock overlay or warning badge */}
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center p-4 z-10 animate-in fade-in">
                    <div className="text-center p-3 bg-white border border-rose-200 rounded-2xl shadow-sm max-w-[200px]">
                      <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto mb-1 animate-bounce" />
                      <h4 className="text-xs font-bold text-rose-700 font-sans">สินค้าหมดชั่วคราว!</h4>
                      <p className="text-[10px] text-slate-400 font-sans mt-0.5">กรุณากดเติมสต็อกด้านล่างเพื่อเปิดขายใหม่</p>
                    </div>
                  </div>
                )}

                <div>
                  {/* Photo & General info */}
                  <div className="flex gap-3">
                    <img
                      src={p.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'}
                      alt={p.name}
                      className="w-14 h-14 object-cover rounded-xl border border-slate-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 font-sans text-sm line-clamp-1">{p.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-mono font-semibold text-slate-400">{p.sku}</span>
                        {isLowStock && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 rounded">
                            ใกล้หมด
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-indigo-600 font-sans text-xs mt-1">
                        ราคาทุน: {formatCurrency(p.costPrice)}
                      </div>
                    </div>
                  </div>

                  {/* Stock count representation */}
                  <div className="mt-4 bg-slate-50 p-2 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-sans">จำนวนคงเหลือในร้าน:</span>
                    <span className={`font-mono font-bold text-sm ${isLowStock ? 'text-amber-600' : 'text-slate-800'}`}>
                      {p.quantity} ชิ้น
                    </span>
                  </div>
                </div>

                {/* Real-time actions */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-50">
                  <button
                    onClick={() => handleQuickSell(p)}
                    disabled={p.quantity <= 0}
                    className="flex items-center justify-center gap-1 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg shadow-sm cursor-pointer transition-colors"
                    id={`btn-sim-sell-${p.id}`}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" /> ขายออก (-1)
                  </button>
                  <button
                    onClick={() => handleQuickRestock(p)}
                    className="flex items-center justify-center gap-1 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-colors"
                    id={`btn-sim-restock-${p.id}`}
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> เติมสต็อก (+10)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Simulation Stats & Telemetry */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <Flame className="h-5 w-5 text-amber-500 animate-pulse" />
              <h3 className="font-bold text-slate-800 font-sans text-base">แผงรายงานความเร็วของข้อมูล</h3>
            </div>

            {/* Statistics */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl text-center">
                <span className="text-xs text-slate-400 font-sans block">ยอดจำลองการขายสำเร็จ</span>
                <span className="text-4xl font-black text-indigo-600 font-sans block mt-1">{salesCounter} รายการ</span>
              </div>

              {/* Status stream */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 font-sans">สถานะเครื่องรับฝากความร้อน:</h4>
                <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl space-y-1 max-h-[140px] overflow-y-auto">
                  <div className="flex items-center gap-1 text-emerald-500 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    [SYSTEM_READY] • คอนเนคชันคลังสินค้าทำงานปกติ
                  </div>
                  {lastActivity ? (
                    <div className="animate-pulse">[ACTIVITY]: {lastActivity}</div>
                  ) : (
                    <div className="text-slate-500">[STANDBY]: รอคำสั่งคลิกขายหรือเติมสต็อกเพื่ออัปเดตข้อมูลแบบเรียลไทม์...</div>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="text-xs text-slate-500 font-sans bg-amber-50 border border-amber-100 rounded-xl p-3 leading-relaxed space-y-1.5">
                <span className="font-bold text-amber-800 block">💡 ข้อดีของระบบจำลอง:</span>
                <p>การปรับสต็อกในหน้านี้จะอัปเดตสต็อกสินค้าจริงทันที สามารถไปเช็คผลลัพธ์ได้ที่หน้า <b>"ภาพรวมระบบ"</b> และ <b>"บันทึกการทำรายการ"</b> ได้ทันที!</p>
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-slate-100 mt-6">
            <div className="flex items-center justify-between text-xs text-slate-400 font-sans">
              <span>สถานะจำลอง:</span>
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> คอนเนคชันสำเร็จ
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
