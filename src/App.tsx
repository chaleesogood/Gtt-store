import React, { useState, useEffect } from 'react';
import { Product, Category, StockActivity, Project, Bom } from './types';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, INITIAL_ACTIVITIES } from './initialData';
import Toast, { ToastMessage } from './components/Toast';
import DashboardView from './components/DashboardView';
import ProductListView from './components/ProductListView';
import CategoryView from './components/CategoryView';
import ActivityLogView from './components/ActivityLogView';
import ProjectBomView from './components/ProjectBomView';
import Logo from './components/Logo';

import { LayoutDashboard, Package, Layers, History, Play, Bell, Menu, X, CheckCircle, AlertTriangle, FolderKanban } from 'lucide-react';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, writeBatch, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activities, setActivities] = useState<StockActivity[]>([]);
  const [boms, setBoms] = useState<Bom[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // UI state
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Sync products from Firestore (seed if empty)
  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as Product);
      });
      if (list.length === 0) {
        // Seeding initial products
        INITIAL_PRODUCTS.forEach((prod) => {
          setDoc(doc(db, 'products', prod.id), prod).catch((err) => console.error("Seeding error:", err));
        });
        setProducts(INITIAL_PRODUCTS);
        localStorage.setItem('stock_manager_products', JSON.stringify(INITIAL_PRODUCTS));
      } else {
        // Sort by name or date if needed, let's preserve order by title/name
        list.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(list);
        localStorage.setItem('stock_manager_products', JSON.stringify(list));
      }
    }, (error) => {
      console.error("Firestore products sync error:", error);
      addToast('warning', 'เกิดข้อผิดพลาดในการเชื่อมต่อคลังสินค้า (Firestore)', `สลับไปใช้คลังสำรองในเบราว์เซอร์: ${error.message}`);
      const saved = localStorage.getItem('stock_manager_products');
      setProducts(saved ? JSON.parse(saved) : INITIAL_PRODUCTS);
    });
    return () => unsubscribe();
  }, []);

  // Sync categories from Firestore (seed if empty)
  useEffect(() => {
    const q = query(collection(db, 'categories'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Category[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as Category);
      });
      if (list.length === 0) {
        // Seeding initial categories
        INITIAL_CATEGORIES.forEach((cat) => {
          setDoc(doc(db, 'categories', cat.id), cat).catch((err) => console.error("Seeding error:", err));
        });
        setCategories(INITIAL_CATEGORIES);
        localStorage.setItem('stock_manager_categories', JSON.stringify(INITIAL_CATEGORIES));
      } else {
        setCategories(list);
        localStorage.setItem('stock_manager_categories', JSON.stringify(list));
      }
    }, (error) => {
      console.error("Firestore categories sync error:", error);
      addToast('warning', 'เกิดข้อผิดพลาดในการเชื่อมต่อคลังกลุ่มสินค้า (Firestore)', `สลับไปใช้คลังกลุ่มสำรองในเบราว์เซอร์: ${error.message}`);
      const saved = localStorage.getItem('stock_manager_categories');
      setCategories(saved ? JSON.parse(saved) : INITIAL_CATEGORIES);
    });
    return () => unsubscribe();
  }, []);

  // Sync activities from Firestore (seed if empty)
  useEffect(() => {
    const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: StockActivity[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as StockActivity);
      });
      if (list.length === 0) {
        // Seeding initial activities
        INITIAL_ACTIVITIES.forEach((act) => {
          setDoc(doc(db, 'activities', act.id), act).catch((err) => console.error("Seeding error:", err));
        });
        setActivities(INITIAL_ACTIVITIES);
        localStorage.setItem('stock_manager_activities', JSON.stringify(INITIAL_ACTIVITIES));
      } else {
        setActivities(list);
        localStorage.setItem('stock_manager_activities', JSON.stringify(list));
      }
    }, (error) => {
      console.error("Firestore activities sync error:", error);
      addToast('warning', 'เกิดข้อผิดพลาดในการเชื่อมต่อประวัติการทำงาน (Firestore)', `สลับไปใช้ประวัติสำรองในเบราว์เซอร์: ${error.message}`);
      const saved = localStorage.getItem('stock_manager_activities');
      setActivities(saved ? JSON.parse(saved) : INITIAL_ACTIVITIES);
    });
    return () => unsubscribe();
  }, []);

  // Sync boms from Firestore
  useEffect(() => {
    const q = query(collection(db, 'boms'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Bom[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as Bom);
      });
      list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setBoms(list);
      localStorage.setItem('stock_manager_boms', JSON.stringify(list));
    }, (error) => {
      console.error("Firestore boms sync error:", error);
      const saved = localStorage.getItem('stock_manager_boms');
      setBoms(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, []);

  // Sync projects from Firestore
  useEffect(() => {
    const q = query(collection(db, 'projects'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Project[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as Project);
      });
      list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setProjects(list);
      localStorage.setItem('stock_manager_projects_list', JSON.stringify(list));
    }, (error) => {
      console.error("Firestore projects sync error:", error);
      const saved = localStorage.getItem('stock_manager_projects_list');
      setProjects(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, []);


  // Toast Helpers
  const addToast = (type: 'success' | 'warning' | 'info', title: string, message: string) => {
    const newToast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
    };
    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // cap at 5 toasts max
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // -------------------- PRODUCTS WORKFLOWS --------------------

  const handleAddProduct = async (newProd: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const productId = `prod-${Math.random().toString(36).substring(2, 9)}`;
    const product: Product = {
      ...newProd,
      id: productId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Log Activity
    const activity: StockActivity = {
      id: `act-${Math.random().toString(36).substring(2, 9)}`,
      productId: product.id,
      productName: product.name,
      type: 'in',
      quantityChange: product.quantity,
      oldQuantity: 0,
      newQuantity: product.quantity,
      reason: 'ขึ้นทะเบียนนำเข้าสินค้าใหม่ในระบบ',
      timestamp: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'products', product.id), product);
      await setDoc(doc(db, 'activities', activity.id), activity);
      addToast('success', 'ลงทะเบียนสินค้าเรียบร้อย', `สินค้า "${product.name}" ได้รับการเพิ่มในสต็อกแล้ว`);
    } catch (error: any) {
      console.error(error);
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถเพิ่มสินค้าได้: ${error.message}`);
    }
  };

  const handleEditProduct = async (id: string, updatedFields: Partial<Product>) => {
    try {
      const productRef = doc(db, 'products', id);
      const cleanFields: Record<string, any> = {};
      Object.entries(updatedFields).forEach(([key, val]) => {
        if (val !== undefined) {
          cleanFields[key] = val;
        }
      });
      cleanFields.updatedAt = new Date().toISOString();

      await updateDoc(productRef, cleanFields);

      // Log manual changes if price or sku changes
      const p = products.find((prod) => prod.id === id);
      if (p && updatedFields.costPrice !== undefined && updatedFields.costPrice !== p.costPrice) {
        const activity: StockActivity = {
          id: `act-${Math.random().toString(36).substring(2, 9)}`,
          productId: p.id,
          productName: p.name,
          type: 'adjust',
          quantityChange: 0,
          oldQuantity: p.quantity,
          newQuantity: p.quantity,
          reason: `แก้ไขราคาทุนจาก ฿${p.costPrice} เป็น ฿${updatedFields.costPrice}`,
          timestamp: new Date().toISOString(),
        };
        await setDoc(doc(db, 'activities', activity.id), activity);
      }

      addToast('success', 'บันทึกความเปลี่ยนแปลงแล้ว', 'แก้ไขข้อมูลรายละเอียดสินค้าเรียบร้อย');
    } catch (error: any) {
      console.error(error);
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถแก้ไขสินค้าได้: ${error.message}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const productToDelete = products.find((p) => p.id === id);
    if (!productToDelete) return;

    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบสินค้า "${productToDelete.name}" ออกจากระบบถาวร?`)) {
      try {
        await deleteDoc(doc(db, 'products', id));

        // Log deletion
        const activity: StockActivity = {
          id: `act-${Math.random().toString(36).substring(2, 9)}`,
          productId: id,
          productName: productToDelete.name,
          type: 'adjust',
          quantityChange: -productToDelete.quantity,
          oldQuantity: productToDelete.quantity,
          newQuantity: 0,
          reason: 'ลบรายการสินค้าถาวรออกจากระบบคลังสินค้า',
          timestamp: new Date().toISOString(),
        };
        await setDoc(doc(db, 'activities', activity.id), activity);

        addToast('info', 'นำสินค้าออกจากระบบ', `ลบ "${productToDelete.name}" เรียบร้อยแล้ว`);
      } catch (error: any) {
        console.error(error);
        addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถลบสินค้าได้: ${error.message}`);
      }
    }
  };

  // CORE REAL-TIME STOCK ADJUSTMENT ENGINE
  const handleAdjustStock = async (id: string, change: number, reason: string) => {
    const p = products.find((prod) => prod.id === id);
    if (!p) return;

    const oldQty = p.quantity;
    const newQty = Math.max(0, p.quantity + change);
    if (oldQty === newQty) return;

    try {
      await updateDoc(doc(db, 'products', id), {
        quantity: newQty,
        updatedAt: new Date().toISOString()
      });

      // Create activity transaction
      const activity: StockActivity = {
        id: `act-${Math.random().toString(36).substring(2, 9)}`,
        productId: p.id,
        productName: p.name,
        type: change > 0 ? 'in' : change < 0 ? 'out' : 'adjust',
        quantityChange: change,
        oldQuantity: oldQty,
        newQuantity: newQty,
        reason: reason,
        timestamp: new Date().toISOString(),
      };
      await setDoc(doc(db, 'activities', activity.id), activity);

      // Trigger automated real-time notifications on threshold breaches!
      if (newQty === 0) {
        addToast(
          'warning',
          '⚠️ สินค้าหมดเกลี้ยง (Out of Stock)',
          `สินค้า "${p.name}" ในคลังหมดเกลี้ยงแล้ว! กรุณาเพิ่มสต็อกโดยด่วน`
        );
      } else if (newQty <= p.minAlert) {
        addToast(
          'warning',
          '⚠️ สินค้าใกล้หมดคลัง (Low Stock Alert)',
          `สินค้า "${p.name}" เหลือเพียง ${newQty} ชิ้น (เกณฑ์เตือนต่ำกว่า ${p.minAlert} ชิ้น)`
        );
      } else if (change > 0) {
        addToast(
          'success',
          '✅ อัปเดตคลังสินค้าสำเร็จ',
          `เติมสินค้า "${p.name}" เข้าสต็อกคลังรวมเป็น ${newQty} ชิ้นแล้ว`
        );
      } else {
        addToast(
          'info',
          '📦 ทำรายการจ่ายออกสำเร็จ',
          `หักสินค้า "${p.name}" ออกจากคลังเรียบร้อย ยอดคงเหลือ: ${newQty} ชิ้น`
        );
      }
    } catch (error: any) {
      console.error(error);
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถอัปเดตสต็อกสินค้าได้: ${error.message}`);
    }
  };

  const handleQuickRestock = (productId: string, amount: number) => {
    handleAdjustStock(productId, amount, 'เติมสต็อกด่วนจากหน้าแดชบอร์ดหลัก');
  };

  // -------------------- CATEGORIES WORKFLOWS --------------------

  const handleAddCategory = async (newCat: Omit<Category, 'id'>) => {
    const category: Category = {
      ...newCat,
      id: `cat-${Math.random().toString(36).substring(2, 9)}`,
    };

    // Optimistic state and local cache updates
    const updatedCategories = [...categories, category];
    setCategories(updatedCategories);
    localStorage.setItem('stock_manager_categories', JSON.stringify(updatedCategories));

    try {
      await setDoc(doc(db, 'categories', category.id), category);
      addToast('success', 'เพิ่มหมวดหมู่ใหม่สำเร็จ', `เพิ่มกลุ่มสินค้า "${category.name}" แล้ว`);
    } catch (error: any) {
      console.error(error);
      addToast('info', 'กำลังทำงานแบบออฟไลน์/บันทึกลงเครื่อง', `บันทึกกลุ่มสินค้า "${category.name}" ไว้ในเครื่องของคุณแล้ว: ${error.message}`);
    }
  };

  const handleEditCategory = async (id: string, updatedFields: Partial<Category>) => {
    // Optimistic state and local cache updates
    const updatedCategories = categories.map((cat) =>
      cat.id === id ? { ...cat, ...updatedFields } : cat
    );
    setCategories(updatedCategories);
    localStorage.setItem('stock_manager_categories', JSON.stringify(updatedCategories));

    try {
      const categoryRef = doc(db, 'categories', id);
      const cleanFields: Record<string, any> = {};
      Object.entries(updatedFields).forEach(([key, val]) => {
        if (val !== undefined) {
          cleanFields[key] = val;
        }
      });
      await updateDoc(categoryRef, cleanFields);
      addToast('success', 'แก้ไขหมวดหมู่สำเร็จ', 'บันทึกความเปลี่ยนแปลงเรียบร้อย');
    } catch (error: any) {
      console.error(error);
      addToast('info', 'อัปเดตแบบออฟไลน์สำเร็จ', 'บันทึกการแก้ไขกลุ่มสินค้าไว้ในเครื่องของคุณแล้ว');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const associatedProducts = products.filter((p) => p.category === id);
    if (associatedProducts.length > 0) {
      addToast(
        'warning',
        'ไม่สามารถลบได้',
        `กลุ่มสินค้านี้มีสินค้าผูกอยู่จำนวน ${associatedProducts.length} รายการ กรุณาย้ายหมวดหมู่สินค้าก่อน`
      );
      return;
    }

    const catToDelete = categories.find((c) => c.id === id);
    if (catToDelete && confirm(`ต้องการลบกลุ่มสินค้า "${catToDelete.name}" หรือไม่?`)) {
      // Optimistic state and local cache updates
      const updatedCategories = categories.filter((cat) => cat.id !== id);
      setCategories(updatedCategories);
      localStorage.setItem('stock_manager_categories', JSON.stringify(updatedCategories));

      try {
        await deleteDoc(doc(db, 'categories', id));
        addToast('info', 'ลบกลุ่มสินค้าสำเร็จ', `นำกลุ่มสินค้า "${catToDelete.name}" ออกจากระบบ`);
      } catch (error: any) {
        console.error(error);
        addToast('info', 'ลบกลุ่มสินค้าในเครื่องสำเร็จ', `นำกลุ่มสินค้า "${catToDelete.name}" ออกจากระบบของเครื่องแล้ว`);
      }
    }
  };

  const handleClearLogs = async () => {
    if (confirm('คุณแน่ใจหรือไม่ที่ต้องการจะเคลียร์ประวัติการทำรายการในอดีตทั้งหมด? (ประวัติจะหายไปถาวร)')) {
      try {
        const querySnapshot = await getDocs(collection(db, 'activities'));
        const batch = writeBatch(db);
        querySnapshot.forEach((document) => {
          batch.delete(doc(db, 'activities', document.id));
        });
        await batch.commit();
        addToast('info', 'ล้างประวัติการทำรายการแล้ว', 'ประวัติความเคลื่อนไหวทั้งหมดถูกลบออกจากฐานข้อมูลเรียบร้อย');
      } catch (error: any) {
        console.error(error);
        addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถล้างประวัติได้: ${error.message}`);
      }
    }
  };

  // Out of Stock & Low Stock items count for bell notification badges
  const outOfStockCount = products.filter((p) => p.quantity === 0).length;
  const lowStockCount = products.filter((p) => p.quantity > 0 && p.quantity <= p.minAlert).length;
  const totalAlerts = outOfStockCount + lowStockCount;

  // Render correct panel
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardView
            products={products}
            categories={categories}
            activities={activities}
            onQuickRestock={handleQuickRestock}
            onNavigateToTab={setCurrentTab}
            onSetStatusFilter={setStatusFilter}
          />
        );
      case 'products':
        return (
          <ProductListView
            products={products}
            categories={categories}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onAdjustStock={handleAdjustStock}
            statusFilter={statusFilter}
            onSetStatusFilter={setStatusFilter}
          />
        );
      case 'categories':
        return (
          <CategoryView
            categories={categories}
            products={products}
            onAddCategory={handleAddCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        );
      case 'logs':
        return <ActivityLogView activities={activities} onClearLogs={handleClearLogs} />;
      case 'projects_bom':
        return (
          <ProjectBomView
            products={products}
            boms={boms}
            projects={projects}
            addToast={addToast}
          />
        );

      default:
        return null;
    }
  };

  const handleAlertBellClick = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  const handleNotificationItemClick = (type: string) => {
    setStatusFilter(type);
    setCurrentTab('products');
    setIsNotificationsOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row antialiased text-slate-800">
      
      {/* -------------------- SIDEBAR NAVIGATION (DESKTOP) -------------------- */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex-shrink-0 z-20">
        {/* Brand / Logo */}
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <Logo className="h-10 w-10 flex-shrink-0" size={40} />
          <div>
            <h1 className="font-extrabold text-sm text-white tracking-wide font-sans">GTT EE STORE</h1>
            <p className="text-[10px] text-slate-500 font-sans tracking-widest uppercase">Inventory Real-time</p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-grow p-4 space-y-1 mt-4">
          <button
            onClick={() => { setCurrentTab('dashboard'); setStatusFilter('all'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
              currentTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400'
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5 flex-shrink-0" />
            ภาพรวมระบบ (Dashboard)
          </button>

          <button
            onClick={() => { setCurrentTab('products'); setStatusFilter('all'); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
              currentTab === 'products'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <Package className="h-4.5 w-4.5 flex-shrink-0" />
              จัดการสินค้า (Products)
            </div>
            {outOfStockCount > 0 && (
              <span className="bg-rose-600 text-[10px] font-mono text-white font-bold h-5 px-1.5 rounded-full flex items-center justify-center animate-pulse">
                {outOfStockCount} หมด
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('categories')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
              currentTab === 'categories'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400'
            }`}
          >
            <Layers className="h-4.5 w-4.5 flex-shrink-0" />
            กลุ่มสินค้า (Categories)
          </button>

          <button
            onClick={() => setCurrentTab('projects_bom')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
              currentTab === 'projects_bom'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400'
            }`}
          >
            <FolderKanban className="h-4.5 w-4.5 flex-shrink-0" />
            ระบบโปรเจ็ค & BOM
          </button>

          <button
            onClick={() => setCurrentTab('logs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
              currentTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400'
            }`}
          >
            <History className="h-4.5 w-4.5 flex-shrink-0" />
            บันทึกประวัติ (Logs)
          </button>


        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 text-[10px] text-slate-500 text-center font-mono font-medium">
          GTT EE STORE PLATFORM v1.4.0
        </div>
      </aside>

      {/* -------------------- MOBILE HEADER & MENU -------------------- */}
      <header className="md:hidden bg-slate-900 text-slate-200 py-4 px-5 flex items-center justify-between border-b border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8 flex-shrink-0" size={32} />
          <span className="font-bold text-sm tracking-wide text-white">GTT EE STORE</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications bell */}
          <button
            onClick={handleAlertBellClick}
            className="p-1.5 hover:bg-slate-800 rounded-lg relative cursor-pointer"
          >
            <Bell className="h-5 w-5 text-slate-400" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-[10px] text-white font-bold h-4.5 w-4.5 rounded-full flex items-center justify-center animate-pulse">
                {totalAlerts}
              </span>
            )}
          </button>

          {/* Toggle Menu */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[60px] bg-slate-950/85 backdrop-blur-xs z-30 animate-in fade-in duration-200">
          <nav className="bg-slate-900 border-b border-slate-800 p-5 space-y-2 text-slate-300">
            <button
              onClick={() => { setCurrentTab('dashboard'); setStatusFilter('all'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
                currentTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              ภาพรวมระบบ (Dashboard)
            </button>
            <button
              onClick={() => { setCurrentTab('products'); setStatusFilter('all'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold ${
                currentTab === 'products' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="h-4.5 w-4.5" />
                จัดการสินค้า (Products)
              </div>
              {outOfStockCount > 0 && (
                <span className="bg-rose-600 text-[9px] font-mono font-bold text-white h-4.5 px-1.5 rounded-full flex items-center justify-center">
                  {outOfStockCount} หมด
                </span>
              )}
            </button>
            <button
              onClick={() => { setCurrentTab('categories'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
                currentTab === 'categories' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <Layers className="h-4.5 w-4.5" />
              กลุ่มสินค้า (Categories)
            </button>
            <button
              onClick={() => { setCurrentTab('projects_bom'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
                currentTab === 'projects_bom' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <FolderKanban className="h-4.5 w-4.5" />
              ระบบโปรเจ็ค & BOM
            </button>
            <button
              onClick={() => { setCurrentTab('logs'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
                currentTab === 'logs' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <History className="h-4.5 w-4.5" />
              บันทึกประวัติ (Logs)
            </button>

          </nav>
        </div>
      )}

      {/* -------------------- MAIN WORKSPACE CONTENT -------------------- */}
      <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full relative">
        
        {/* TOP STATUS BAR (DESKTOP HEADER INSET) */}
        <header className="hidden md:flex items-center justify-between pb-6 mb-4 border-b border-slate-200/60">
          <div>
            <h1 className="text-xl font-bold font-sans text-slate-800">ระบบจัดการคลังสินค้าอัจฉริยะ</h1>
            <p className="text-xs text-slate-400 font-sans mt-0.5">คลังข้อมูลระบบบริหารสต็อกสินค้าแบบเรียลไทม์</p>
          </div>

          <div className="flex items-center gap-3 relative">
            
            {/* Bell Alert Notification Icon & Popover */}
            <button
              onClick={handleAlertBellClick}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all cursor-pointer relative shadow-xs"
              id="btn-alert-bell"
            >
              <Bell className="h-5 w-5" />
              {totalAlerts > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-[10px] text-white font-black font-mono h-5 w-5 rounded-full flex items-center justify-center animate-pulse">
                  {totalAlerts}
                </span>
              )}
            </button>

            {/* Notifications Popover Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-2xl p-4 shadow-xl w-80 z-40 animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <h4 className="text-xs font-bold text-slate-800 font-sans">รายการแจ้งเตือนคลังล่าสุด</h4>
                  <button onClick={() => setIsNotificationsOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {totalAlerts === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 font-sans">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    สินค้าในคลังปลอดภัย ครบจำนวนดีทุกรายการ!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
                    {outOfStockCount > 0 && (
                      <button
                        onClick={() => handleNotificationItemClick('out')}
                        className="w-full text-left p-2.5 hover:bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-2 cursor-pointer transition-colors"
                      >
                        <AlertTriangle className="h-4.5 w-4.5 text-rose-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-rose-800 font-sans block">สินค้าหมดคลัง ({outOfStockCount} รายการ)</span>
                          <span className="text-[10px] text-slate-500 font-sans mt-0.5 block leading-relaxed">มีสินค้าที่จำนวนลดเหลือ 0 ชิ้น ต้องการสั่งเติมคลังด่วนที่สุด</span>
                        </div>
                      </button>
                    )}
                    {lowStockCount > 0 && (
                      <button
                        onClick={() => handleNotificationItemClick('low')}
                        className="w-full text-left p-2.5 hover:bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2 cursor-pointer transition-colors"
                      >
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-amber-800 font-sans block">สินค้าใกล้หมดคลัง ({lowStockCount} รายการ)</span>
                          <span className="text-[10px] text-slate-500 font-sans mt-0.5 block leading-relaxed">สินค้าจำนวนเหลือน้อยกว่าขั้นต่ำ แจ้งเตือนเพื่อให้เติมสินค้า</span>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Profile Avatar / Mock account */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="text-right hidden xl:block">
                <span className="text-xs font-bold text-slate-800 font-sans block">ผู้ดูแลระบบคลัง</span>
                <span className="text-[10px] text-slate-400 font-mono">chaleesogood@gmail.com</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-200 border border-slate-300 overflow-hidden text-slate-600 flex items-center justify-center font-bold text-sm font-sans uppercase">
                AD
              </div>
            </div>

          </div>
        </header>

        {/* CORE WORKSPACE VIEW */}
        <div className="animate-in fade-in duration-300">
          {renderTabContent()}
        </div>

        {/* TOAST SYSTEM CONTAINER */}
        <div className="fixed bottom-5 right-5 space-y-3 z-50 flex flex-col items-end">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>

      </main>
    </div>
  );
}
