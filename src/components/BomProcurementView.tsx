import React, { useState } from 'react';
import { Product, Bom, Project, Category } from '../types';
import ProjectBomView from './ProjectBomView';
import OrderingSystemView from './OrderingSystemView';
import { ClipboardList, ShoppingCart } from 'lucide-react';

interface BomProcurementViewProps {
  products: Product[];
  boms: Bom[];
  projects: Project[];
  categories: Category[];
  addToast: (type: 'success' | 'warning' | 'info', title: string, message: string) => void;
  onAdjustStock: (productId: string, change: number, reason: string) => Promise<void>;
}

export default function BomProcurementView({
  products,
  boms,
  projects,
  categories,
  addToast,
  onAdjustStock,
}: BomProcurementViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'bom' | 'orders'>('bom');

  return (
    <div className="space-y-6">
      {/* Sub-tab switcher */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab('bom')}
          className={`pb-3 px-6 text-xs font-black tracking-wide font-sans transition-all border-b-2 relative -mb-[2px] cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'bom'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <ClipboardList className="h-4.5 w-4.5" />
          แผนประกอบวัตถุดิบ (BOM)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('orders')}
          className={`pb-3 px-6 text-xs font-black tracking-wide font-sans transition-all border-b-2 relative -mb-[2px] cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'orders'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <ShoppingCart className="h-4.5 w-4.5" />
          ระบบจัดซื้อและสั่งซื้อ (Purchasing)
        </button>
      </div>

      <div>
        {activeSubTab === 'bom' ? (
          <ProjectBomView
            products={products}
            boms={boms}
            projects={projects}
            categories={categories}
            addToast={addToast}
          />
        ) : (
          <OrderingSystemView
            products={products}
            addToast={addToast}
            onAdjustStock={onAdjustStock}
          />
        )}
      </div>
    </div>
  );
}
