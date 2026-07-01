import React, { useState } from 'react';
import { StockActivity } from '../types';
import { Search, Filter, History, Calendar, RefreshCw, TrendingUp, TrendingDown, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

interface ActivityLogViewProps {
  activities: StockActivity[];
  onClearLogs: () => void;
}

export default function ActivityLogView({ activities, onClearLogs }: ActivityLogViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Filter logs
  const filteredActivities = activities.filter((act) => {
    const matchesSearch =
      act.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (act.reason && act.reason.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || act.type === typeFilter;

    return matchesSearch && matchesType;
  });

  // Calculate statistics
  const totalIn = activities.filter((a) => a.type === 'in').reduce((sum, a) => sum + Math.abs(a.quantityChange), 0);
  const totalOut = activities.filter((a) => a.type === 'out').reduce((sum, a) => sum + Math.abs(a.quantityChange), 0);
  const totalAdjusts = activities.filter((a) => a.type === 'adjust').length;

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' น.';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards / Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Stock In */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <TrendingUp className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-sans font-medium">รวมนำเข้าทั้งหมด</p>
            <h4 className="text-xl font-bold text-slate-800 font-mono mt-0.5">+{totalIn} <span className="text-xs font-sans text-slate-400">ชิ้น</span></h4>
          </div>
        </div>

        {/* Total Stock Out */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <TrendingDown className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-sans font-medium">รวมขาย/จ่ายออกทั้งหมด</p>
            <h4 className="text-xl font-bold text-slate-800 font-mono mt-0.5">-{totalOut} <span className="text-xs font-sans text-slate-400">ชิ้น</span></h4>
          </div>
        </div>

        {/* Total Adjustments */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <RefreshCw className="h-5.5 w-5.5 animate-spin-slow" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-sans font-medium">การแก้ไขปรับคลังสินค้า</p>
            <h4 className="text-xl font-bold text-slate-800 font-mono mt-0.5">{totalAdjusts} <span className="text-xs font-sans text-slate-400">ครั้ง</span></h4>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า หรือ สาเหตุการปรับสต็อก..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="input-log-search"
          />
        </div>

        {/* Type selector and clear button */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 mr-1.5" />
            <select
              className="bg-transparent border-none text-xs text-slate-700 focus:outline-none font-sans cursor-pointer"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              id="select-log-type-filter"
            >
              <option value="all">ทุกประเภทรายการ ({activities.length})</option>
              <option value="in">รับเข้าสินค้า (+)</option>
              <option value="out">จ่ายสินค้าออก (-)</option>
              <option value="adjust">แก้ไขปรับปรุงคลัง</option>
            </select>
          </div>

          <button
            onClick={onClearLogs}
            disabled={activities.length === 0}
            className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 disabled:opacity-40 rounded-xl transition-all cursor-pointer"
            id="btn-clear-logs"
          >
            ล้างประวัติ
          </button>
        </div>
      </div>

      {/* Log List / Table */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
          <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto text-slate-400 mb-4">
            <History className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700 font-sans">ไม่พบประวัติการทำรายการ</h3>
          <p className="text-xs text-slate-400 font-sans mt-1 max-w-sm mx-auto">
            ไม่มีรายการประวัติสินค้าที่เข้าเงื่อนไขการค้นหาของคุณในขณะนี้
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="table-logs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 font-sans uppercase tracking-wider">
                  <th className="py-4 px-6 min-w-[200px]">วัน-เวลาทำรายการ (Timestamp)</th>
                  <th className="py-4 px-4 min-w-[180px]">สินค้า (Product Name)</th>
                  <th className="py-4 px-4 min-w-[140px]">ประเภทรายการ (Type)</th>
                  <th className="py-4 px-4 text-center min-w-[120px]">จำนวนสต็อกคงเดิม</th>
                  <th className="py-4 px-4 text-center min-w-[140px]">การเปลี่ยนแปลง</th>
                  <th className="py-4 px-4 text-center min-w-[120px]">สต็อกใหม่รวม</th>
                  <th className="py-4 px-6 min-w-[200px]">หมายเหตุ / ผู้บันทึก (Reason)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {[...filteredActivities]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((act) => {
                    const isPlus = act.type === 'in' || (act.type === 'adjust' && act.quantityChange > 0);
                    const isMinus = act.type === 'out' || (act.type === 'adjust' && act.quantityChange < 0);
                    
                    let badgeClass = 'text-slate-600 bg-slate-50 border-slate-100';
                    let label = 'ปรับสต็อกคลัง';
                    if (act.type === 'in') {
                      badgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                      label = 'รับสินค้าเข้า';
                    } else if (act.type === 'out') {
                      badgeClass = 'text-rose-700 bg-rose-50 border-rose-100';
                      label = 'จ่ายสินค้าออก';
                    }

                    return (
                      <tr key={act.id} className="hover:bg-slate-50/40 transition-colors">
                        {/* Timestamp */}
                        <td className="py-3 px-6 text-slate-500 font-mono">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formatDate(act.timestamp)}
                          </div>
                        </td>

                        {/* Product Name */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 font-sans line-clamp-1" title={act.productName}>
                            {act.productName}
                          </div>
                        </td>

                        {/* Event type */}
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${badgeClass}`}>
                            {label}
                          </span>
                        </td>

                        {/* Old Stock */}
                        <td className="py-3 px-4 text-center text-slate-400 font-mono">
                          {act.oldQuantity} ชิ้น
                        </td>

                        {/* Quantity change */}
                        <td className="py-3 px-4 text-center font-mono font-bold text-sm">
                          <span className={isPlus ? 'text-emerald-600' : isMinus ? 'text-rose-600' : 'text-slate-600'}>
                            {isPlus ? '+' : ''}{act.quantityChange}
                          </span>
                        </td>

                        {/* New Stock */}
                        <td className="py-3 px-4 text-center text-slate-800 font-mono font-bold bg-slate-50/50">
                          {act.newQuantity} ชิ้น
                        </td>

                        {/* Reason / comments */}
                        <td className="py-3 px-6">
                          <div className="text-slate-600 font-sans max-w-sm line-clamp-1 italic" title={act.reason}>
                            "{act.reason || 'ไม่ได้ระบุหมายเหตุการทำรายการ'}"
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-[11px] text-slate-400 font-sans text-center">
            บันทึกการทำรายการสต็อกแบบถาวรเรียลไทม์ (Real-time Transaction Audits)
          </div>
        </div>
      )}
    </div>
  );
}
