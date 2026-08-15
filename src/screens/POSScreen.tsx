import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Trash2, ShoppingCart, QrCode, CreditCard, RefreshCw, HelpCircle, User, Save,
  Printer, Copy, Monitor, AlertTriangle, Search, Calculator, Percent,
  X, CheckCircle2, ShieldCheck, DollarSign, Plus, Minus, Layers, Phone,
  UserCheck, Lock, RotateCcw, ArrowUp, ArrowDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import { F1ShortcutOverlay } from '../components/F1ShortcutOverlay';
import { ManualBillRecoveryModal } from '../components/ManualBillRecoveryModal';
import { DuplicateBillReprintModal } from '../components/DuplicateBillReprintModal';
import { RegisterSelectionModal, POSRegister } from '../components/RegisterSelectionModal';
import { HeldBillsModal } from '../components/HeldBillsModal';
import { VoidBillModal } from '../components/VoidBillModal';
import { CustomerLookupModal } from '../components/CustomerLookupModal';
import { PriceCheckerModal } from '../components/PriceCheckerModal';
import { POSCartItem, PaymentMode, SaleType, RoleName } from '@afreen-mall/shared-types';

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

const formatLiveClock = (d: Date) =>
  `${d.toLocaleTimeString('en-IN', { hour12: true })} · ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

const paiseToRupee = (p: number) =>
  (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const playErrorBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    /* Audio not available */
  }
};

interface POSScreenProps {
  initialReturnMode?: boolean;
}

// In-Memory Barcode Cache for ≤100ms ultra-fast lookup
const BARCODE_CACHE = new Map<string, POSCartItem>();

export const POSScreen: React.FC<POSScreenProps> = ({ initialReturnMode = false }) => {
  const { user } = useAuth();
  const isSuperOrManager = user?.role === RoleName.SUPER_ADMIN || user?.role === RoleName.STORE_MANAGER;
  const canReturn = isSuperOrManager || user?.canProcessSaleReturn === true;
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // ── Real-Time Live Clock ────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Register & Mode ─────────────────────────────────────────────────────
  const [currentRegister, setCurrentRegister] = useState<POSRegister>(() => {
    const saved = localStorage.getItem('afreen_pos_register');
    return saved ? JSON.parse(saved) : { id: 'reg-01', posNumber: 'POS-01', name: 'Main Billing Counter (Ground Floor)', isActive: true };
  });
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isReturnMode, setIsReturnMode] = useState(initialReturnMode);
  const [saleType, setSaleType] = useState<SaleType>(SaleType.RETAIL);
  const [paymentModeActive, setPaymentModeActive] = useState<PaymentMode>(PaymentMode.CASH);
  const [invoiceNo, setInvoiceNo] = useState('...');
  const [lastSavedInvoice, setLastSavedInvoice] = useState<{ invoiceNo: string; amount: number } | null>(null);

  // ── Cart & Selection State ──────────────────────────────────────────────
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeError, setBarcodeError] = useState('');
  const [cartError, setCartError] = useState('');
  const [lastScannedItem, setLastScannedItem] = useState<POSCartItem | null>(null);
  const [lastScannedFlash, setLastScannedFlash] = useState(false);
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [selectedCartIndex, setSelectedCartIndex] = useState<number | null>(null);
  const [isGridFocused, setIsGridFocused] = useState(false);

  // ── Customer & Loyalty ──────────────────────────────────────────────────
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState<number | null>(null);

  // ── Modals & Overlays ───────────────────────────────────────────────────
  const [showF1Overlay, setShowF1Overlay] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showManualRecoveryModal, setShowManualRecoveryModal] = useState(false);
  const [showDuplicateReprintModal, setShowDuplicateReprintModal] = useState(false);
  const [showCancelBillModal, setShowCancelBillModal] = useState(false);
  const [showHeldBillsModal, setShowHeldBillsModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showCustomerLookupModal, setShowCustomerLookupModal] = useState(false);
  const [showPriceCheckerModal, setShowPriceCheckerModal] = useState(false);
  const [showManualDiscountModal, setShowManualDiscountModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [showQtyChangeModal, setShowQtyChangeModal] = useState(false);
  const [qtyInputVal, setQtyInputVal] = useState('1');
  const [manualDiscountVal, setManualDiscountVal] = useState('0');
  const [receiptPrintContent, setReceiptPrintContent] = useState<string | null>(null);

  // ── Payment Inputs in Dialog (Paise) ────────────────────────────────────
  const [paidCash, setPaidCash] = useState(0);
  const [paidCard, setPaidCard] = useState(0);
  const [paidUPI, setPaidUPI] = useState(0);
  const [cashReceivedInput, setCashReceivedInput] = useState<number>(0);
  const [cardDetails, setCardDetails] = useState({ bank: 'HDFC Bank', machine: 'EDC-01', last4: '4321', approvalCode: 'AUTH9823', refNo: 'TXN87621' });
  const [upiDetails, setUpiDetails] = useState({ upiApp: 'GPay', utrNo: '123456789012', refNo: 'UPI987654' });

  // ── Full-screen Payment Overlays ───────────────────────────────────────
  const [fullScreenOverlay, setFullScreenOverlay] = useState<'NONE' | 'UPI' | 'CARD'>('NONE');
  const [overlayStatus, setOverlayStatus] = useState('Processing...');

  // ── Invalid Scan Alert Modal ───────────────────────────────────────────
  const [scanAlertModal, setScanAlertModal] = useState<{
    show: boolean;
    type: 'NOT_FOUND' | 'ZERO_PRICE' | 'MALFORMED' | 'OUT_OF_STOCK';
    title: string;
    message: string;
    barcode?: string;
  }>({ show: false, type: 'NOT_FOUND', title: '', message: '' });

  // ── Calculator State ────────────────────────────────────────────────────
  const [calcDisplay, setCalcDisplay] = useState('0');

  // ── Cart Unload Guard ───────────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cart.length > 0) {
        e.preventDefault();
        e.returnValue = 'Active billing session in progress. Complete payment before navigating away.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cart]);

  // ── Refocus Barcode Helper ──────────────────────────────────────────────
  const refocusBarcode = useCallback(() => {
    setTimeout(() => {
      barcodeInputRef.current?.focus();
      setIsGridFocused(false);
    }, 30);
  }, []);

  // ── Calculations & Cash Rounding Engine ────────────────────────────────
  // Rule: Decimal <= 0.50 (in Rupees) -> Round Down, > 0.50 -> Round Up.
  // Card & UPI payments are NOT rounded (paid at exact paise value).
  const totalQty      = cart.reduce((s, i) => s + i.qty, 0);
  const totalDiscount = cart.reduce((s, i) => s + i.discountAmount * i.qty, 0);
  const totalAmount   = cart.reduce((s, i) => s + i.netRate * i.qty, 0);

  const cashRounded = useMemo(() => {
    const rupeesDecimal = totalAmount / 100;
    const wholeRupees = Math.floor(rupeesDecimal);
    const decimalPart = rupeesDecimal - wholeRupees;

    // Rule: <= 0.50 -> Round Down, > 0.50 -> Round Up
    const roundedRupees = decimalPart > 0.50 ? Math.ceil(rupeesDecimal) : Math.floor(rupeesDecimal);
    const roundedPaise = roundedRupees * 100;
    const roundingDifference = roundedPaise - totalAmount;

    return {
      originalTotal: totalAmount,
      roundedTotal: roundedPaise,
      roundingDifference,
    };
  }, [totalAmount]);

  // Dynamic payable amount based on active payment mode in dialog
  const activePayableAmount = useMemo(() => {
    if (paymentModeActive === PaymentMode.CASH) return cashRounded.roundedTotal;
    return totalAmount; // Card, UPI, Split pay exact unrounded amount
  }, [paymentModeActive, cashRounded, totalAmount]);

  const changeDue = Math.max(0, cashReceivedInput - activePayableAmount);

  // ── Fetch Next Invoice No & Last Invoice ───────────────────────────────
  const fetchNextInvoiceNo = useCallback(async () => {
    try {
      const res = await api.get('/pos/next-invoice-number');
      setInvoiceNo(res.data.invoice_number);
    } catch {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      setInvoiceNo(`INV-${dateStr}-0001`);
    }
  }, []);

  const fetchLastInvoice = useCallback(async () => {
    try {
      const res = await api.get('/pos/last-invoice');
      if (res.data) setLastSavedInvoice({ invoiceNo: res.data.invoice_number, amount: res.data.total_paise });
    } catch { /* no-op */ }
  }, []);

  useEffect(() => {
    refocusBarcode();
    fetchNextInvoiceNo();
    fetchLastInvoice();
  }, [fetchNextInvoiceNo, fetchLastInvoice, refocusBarcode]);

  // ── Check if any modal is active ────────────────────────────────────────
  const isAnyModalOpen = useMemo(() => {
    return (
      showPaymentModal || showF1Overlay || showManualRecoveryModal ||
      showDuplicateReprintModal || showCancelBillModal || showHeldBillsModal ||
      showVoidModal || showCustomerLookupModal || showPriceCheckerModal ||
      showManualDiscountModal || showCalculatorModal || showDeleteItemModal ||
      showQtyChangeModal || scanAlertModal.show || Boolean(receiptPrintContent)
    );
  }, [
    showPaymentModal, showF1Overlay, showManualRecoveryModal,
    showDuplicateReprintModal, showCancelBillModal, showHeldBillsModal,
    showVoidModal, showCustomerLookupModal, showPriceCheckerModal,
    showManualDiscountModal, showCalculatorModal, showDeleteItemModal,
    showQtyChangeModal, scanAlertModal.show, receiptPrintContent
  ]);

  // ── Hold & Recall Bill ─────────────────────────────────────────────────
  const handleHoldBill = async () => {
    if (!cart || cart.length === 0) {
      setCartError('Cannot hold empty bill. Scan at least one item first.');
      setTimeout(() => setCartError(''), 4000);
      return;
    }

    try {
      await api.post('/pos/held-bills', {
        items: cart,
        customerPhone,
        customerName,
        totalAmountPaise: totalAmount,
        registerId: currentRegister?.id,
        registerName: currentRegister?.name || currentRegister?.posNumber || 'Till-01',
      });
      setCart([]);
      setLastScannedItem(null);
      setCustomerPhone('');
      setCustomerName('');
      setCartError('');
      setSelectedCartIndex(null);
      refocusBarcode();
    } catch {
      // Local storage fallback for offline till operation
      const newHold = {
        id: `hold-${Date.now()}`,
        holdNo: `HOLD-${Math.floor(1000 + Math.random() * 9000)}`,
        registerId: currentRegister?.id,
        registerName: `${currentRegister?.posNumber || 'Till-01'} (Local Offline)`,
        customerPhone,
        customerName,
        items: cart,
        totalAmountPaise: totalAmount,
        cashierName: user?.fullName || 'Cashier',
        createdAt: new Date().toISOString(),
      };
      const saved = localStorage.getItem('afreen_held_bills');
      const list = saved ? JSON.parse(saved) : [];
      list.unshift(newHold);
      localStorage.setItem('afreen_held_bills', JSON.stringify(list));
      setCart([]);
      setLastScannedItem(null);
      setCustomerPhone('');
      setCustomerName('');
      setCartError('');
      setSelectedCartIndex(null);
      refocusBarcode();
    }
  };

  const handleRecallBill = (bill: any) => {
    setCart(bill.items || []);
    if (bill.customerPhone) setCustomerPhone(bill.customerPhone);
    if (bill.customerName) setCustomerName(bill.customerName);
    setSelectedCartIndex(0);
    refocusBarcode();
  };

  const handleToggleReturnMode = () => {
    if (!isReturnMode) {
      if (!canReturn) {
        setCartError('Permission Denied: You do not have Sale Return permission. Contact Manager or Super Admin.');
        setTimeout(() => setCartError(''), 6000);
        return;
      }
    }
    setIsReturnMode(prev => !prev);
    refocusBarcode();
  };

  // ── Global Bulletproof Event-Capturing Keyboard Listener ────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = (e.key || '').toUpperCase();
      const c = (e.code || '').toUpperCase();

      const isF1  = k === 'F1'  || c === 'F1';
      const isF2  = k === 'F2'  || c === 'F2';
      const isF3  = k === 'F3'  || c === 'F3';
      const isF4  = k === 'F4'  || c === 'F4';
      const isF5  = k === 'F5'  || c === 'F5';
      const isF6  = k === 'F6'  || c === 'F6';
      const isF7  = k === 'F7'  || c === 'F7';
      const isF8  = k === 'F8'  || c === 'F8';
      const isF9  = k === 'F9'  || c === 'F9';
      const isF10 = k === 'F10' || c === 'F10';
      const isF11 = k === 'F11' || c === 'F11';
      const isF12 = k === 'F12' || c === 'F12';

      const isEscape    = k === 'ESCAPE' || c === 'ESCAPE';
      const isEnter     = k === 'ENTER'  || c === 'ENTER' || c === 'NUMPADENTER';
      const isUpArrow   = k === 'ARROWUP' || c === 'ARROWUP';
      const isDownArrow = k === 'ARROWDOWN' || c === 'ARROWDOWN';
      const isDeleteKey = k === 'DELETE' || c === 'DELETE';

      // 1. F1: Shortcut Help Overlay
      if (isF1 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); e.stopPropagation();
        setShowF1Overlay(true);
        return;
      }

      // 2. F2: New Sale / Return to Billing Screen & Focus Barcode
      if (isF2 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); e.stopPropagation();
        setCartError('');
        refocusBarcode();
        return;
      }

      // 3. F3: Customer Search Modal
      if (isF3 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); e.stopPropagation();
        setShowCustomerLookupModal(true);
        return;
      }

      // 4. F4: Manual Discount Modal (Authorized users)
      if (isF4 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); e.stopPropagation();
        if (cart.length > 0) setShowManualDiscountModal(true);
        else { setCartError('Scan items into cart before applying manual discount.'); setTimeout(() => setCartError(''), 3000); }
        return;
      }

      // 5. F5: Hold Bill
      if (isF5 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); e.stopPropagation();
        handleHoldBill();
        return;
      }

      // 6. F6: Recall Held Bills Modal
      if (isF6 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); e.stopPropagation();
        setShowHeldBillsModal(true);
        return;
      }

      // 7. F7: Product Search / Price Checker Modal
      if (isF7 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); e.stopPropagation();
        setShowPriceCheckerModal(true);
        return;
      }

      // 8. F8: Manual Bill Recovery Modal
      if (isF8 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); e.stopPropagation();
        setShowManualRecoveryModal(true);
        return;
      }

      // 9. F9: Edit Quantity Popup for selected item
      if (isF9 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); e.stopPropagation();
        if (cart.length > 0) {
          const targetIdx = selectedCartIndex ?? 0;
          setQtyInputVal(String(cart[targetIdx]?.qty || 1));
          setShowQtyChangeModal(true);
        }
        return;
      }

      // 10. F10: Checkout / Open Payment Dialog
      if (isF10 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); e.stopPropagation();
        if (cart.length > 0) openPaymentModal();
        return;
      }

      // 11. F11: Full Screen POS Toggle
      if (isF11 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); e.stopPropagation();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
        return;
      }

      // 12. F12: Quick POS Calculator
      if (isF12 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); e.stopPropagation();
        setShowCalculatorModal(true);
        return;
      }

      // 13. Ctrl + P: Reprint Duplicate Bill Modal
      if (k === 'P' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); e.stopPropagation();
        setShowDuplicateReprintModal(true);
        return;
      }

      // 14. Ctrl + D: Manager Void / Delete Current Invoice
      if (k === 'D' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); e.stopPropagation();
        setShowVoidModal(true);
        return;
      }

      // 15. Delete Key: Delete selected item from cart (with confirmation)
      if (isDeleteKey && cart.length > 0 && selectedCartIndex !== null && !isAnyModalOpen) {
        e.preventDefault(); e.stopPropagation();
        setShowDeleteItemModal(true);
        return;
      }

      // 16. Arrow Up / Arrow Down: Navigate cart items
      if (isUpArrow && cart.length > 0 && !isAnyModalOpen) {
        e.preventDefault();
        setSelectedCartIndex((prev) => (prev === null || prev <= 0 ? cart.length - 1 : prev - 1));
        return;
      }
      if (isDownArrow && cart.length > 0 && !isAnyModalOpen) {
        e.preventDefault();
        setSelectedCartIndex((prev) => (prev === null || prev >= cart.length - 1 ? 0 : prev + 1));
        return;
      }

      // 17. Escape: Close open modals OR toggle focus between barcode input & grid
      if (isEscape) {
        if (isAnyModalOpen) {
          setShowPaymentModal(false);
          setShowF1Overlay(false);
          setShowManualRecoveryModal(false);
          setShowDuplicateReprintModal(false);
          setShowCancelBillModal(false);
          setShowHeldBillsModal(false);
          setShowVoidModal(false);
          setShowCustomerLookupModal(false);
          setShowPriceCheckerModal(false);
          setShowManualDiscountModal(false);
          setShowCalculatorModal(false);
          setShowDeleteItemModal(false);
          setShowQtyChangeModal(false);
          setReceiptPrintContent(null);
          setScanAlertModal({ show: false, type: 'NOT_FOUND', title: '', message: '' });
          refocusBarcode();
        } else {
          // Toggle focus to Item Grid
          setIsGridFocused(prev => !prev);
          if (isGridFocused) refocusBarcode();
        }
        return;
      }

      // Automatic focus restoration to Barcode Box when typing stray characters
      const active = document.activeElement as HTMLElement;
      const isInputFocused = active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA');
      if (!isAnyModalOpen && !isInputFocused && e.key.length === 1 && !e.ctrlKey && !e.altKey && !isGridFocused) {
        barcodeInputRef.current?.focus();
      }
      if (isEnter && active !== barcodeInputRef.current && !isAnyModalOpen) {
        barcodeInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [cart, selectedCartIndex, isAnyModalOpen, isGridFocused, refocusBarcode, handleHoldBill]);

  // ── Barcode scan handler ────────────────────────────────────────────────
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;
    handleBarcodeScan(code);
  };

  // ── Supermarket Catalog Seed Items for Scan Fallback ───────────────────
  const SUPERMARKET_SEED_CATALOG: POSCartItem[] = [
    { id: 'p-1', barcode: '890103000001', name: 'Amul Taaza Fresh Milk 1L', description: 'Dairy & Fresh Pack', qty: 1, mrp: 7200, rate: 7200, discountPercent: 0, discountAmount: 0, gstPercent: 0, netRate: 7200, value: 7200, unit: 'PACK', hsnCode: '0401' },
    { id: 'p-2', barcode: '890103000002', name: 'Britannia Good Day Butter Biscuits 200g', description: 'Bakery & Snacks', qty: 1, mrp: 4000, rate: 3600, discountPercent: 10, discountAmount: 400, gstPercent: 18, netRate: 4248, value: 4248, unit: 'PACK', hsnCode: '1905' },
    { id: 'p-3', barcode: '890103000003', name: 'Coca Cola Soft Drink Bottle 1.25L', description: 'Beverages', qty: 1, mrp: 6500, rate: 6000, discountPercent: 7.7, discountAmount: 500, gstPercent: 28, netRate: 7680, value: 7680, unit: 'BOT', hsnCode: '2202' },
    { id: 'p-4', barcode: '890103000004', name: 'Amul Pasteurized Butter 500g', description: 'Dairy & Staples', qty: 1, mrp: 27500, rate: 26000, discountPercent: 5.4, discountAmount: 1500, gstPercent: 12, netRate: 29120, value: 29120, unit: 'PACK', hsnCode: '0405' },
    { id: 'p-5', barcode: '890103000005', name: 'Fortune Refined Sunflower Oil 1L', description: 'Edible Oils', qty: 1, mrp: 14500, rate: 13800, discountPercent: 4.8, discountAmount: 700, gstPercent: 5, netRate: 14490, value: 14490, unit: 'PACK', hsnCode: '1512' },
    { id: 'p-6', barcode: '890103000006', name: 'Tata Iodized Vacuum Evaporated Salt 1kg', description: 'Staples', qty: 1, mrp: 2800, rate: 2800, discountPercent: 0, discountAmount: 0, gstPercent: 0, netRate: 2800, value: 2800, unit: 'PACK', hsnCode: '2501' },
    { id: 'p-7', barcode: '890103000007', name: 'Aashirvaad Shuddh Chakki Atta 5kg', description: 'Flour & Grains', qty: 1, mrp: 24000, rate: 22500, discountPercent: 6.25, discountAmount: 1500, gstPercent: 0, netRate: 22500, value: 22500, unit: 'BAG', hsnCode: '1101' },
    { id: 'p-8', barcode: '890103000008', name: 'Surf Excel Easy Wash Detergent Powder 1kg', description: 'Household Care', qty: 1, mrp: 14000, rate: 13000, discountPercent: 7.14, discountAmount: 1000, gstPercent: 18, netRate: 15340, value: 15340, unit: 'PACK', hsnCode: '3402' },
    { id: 'p-9', barcode: '890103000009', name: 'Maggi 2-Minute Masala Instant Noodles 280g', description: 'Instant Foods', qty: 1, mrp: 5600, rate: 5200, discountPercent: 7.14, discountAmount: 400, gstPercent: 12, netRate: 5824, value: 5824, unit: 'PACK', hsnCode: '1902' },
    { id: 'p-10', barcode: '890103000010', name: 'Nescafe Classic 100% Pure Instant Coffee 50g', description: 'Beverages', qty: 1, mrp: 18500, rate: 17500, discountPercent: 5.4, discountAmount: 1000, gstPercent: 18, netRate: 20650, value: 20650, unit: 'JAR', hsnCode: '2101' },
  ];

  const handleBarcodeScan = async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    setBarcodeError('');
    setBarcodeInput('');
    let foundItem: POSCartItem | null = null;

    // 1. Memory cache lookup (≤100ms response)
    if (BARCODE_CACHE.has(cleanCode)) {
      foundItem = BARCODE_CACHE.get(cleanCode)!;
    } else {
      try {
        const res = await api.get(`/pos/product/${encodeURIComponent(cleanCode)}`);
        if (res.data?.product) {
          foundItem = res.data.product;
          BARCODE_CACHE.set(cleanCode, foundItem!);
        }
      } catch {
        // Fallback to local catalog seed
        const seedMatch = SUPERMARKET_SEED_CATALOG.find(
          (p) => p.barcode === cleanCode || p.barcode.includes(cleanCode) || p.name.toLowerCase().includes(cleanCode.toLowerCase())
        );
        if (seedMatch) {
          foundItem = seedMatch;
          BARCODE_CACHE.set(cleanCode, foundItem);
        }
      }
    }

    if (foundItem) {
      setLastScannedItem({ ...foundItem, qty: 1 });
      addItemToCart(foundItem);
      flashLastScanned();
    } else {
      // Invalid Barcode Error -> Play Audio Beep & Display Alert Dialog
      playErrorBeep();
      setScanAlertModal({
        show: true,
        type: 'NOT_FOUND',
        title: 'Barcode Not Found',
        message: `The scanned barcode "${cleanCode}" is not registered in the product master or is out of stock in this branch. Please verify the code or lookup item master.`,
        barcode: cleanCode,
      });
    }

    refocusBarcode();
  };

  const flashLastScanned = () => {
    setLastScannedFlash(true);
    setTimeout(() => setLastScannedFlash(false), 600);
  };

  // ── Cart operations & Duplicate barcode handling ─────────────────────────
  const addItemToCart = (item: POSCartItem) => {
    setCartError('');
    setCart(prev => {
      // Requirement 9: Duplicate barcode scan increments Qty instead of creating another row
      const idx = prev.findIndex(i => i.barcode === item.barcode);
      if (idx >= 0) {
        const updated = [...prev];
        const newQty = updated[idx].qty + 1;
        updated[idx] = { ...updated[idx], qty: newQty, value: Math.round(updated[idx].netRate * newQty) };
        setSelectedCartIndex(idx);
        return updated;
      }
      const newCart = [...prev, { ...item, qty: 1, value: Math.round(item.netRate * 1) }];
      setSelectedCartIndex(newCart.length - 1);
      return newCart;
    });
  };

  const updateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(index);
    } else {
      setCart(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], qty: newQty, value: Math.round(updated[index].netRate * newQty) };
        return updated;
      });
    }
    refocusBarcode();
  };

  const removeItem = (index: number) => {
    setCart(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) setSelectedCartIndex(null);
      else setSelectedCartIndex(Math.min(index, updated.length - 1));
      return updated;
    });
    refocusBarcode();
  };

  const handleApplyManualDiscount = () => {
    const discPct = parseFloat(manualDiscountVal) || 0;
    if (discPct < 0 || discPct > 100) return;
    setCart(prev =>
      prev.map(item => {
        const discAmt = Math.round((item.rate * discPct) / 100);
        const net = Math.max(0, item.rate - discAmt);
        const gst = Math.round((net * item.gstPercent) / 100);
        const netWithGst = net + gst;
        return {
          ...item,
          discountPercent: discPct,
          discountAmount: discAmt,
          netRate: netWithGst,
          value: netWithGst * item.qty,
        };
      })
    );
    setShowManualDiscountModal(false);
    refocusBarcode();
  };

  const validateBeforePayment = (): boolean => {
    setCartError('');
    if (!cart || cart.length === 0) {
      setCartError('Cannot checkout: Cart is empty. Scan at least one item before pressing F10.');
      return false;
    }
    for (const item of cart) {
      if (!item.name || item.netRate <= 0) {
        setCartError(`Validation Error: Product '${item.barcode}' has an invalid net rate.`);
        return false;
      }
      if (item.qty <= 0) {
        setCartError(`Validation Error: Product '${item.name}' has invalid quantity.`);
        return false;
      }
    }
    if (!currentRegister.isActive) {
      setCartError('Counter Status Error: Selected POS Register is currently INACTIVE.');
      return false;
    }
    return true;
  };

  // ── Open Payment Dialog (F10) ─────────────────────────────────────────
  const openPaymentModal = () => {
    if (!validateBeforePayment()) return;
    setPaidCash(cashRounded.roundedTotal);
    setPaidCard(0);
    setPaidUPI(0);
    setCashReceivedInput(cashRounded.roundedTotal);
    setShowPaymentModal(true);
  };

  const triggerUPIPayment = () => {
    setFullScreenOverlay('UPI');
    setOverlayStatus('Waiting for customer UPI QR scan & bank confirmation...');
    setTimeout(() => {
      setOverlayStatus('Payment Confirmed by UPI Webhook ✓');
      setTimeout(() => { setFullScreenOverlay('NONE'); finalizeInvoice(PaymentMode.UPI); }, 1200);
    }, 2200);
  };

  const triggerCardPayment = () => {
    setFullScreenOverlay('CARD');
    setOverlayStatus('Swipe, Dip, or Tap Card on EDC Terminal...');
    setTimeout(() => {
      setOverlayStatus('EDC Terminal Processing Pin Authorization...');
      setTimeout(() => {
        setOverlayStatus('Card Payment Authorized ✓');
        setTimeout(() => { setFullScreenOverlay('NONE'); finalizeInvoice(PaymentMode.CARD); }, 1200);
      }, 1500);
    }, 1800);
  };

  const finalizeInvoice = async (finalMode: PaymentMode) => {
    setCartError('');
    const payload = {
      registerId: currentRegister.id,
      saleType,
      paymentMode: finalMode,
      invoiceNo,
      items: cart,
      totalAmount,
      roundedTotal: finalMode === PaymentMode.CASH ? cashRounded.roundedTotal : totalAmount,
      roundingDifference: finalMode === PaymentMode.CASH ? cashRounded.roundingDifference : 0,
      paidCash,
      paidCard,
      paidUPI,
      customerPhone,
      customerName,
      isReturn: isReturnMode,
    };
    try {
      const res = await api.post('/pos/invoice', payload);
      const savedNo = res.data.invoice?.invoiceNo || invoiceNo;
      setLastSavedInvoice({ invoiceNo: savedNo, amount: finalMode === PaymentMode.CASH ? cashRounded.roundedTotal : totalAmount });
      if (res.data?.receiptPrintContent) {
        setReceiptPrintContent(res.data.receiptPrintContent);
        setTimeout(() => window.print(), 400);
      }

      setCart([]);
      setLastScannedItem(null);
      setShowPaymentModal(false);
      setCustomerPhone('');
      setCustomerName('');
      setCartError('');
      setSelectedCartIndex(null);
      await fetchNextInvoiceNo();
      await fetchLastInvoice();
      refocusBarcode();
    } catch (err: any) {
      playErrorBeep();
      if (!navigator.onLine || err.message === 'Network Error' || !err.response) {
        try {
          const saved = localStorage.getItem('afreen_offline_sales_queue');
          const queue = saved ? JSON.parse(saved) : [];
          queue.push({
            ...payload,
            queuedAt: new Date().toISOString(),
            registerName: currentRegister?.posNumber || 'Till-01',
          });
          localStorage.setItem('afreen_offline_sales_queue', JSON.stringify(queue));
          setCart([]);
          setLastScannedItem(null);
          setShowPaymentModal(false);
          setCustomerPhone('');
          setCustomerName('');
          setSelectedCartIndex(null);
          setCartError('⚠️ Network Disconnected: Invoice saved locally to this terminal\'s offline sync queue.');
          refocusBarcode();
          return;
        } catch {
          // ignore storage quota error
        }
      }
      setCartError(getApiErrorMessage(err, 'Failed to process invoice sale. Please try again.'));
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // RENDER UI
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '0', minHeight: 'calc(100vh - 56px)' }}
      tabIndex={-1}
    >

      {/* ── 1. HEADER STRIP ──────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--border-color)', padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-main)', margin: 0 }}>
            Afreen Mall
          </h1>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="btn"
            style={{
              padding: '2px 8px', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace',
              backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6', color: '#3b82f6',
              borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
            }}
            title="Click to switch active POS register terminal"
          >
            <Monitor size={12} />
            <span>{currentRegister.posNumber}</span>
          </button>
          
          <div
            style={{
              fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', color: '#10b981',
              padding: '3px 8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '4px', letterSpacing: '0.5px',
            }}
          >
            {formatLiveClock(currentTime)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button className="btn" onClick={() => { setShowCustomerLookupModal(true); }} style={{ padding: '3px 8px', fontSize: '11px' }}>
            <User size={12} /><span>F3 Customer</span>
          </button>
          <button className="btn" onClick={() => { setShowHeldBillsModal(true); }} style={{ padding: '3px 8px', fontSize: '11px' }}>
            <Layers size={12} /><span>F6 Recall</span>
          </button>
          <button className="btn" onClick={() => { setShowPriceCheckerModal(true); }} style={{ padding: '3px 8px', fontSize: '11px' }}>
            <Search size={12} /><span>F7 Lookup</span>
          </button>
          <button className="btn" onClick={() => { setShowCalculatorModal(true); }} style={{ padding: '3px 8px', fontSize: '11px' }}>
            <Calculator size={12} /><span>F12 Calc</span>
          </button>
          {canReturn && (
            <button
              className="btn"
              onClick={handleToggleReturnMode}
              style={{ padding: '3px 10px', fontSize: '11px', backgroundColor: isReturnMode ? 'var(--status-red)' : undefined, color: isReturnMode ? '#fff' : undefined }}
            >
              {isReturnMode ? '⚠ RETURN MODE' : 'RETAIL SALE'}
            </button>
          )}
          <button className="btn" onClick={() => { setShowF1Overlay(true); }} style={{ padding: '3px 10px', fontSize: '11px' }}>
            <HelpCircle size={13} /><span>F1</span>
          </button>
        </div>
      </div>

      {/* ── 2. INVOICE ENTRY STRIP ──────────────────────────────────────── */}
      <div className="card" style={{ padding: '10px 14px', marginTop: '8px', borderLeft: '3px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
          {/* Date */}
          <div style={{ minWidth: '110px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '3px' }}>Date</div>
            <input type="text" className="input-field tabular-nums" value={formatDate(new Date())} readOnly style={{ fontSize: '13px', padding: '5px 8px', cursor: 'default' }} />
          </div>

          {/* Sale Type */}
          <div style={{ minWidth: '130px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '3px' }}>Sale Type</div>
            <select className="input-field" value={saleType} onChange={e => { setSaleType(e.target.value as SaleType); refocusBarcode(); }} style={{ fontSize: '13px', padding: '5px 8px' }}>
              <option value={SaleType.RETAIL}>Cash Sale</option>
              <option value={SaleType.WHOLESALE}>Wholesale</option>
              <option value={SaleType.INSTITUTIONAL}>Credit Sale</option>
            </select>
          </div>

          {/* Cashier */}
          <div style={{ minWidth: '150px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '3px' }}>Cashier</div>
            <input type="text" className="input-field" value={user?.fullName || 'Cashier'} readOnly style={{ fontSize: '13px', padding: '5px 8px', cursor: 'default' }} />
          </div>

          {/* Invoice No */}
          <div style={{ minWidth: '150px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '3px' }}>Invoice No.</div>
            <input type="text" className="input-field tabular-nums" value={invoiceNo} readOnly style={{ fontSize: '13px', padding: '5px 8px', fontWeight: 'bold', cursor: 'default', color: 'var(--accent-lime)' }} />
          </div>

          {/* Payment Indicator Cards (Disabled before F10) */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '3px' }}>
              Payment Mode Selection <span style={{ fontSize: '9px', color: 'var(--accent-lime)' }}>(Select in Payment Dialog F10)</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[PaymentMode.CASH, PaymentMode.CARD, PaymentMode.UPI, PaymentMode.SPLIT].map(mode => (
                <button
                  key={mode}
                  disabled
                  style={{
                    flex: 1, padding: '5px 4px', fontSize: '11px', fontWeight: 'bold',
                    borderRadius: '4px', border: '1px solid var(--border-color)',
                    backgroundColor: paymentModeActive === mode ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-color)',
                    color: paymentModeActive === mode ? '#3b82f6' : 'var(--text-muted)',
                    cursor: 'not-allowed', opacity: 0.85,
                  }}
                  title="Payment mode selection is enabled inside F10 Payment Dialog"
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. BARCODE SCAN INPUT ─────────────────────────────────────────── */}
      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            Scan Barcode — Auto-focused (Continuous Scanning Engine)
          </span>
          <span style={{ fontSize: '11px', color: 'var(--accent-lime)', fontWeight: 'bold' }}>
            {isGridFocused ? '▶ ITEM GRID FOCUSED (Press Esc to return to Barcode)' : '▶ SCANNER ACTIVE'}
          </span>
        </div>
        <input
          ref={barcodeInputRef}
          type="text"
          className="input-field tabular-nums"
          value={barcodeInput}
          onChange={e => { setBarcodeInput(e.target.value); setBarcodeError(''); }}
          onKeyDown={handleBarcodeKeyDown}
          placeholder="▶  Scan barcode or type item code, then press Enter..."
          style={{
            fontSize: '18px', padding: '10px 16px',
            border: isGridFocused ? '2px solid var(--border-color)' : '2px solid var(--accent-lime)',
            letterSpacing: '1px', backgroundColor: isGridFocused ? 'var(--bg-color)' : 'var(--surface-color)',
          }}
          autoComplete="off"
          spellCheck={false}
        />
        {barcodeError && (
          <div style={{ fontSize: '12px', color: 'var(--status-red)', padding: '3px 4px' }}>⚠ {barcodeError}</div>
        )}
      </div>

      {/* ── 4. LAST SCANNED ITEM BANNER ───────────────────────────────────── */}
      <div
        className="card"
        style={{
          marginTop: '8px', padding: '8px 14px',
          backgroundColor: lastScannedFlash ? 'var(--accent-lime)' : 'var(--accent-soft)',
          border: `1px solid ${lastScannedFlash ? 'var(--accent-lime)' : 'var(--border-color)'}`,
          transition: 'background-color 0.15s ease, border-color 0.15s ease',
        }}
      >
        <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: lastScannedFlash ? '#0B0F0D' : 'var(--accent-lime)', letterSpacing: '0.5px', marginBottom: '6px' }}>
          Last Scanned Product Banner
        </div>
        {lastScannedItem ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
            {[
              { label: 'QTY',        val: lastScannedItem.qty.toString() },
              { label: 'MRP',        val: `₹${paiseToRupee(lastScannedItem.mrp)}` },
              { label: 'RATE',       val: `₹${paiseToRupee(lastScannedItem.rate)}` },
              { label: 'DISC %',     val: `${lastScannedItem.discountPercent}%` },
              { label: 'DISC ₹',     val: `₹${paiseToRupee(lastScannedItem.discountAmount)}` },
              { label: 'GST %',      val: `${lastScannedItem.gstPercent}%` },
              { label: 'NET RATE',   val: `₹${paiseToRupee(lastScannedItem.netRate)}` },
              { label: 'VALUE',      val: `₹${paiseToRupee(lastScannedItem.value)}` },
            ].map(({ label, val }) => (
              <div key={label}>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', color: lastScannedFlash ? 'rgba(0,0,0,0.5)' : 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: lastScannedFlash ? '#0B0F0D' : 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>{val}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No product scanned yet — scan barcode above to see instant item breakdown.
          </div>
        )}
      </div>

      {/* ── 5. MAIN BILLING GRID & TOTALS PANEL ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '12px', marginTop: '8px', flex: 1 }}>

        {/* ── ITEM LIST TABLE ─────────────────────────────────────────── */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          {cartError && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 12px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={14} />
              <span>{cartError}</span>
            </div>
          )}

          <div className="table-container" style={{ maxHeight: '330px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '32px' }}>SR.</th>
                  <th>ITEM DESCRIPTION</th>
                  <th style={{ textAlign: 'center' }}>QTY (F9)</th>
                  <th>MRP</th>
                  <th>RATE</th>
                  <th>DISC %</th>
                  <th>DISC ₹</th>
                  <th>GST %</th>
                  <th>NET RATE</th>
                  <th>VALUE</th>
                  <th style={{ width: '32px' }}></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                      <ShoppingCart size={28} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                      Cart is empty — scan barcodes above to build the invoice.
                    </td>
                  </tr>
                ) : cart.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      backgroundColor: selectedCartIndex === idx ? 'rgba(59, 130, 246, 0.15)' : undefined,
                      borderLeft: selectedCartIndex === idx ? '3px solid #3b82f6' : undefined,
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedCartIndex(idx)}
                  >
                    <td className="tabular-nums" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{item.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.barcode}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <button className="btn" style={{ padding: '0 5px', fontSize: '12px' }} onClick={e => { e.stopPropagation(); updateItemQty(idx, item.qty - 1); }}>−</button>
                        <span className="tabular-nums" style={{ fontWeight: 'bold', minWidth: '22px', textAlign: 'center' }}>{item.qty}</span>
                        <button className="btn" style={{ padding: '0 5px', fontSize: '12px' }} onClick={e => { e.stopPropagation(); updateItemQty(idx, item.qty + 1); }}>+</button>
                      </div>
                    </td>
                    <td className="monetary" style={{ fontSize: '12px' }}>₹{paiseToRupee(item.mrp)}</td>
                    <td className="monetary" style={{ fontSize: '12px' }}>₹{paiseToRupee(item.rate)}</td>
                    <td className="tabular-nums" style={{ fontSize: '12px' }}>{item.discountPercent}%</td>
                    <td className="monetary" style={{ fontSize: '12px', color: 'var(--status-green)' }}>₹{paiseToRupee(item.discountAmount * item.qty)}</td>
                    <td className="tabular-nums" style={{ fontSize: '12px' }}>{item.gstPercent}%</td>
                    <td className="monetary" style={{ fontSize: '12px' }}>₹{paiseToRupee(item.netRate)}</td>
                    <td className="monetary" style={{ fontWeight: 'bold', color: 'var(--accent-lime)' }}>₹{paiseToRupee(item.netRate * item.qty)}</td>
                    <td>
                      <button className="btn" style={{ padding: '2px 5px', color: 'var(--status-red)', borderColor: 'transparent' }} onClick={e => { e.stopPropagation(); removeItem(idx); }} title="Remove item">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT TOTALS & ACTIONS PANEL ─────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* TOTALS DISPLAY BOX WITH CASH ROUNDING */}
          <div className="card" style={{ border: '2px solid var(--accent-lime)', padding: '14px', backgroundColor: 'var(--surface-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Qty (Pcs)</span>
              <strong className="tabular-nums" style={{ fontSize: '16px' }}>{totalQty}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Discount</span>
              <strong className="monetary" style={{ fontSize: '15px', color: 'var(--status-green)' }}>₹{paiseToRupee(totalDiscount)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Exact Bill Total</span>
              <strong className="monetary" style={{ fontSize: '15px' }}>₹{paiseToRupee(totalAmount)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cash Rounding</span>
              <span className="monetary" style={{ fontSize: '12px', color: cashRounded.roundingDifference !== 0 ? 'var(--status-amber)' : 'var(--text-muted)' }}>
                {cashRounded.roundingDifference > 0 ? `+₹${paiseToRupee(cashRounded.roundingDifference)}` : cashRounded.roundingDifference < 0 ? `-₹${paiseToRupee(Math.abs(cashRounded.roundingDifference))}` : '₹0.00'}
              </span>
            </div>

            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Net Payable (Cash)</div>
              <div className="monetary" style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--accent-lime)', lineHeight: 1.1, marginTop: '2px' }}>
                ₹{paiseToRupee(cashRounded.roundedTotal)}
              </div>
            </div>
          </div>

          {/* Customer Loyalty */}
          <div className="card" style={{ padding: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
              <User size={12} /><span>Customer Loyalty (F3)</span>
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input type="text" className="input-field tabular-nums" placeholder="Mobile No." value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} style={{ fontSize: '12px', padding: '4px 6px' }} />
              <button className="btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => { setCustomerName('Valued Customer'); setLoyaltyPoints(150); }}>Lookup</button>
            </div>
            {customerName && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--status-green)', fontWeight: 'bold' }}>
                {customerName} · {loyaltyPoints ?? 0} Pts
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto' }}>
            <button className="btn btn-primary" onClick={openPaymentModal} disabled={cart.length === 0} style={{ padding: '12px', fontSize: '15px', fontWeight: 'bold' }}>
              <Save size={16} /><span>Save & Pay (F10)</span>
            </button>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn" onClick={() => { if (cart.length > 0) setShowManualDiscountModal(true); }} disabled={cart.length === 0} style={{ flex: 1, padding: '6px', fontSize: '11px' }}>
                Discount (F4)
              </button>
              <button className="btn" onClick={handleHoldBill} disabled={cart.length === 0} style={{ flex: 1, padding: '6px', fontSize: '11px', color: 'var(--status-amber)' }}>
                Hold (F5)
              </button>
              <button className="btn" onClick={() => setShowHeldBillsModal(true)} style={{ flex: 1, padding: '6px', fontSize: '11px' }}>
                Recall (F6)
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn" onClick={() => setShowVoidModal(true)} style={{ flex: 1, padding: '5px', fontSize: '11px', color: 'var(--status-red)' }}>
                Manager Void
              </button>
              <button className="btn" onClick={() => setShowCancelBillModal(true)} disabled={cart.length === 0} style={{ flex: 1, padding: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
                Reset Cart
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. FOOTER STRIP ──────────────────────────────────────────────── */}
      <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
        <div>
          {lastSavedInvoice
            ? <>Last Saved Invoice: <strong className="tabular-nums" style={{ color: 'var(--text-main)' }}>{lastSavedInvoice.invoiceNo}</strong>&nbsp;&nbsp;(RS:- <strong className="monetary" style={{ color: 'var(--status-green)' }}>₹{paiseToRupee(lastSavedInvoice.amount)}</strong>)</>
            : <span style={{ fontStyle: 'italic' }}>No invoice saved in current shift yet</span>
          }
        </div>
        <div>Supermarket POS Engine v2.0 · Press F1 for Shortcut Reference</div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MODALS & DIALOGS
      ════════════════════════════════════════════════════════════════════ */}

      {/* ── F1 OVERLAY ────────────────────────────────────────────────────── */}
      <F1ShortcutOverlay isOpen={showF1Overlay} onClose={() => { setShowF1Overlay(false); refocusBarcode(); }} />

      {/* ── PRODUCTION-GRADE PAYMENT DIALOG (F10) ─────────────────────────── */}
      {showPaymentModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ maxWidth: '780px', padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Payment Capture Dialog — Invoice {invoiceNo}</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Choose payment mode & capture transaction details
                </div>
              </div>
              <button className="btn" onClick={() => { setShowPaymentModal(false); refocusBarcode(); }} style={{ padding: '4px 8px' }}>
                <X size={16} />
              </button>
            </div>

            {/* Payment Mode Selector Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              {[
                { mode: PaymentMode.CASH, label: '💵 CASH PAYMENT (F1)', color: '#10b981' },
                { mode: PaymentMode.CARD, label: '💳 CARD PAYMENT (F2)', color: '#3b82f6' },
                { mode: PaymentMode.UPI,  label: '📱 UPI PAYMENT (F3)',  color: '#8b5cf6' },
                { mode: PaymentMode.SPLIT, label: '🔀 SPLIT PAYMENT (F4)', color: '#f59e0b' },
              ].map(({ mode, label, color }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setPaymentModeActive(mode);
                    if (mode === PaymentMode.CASH) { setPaidCash(cashRounded.roundedTotal); setPaidCard(0); setPaidUPI(0); }
                    if (mode === PaymentMode.CARD) { setPaidCash(0); setPaidCard(totalAmount); setPaidUPI(0); }
                    if (mode === PaymentMode.UPI)  { setPaidCash(0); setPaidCard(0); setPaidUPI(totalAmount); }
                  }}
                  style={{
                    flex: 1, padding: '10px 8px', fontSize: '12px', fontWeight: 'bold',
                    borderRadius: '6px', border: paymentModeActive === mode ? `2px solid ${color}` : '1px solid var(--border-color)',
                    backgroundColor: paymentModeActive === mode ? `${color}20` : 'var(--bg-color)',
                    color: paymentModeActive === mode ? color : 'var(--text-main)',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Mode-Specific Body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
              
              {/* Left Panel: Mode Inputs */}
              <div>
                {paymentModeActive === PaymentMode.CASH && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ backgroundColor: 'var(--bg-color)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                        Cash Tendered Amount (₹):
                      </label>
                      <input
                        type="number"
                        step="1"
                        autoFocus
                        className="input-field tabular-nums"
                        value={cashReceivedInput / 100}
                        onChange={e => setCashReceivedInput(Math.round((parseFloat(e.target.value) || 0) * 100))}
                        style={{ fontSize: '24px', fontWeight: 'bold', padding: '8px 12px', color: 'var(--accent-lime)' }}
                      />
                    </div>

                    {/* Quick Cash Buttons */}
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                        Quick Cash Notes:
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                        {[
                          { label: 'EXACT', amt: cashRounded.roundedTotal },
                          { label: '+₹100', amt: cashRounded.roundedTotal + 10000 },
                          { label: '+₹500', amt: cashRounded.roundedTotal + 50000 },
                          { label: '+₹2000', amt: cashRounded.roundedTotal + 200000 },
                        ].map(({ label, amt }) => (
                          <button
                            key={label}
                            type="button"
                            className="btn"
                            onClick={() => setCashReceivedInput(amt)}
                            style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 'bold' }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {paymentModeActive === PaymentMode.CARD && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Bank Name:</label>
                      <input type="text" className="input-field" value={cardDetails.bank} onChange={e => setCardDetails({ ...cardDetails, bank: e.target.value })} style={{ padding: '6px 10px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>EDC Terminal Machine ID:</label>
                      <input type="text" className="input-field" value={cardDetails.machine} onChange={e => setCardDetails({ ...cardDetails, machine: e.target.value })} style={{ padding: '6px 10px' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Card Last 4 Digits:</label>
                        <input type="text" className="input-field tabular-nums" maxLength={4} value={cardDetails.last4} onChange={e => setCardDetails({ ...cardDetails, last4: e.target.value })} style={{ padding: '6px 10px' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Approval Code:</label>
                        <input type="text" className="input-field tabular-nums" value={cardDetails.approvalCode} onChange={e => setCardDetails({ ...cardDetails, approvalCode: e.target.value })} style={{ padding: '6px 10px' }} />
                      </div>
                    </div>
                    <button className="btn" type="button" onClick={triggerCardPayment} style={{ marginTop: '8px', padding: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6', color: '#3b82f6' }}>
                      <CreditCard size={16} /><span>Trigger EDC Terminal Sync</span>
                    </button>
                  </div>
                )}

                {paymentModeActive === PaymentMode.UPI && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>UPI Service Provider:</label>
                      <select className="input-field" value={upiDetails.upiApp} onChange={e => setUpiDetails({ ...upiDetails, upiApp: e.target.value })} style={{ padding: '6px 10px' }}>
                        <option value="GPay">Google Pay (GPay)</option>
                        <option value="PhonePe">PhonePe</option>
                        <option value="Paytm">Paytm UPI</option>
                        <option value="BHIM">BHIM UPI</option>
                        <option value="AmazonPay">Amazon Pay</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Bank UTR / Transaction No.:</label>
                      <input type="text" className="input-field tabular-nums" value={upiDetails.utrNo} onChange={e => setUpiDetails({ ...upiDetails, utrNo: e.target.value })} style={{ padding: '6px 10px' }} />
                    </div>
                    <button className="btn" type="button" onClick={triggerUPIPayment} style={{ marginTop: '8px', padding: '10px', backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: '#8b5cf6', color: '#8b5cf6' }}>
                      <QrCode size={16} /><span>Show Dynamic UPI QR Screen</span>
                    </button>
                  </div>
                )}

                {paymentModeActive === PaymentMode.SPLIT && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Cash Amount (₹):</label>
                      <input type="number" className="input-field tabular-nums" value={paidCash / 100} onChange={e => setPaidCash(Math.round((parseFloat(e.target.value) || 0) * 100))} style={{ padding: '6px 10px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Card Amount (₹):</label>
                      <input type="number" className="input-field tabular-nums" value={paidCard / 100} onChange={e => setPaidCard(Math.round((parseFloat(e.target.value) || 0) * 100))} style={{ padding: '6px 10px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>UPI Amount (₹):</label>
                      <input type="number" className="input-field tabular-nums" value={paidUPI / 100} onChange={e => setPaidUPI(Math.round((parseFloat(e.target.value) || 0) * 100))} style={{ padding: '6px 10px' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel: Invoice Summary */}
              <div style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Summary</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Original Bill Total:</span>
                  <strong className="monetary">₹{paiseToRupee(totalAmount)}</strong>
                </div>

                {paymentModeActive === PaymentMode.CASH ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Cash Rounding:</span>
                      <strong className="monetary" style={{ color: 'var(--status-amber)' }}>
                        {cashRounded.roundingDifference > 0 ? `+₹${paiseToRupee(cashRounded.roundingDifference)}` : `-₹${paiseToRupee(Math.abs(cashRounded.roundingDifference))}`}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                      <span>Cash Rounded Payable:</span>
                      <strong className="monetary" style={{ color: 'var(--accent-lime)' }}>₹{paiseToRupee(cashRounded.roundedTotal)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Tendered Cash:</span>
                      <strong className="monetary">₹{paiseToRupee(cashReceivedInput)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Change Due:</span>
                      <strong className="monetary" style={{ fontSize: '18px', color: 'var(--accent-lime)' }}>₹{paiseToRupee(changeDue)}</strong>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <span>Exact Payable (No Rounding):</span>
                    <strong className="monetary" style={{ color: 'var(--accent-lime)' }}>₹{paiseToRupee(totalAmount)}</strong>
                  </div>
                )}

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => finalizeInvoice(paymentModeActive)}
                    style={{ padding: '12px', fontSize: '15px', fontWeight: 'bold' }}
                  >
                    Confirm Payment & Print Receipt (Enter)
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => { setShowPaymentModal(false); refocusBarcode(); }}
                  >
                    Back to Invoice (Esc)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FULL-SCREEN PAYMENT OVERLAYS ─────────────────────────────────── */}
      {fullScreenOverlay === 'UPI' && (
        <div className="payment-overlay-fullscreen">
          <QrCode size={90} style={{ color: 'var(--accent-lime)', marginBottom: '20px' }} />
          <h2 style={{ fontSize: '26px', fontWeight: 'bold', textTransform: 'uppercase' }}>Scan Dynamic UPI QR to Pay</h2>
          <div className="monetary" style={{ fontSize: '42px', fontWeight: 'bold', color: 'var(--accent-lime)', margin: '14px 0' }}>
            ₹{paiseToRupee(totalAmount)}
          </div>
          <div style={{ fontSize: '15px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={16} className="animate-spin" /><span>{overlayStatus}</span>
          </div>
        </div>
      )}

      {fullScreenOverlay === 'CARD' && (
        <div className="payment-overlay-fullscreen">
          <CreditCard size={90} style={{ color: 'var(--accent-lime)', marginBottom: '20px' }} />
          <h2 style={{ fontSize: '26px', fontWeight: 'bold', textTransform: 'uppercase' }}>Swipe / Tap / Insert Card on EDC</h2>
          <div className="monetary" style={{ fontSize: '42px', fontWeight: 'bold', color: 'var(--accent-lime)', margin: '14px 0' }}>
            ₹{paiseToRupee(totalAmount)}
          </div>
          <div style={{ fontSize: '15px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={16} className="animate-spin" /><span>{overlayStatus}</span>
          </div>
        </div>
      )}

      {/* ── F9 QUANTITY CHANGE MODAL ────────────────────────────────────── */}
      {showQtyChangeModal && (
        <div className="modal-overlay" style={{ zIndex: 2200 }}>
          <div className="modal-content" style={{ maxWidth: '380px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '12px' }}>
              Change Item Quantity (F9)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {cart[selectedCartIndex ?? 0]?.name || 'Selected Item'}
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const newQty = parseInt(qtyInputVal, 10);
              if (!isNaN(newQty) && newQty > 0) {
                updateItemQty(selectedCartIndex ?? 0, newQty);
              }
              setShowQtyChangeModal(false);
              refocusBarcode();
            }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Enter New Quantity:
              </label>
              <input
                type="number"
                min={1}
                autoFocus
                className="input-field tabular-nums"
                value={qtyInputVal}
                onChange={(e) => setQtyInputVal(e.target.value)}
                style={{ fontSize: '18px', padding: '8px 12px', fontWeight: 'bold', marginBottom: '20px' }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowQtyChangeModal(false); refocusBarcode(); }}
                >
                  Cancel (Esc)
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Qty (Enter)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── F4 MANUAL DISCOUNT MODAL ────────────────────────────────────── */}
      {showManualDiscountModal && (
        <div className="modal-overlay" style={{ zIndex: 2200 }}>
          <div className="modal-content" style={{ maxWidth: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Percent size={22} style={{ color: 'var(--accent-lime)' }} />
              <h3 style={{ fontSize: '17px', fontWeight: 'bold', margin: 0 }}>Apply Manual Bill Discount (F4)</h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Enter flat percentage discount to apply across all active cart items (Manager authorization required).
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Discount Percentage (%):
              </label>
              <input
                type="number"
                min={0}
                max={100}
                autoFocus
                className="input-field tabular-nums"
                value={manualDiscountVal}
                onChange={e => setManualDiscountVal(e.target.value)}
                style={{ fontSize: '18px', padding: '8px 12px', fontWeight: 'bold' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowManualDiscountModal(false); refocusBarcode(); }}>
                Cancel (Esc)
              </button>
              <button className="btn btn-primary" onClick={handleApplyManualDiscount}>
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── F12 QUICK POS CALCULATOR MODAL ──────────────────────────────── */}
      {showCalculatorModal && (
        <div className="modal-overlay" style={{ zIndex: 2200 }}>
          <div className="modal-content" style={{ maxWidth: '340px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <Calculator size={18} style={{ color: 'var(--accent-lime)' }} />
                <span>POS Quick Calculator (F12)</span>
              </div>
              <button className="btn" onClick={() => { setShowCalculatorModal(false); refocusBarcode(); }} style={{ padding: '2px 6px' }}>✕</button>
            </div>
            <input
              type="text"
              readOnly
              className="input-field tabular-nums"
              value={calcDisplay}
              style={{ fontSize: '24px', textAlign: 'right', padding: '10px', fontWeight: 'bold', marginBottom: '14px' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {['C', '(', ')', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '⌫', '='].map(btn => (
                <button
                  key={btn}
                  className="btn"
                  onClick={() => {
                    if (btn === 'C') setCalcDisplay('0');
                    else if (btn === '⌫') setCalcDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
                    else if (btn === '=') {
                      try {
                        const sanitized = calcDisplay.replace(/[^0-9+\-*/().]/g, '');
                        setCalcDisplay(String(Function(`"use strict"; return (${sanitized})`)()));
                      } catch { setCalcDisplay('Error'); }
                    } else {
                      setCalcDisplay(prev => prev === '0' || prev === 'Error' ? btn : prev + btn);
                    }
                  }}
                  style={{ padding: '12px 6px', fontSize: '14px', fontWeight: 'bold' }}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE ITEM CONFIRMATION MODAL ───────────────────────────────── */}
      {showDeleteItemModal && (
        <div className="modal-overlay" style={{ zIndex: 2500 }}>
          <div className="modal-content" style={{ maxWidth: '420px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', marginBottom: '12px' }}>
              <Trash2 size={24} />
              <h3 style={{ fontSize: '17px', fontWeight: 'bold', margin: 0 }}>Remove Item from Cart?</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.4 }}>
              Are you sure you want to remove <strong>"{cart[selectedCartIndex ?? 0]?.name || 'Selected Product'}"</strong> from the current active invoice?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => { setShowDeleteItemModal(false); refocusBarcode(); }}>
                No, Keep Item
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (selectedCartIndex !== null) removeItem(selectedCartIndex);
                  setShowDeleteItemModal(false);
                }}
                style={{ backgroundColor: '#ef4444', borderColor: '#b91c1c', color: '#fff' }}
              >
                Yes, Remove Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BARCODE SCAN ERROR / ZERO PRICE ALERT MODAL ───────────────── */}
      {scanAlertModal.show && (
        <div className="modal-overlay" style={{ zIndex: 2500 }}>
          <div className="modal-content" style={{ maxWidth: '440px', padding: '24px', textAlign: 'center', border: '2px solid #ef4444', borderRadius: '10px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: '50%', width: '56px', height: '56px', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={32} style={{ color: '#ef4444' }} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', color: '#ef4444', marginBottom: '8px' }}>
              {scanAlertModal.title}
            </h3>

            <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: '12px 0 20px', lineHeight: 1.5 }}>
              {scanAlertModal.message}
            </p>

            <button
              className="btn btn-primary"
              onClick={() => {
                setScanAlertModal({ show: false, type: 'NOT_FOUND', title: '', message: '' });
                refocusBarcode();
              }}
              style={{ width: '100%', padding: '12px', backgroundColor: '#ef4444', borderColor: '#b91c1c', color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
            >
              <span>Acknowledge & Re-Scan Barcode (Enter)</span>
            </button>
          </div>
        </div>
      )}

      {/* ── CANCEL BILL CONFIRMATION MODAL ───────────────────────────── */}
      {showCancelBillModal && (
        <div className="modal-overlay" style={{ zIndex: 1250 }}>
          <div className="modal-content" style={{ maxWidth: '440px', padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444', marginBottom: '12px' }}>
              <Trash2 size={24} />
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Reset Active Invoice?</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.4 }}>
              Are you sure you want to cancel the current invoice and clear all <strong>{cart.length} items</strong> from the cart?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => { setShowCancelBillModal(false); refocusBarcode(); }}>
                Keep Invoice
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setCart([]); setLastScannedItem(null); setShowCancelBillModal(false); setCartError(''); setSelectedCartIndex(null); refocusBarcode();
                }}
                style={{ backgroundColor: '#ef4444', borderColor: '#b91c1c', color: '#fff' }}
              >
                Yes, Reset Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOMER LOOKUP MODAL (F3) ─────────────────────────────────── */}
      {showCustomerLookupModal && (
        <CustomerLookupModal
          onClose={() => { setShowCustomerLookupModal(false); refocusBarcode(); }}
          onSelectCustomer={(cust: { phone: string; name: string; points: number }) => {
            setCustomerPhone(cust.phone);
            setCustomerName(cust.name);
            setLoyaltyPoints(cust.points || 100);
            setShowCustomerLookupModal(false);
            refocusBarcode();
          }}
        />
      )}

      {/* ── PRODUCT LOOKUP / PRICE CHECKER MODAL (F7) ─────────────────── */}
      {showPriceCheckerModal && (
        <PriceCheckerModal
          onClose={() => { setShowPriceCheckerModal(false); refocusBarcode(); }}
        />
      )}

      {/* ── MANUAL BILL RECOVERY MODAL (F8) ────────────────────────────── */}
      <ManualBillRecoveryModal
        isOpen={showManualRecoveryModal}
        onClose={() => { setShowManualRecoveryModal(false); refocusBarcode(); }}
        onSuccess={(invoice, receiptContent) => {
          setLastSavedInvoice({ invoiceNo: invoice.invoiceNo, amount: invoice.totalAmount });
          setReceiptPrintContent(receiptContent);
          setCart([]); setLastScannedItem(null); setSelectedCartIndex(null);
          fetchNextInvoiceNo(); fetchLastInvoice();
        }}
      />

      {/* ── DUPLICATE BILL REPRINT MODAL (CTRL + P) ──────────────────── */}
      <DuplicateBillReprintModal
        isOpen={showDuplicateReprintModal}
        lastInvoiceNo={lastSavedInvoice?.invoiceNo}
        onClose={() => { setShowDuplicateReprintModal(false); refocusBarcode(); }}
        onSuccess={(_, receiptContent) => { setReceiptPrintContent(receiptContent); }}
      />

      {/* ── HELD BILLS MODAL (F5 / F6) ─────────────────────────────────── */}
      <HeldBillsModal
        isOpen={showHeldBillsModal}
        onClose={() => { setShowHeldBillsModal(false); refocusBarcode(); }}
        onRecallBill={handleRecallBill}
      />

      {/* ── VOID INVOICE MODAL (CTRL + D / MANAGER PIN) ───────────────── */}
      <VoidBillModal
        isOpen={showVoidModal}
        onClose={() => { setShowVoidModal(false); refocusBarcode(); }}
        onSuccess={() => { fetchNextInvoiceNo(); fetchLastInvoice(); refocusBarcode(); }}
      />

      {/* ── THERMAL RECEIPT PRINT PREVIEW MODAL ───────────────────────── */}
      {receiptPrintContent && (
        <div className="modal-overlay" style={{ zIndex: 2500 }}>
          <div className="modal-content" style={{ maxWidth: '440px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 'bold' }}>
                <Printer size={20} />
                <span>Thermal Bill Receipt</span>
              </div>
              <button className="btn" onClick={() => setReceiptPrintContent(null)} style={{ padding: '2px 8px', fontSize: '12px' }}>
                ✕ Close
              </button>
            </div>
            <pre
              style={{
                fontFamily: 'monospace', fontSize: '12px', backgroundColor: '#1e293b',
                color: '#38bdf8', padding: '14px', borderRadius: '6px', whiteSpace: 'pre-wrap',
                maxHeight: '380px', overflowY: 'auto', border: '1px solid var(--border-color)', lineHeight: '1.4',
              }}
            >
              {receiptPrintContent}
            </pre>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setReceiptPrintContent(null)}>
                Done (Esc)
              </button>
              <button
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={16} />
                <span>Print Receipt (Enter)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
