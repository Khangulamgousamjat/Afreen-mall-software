import { Router, Response } from 'express';
import { prisma } from '../../prisma.js';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';
import bcrypt from 'bcrypt';
import { PaymentMode, SaleType, RoleName } from '@afreen-mall/shared-types';

const router = Router();
router.use(authenticateToken);

// ── Store-Wide Multi-Terminal Held Bills API ─────────────────────────────────

// GET /api/v1/pos/held-bills - List all store-wide held bills
router.get('/held-bills', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bills = await prisma.heldBill.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const parsedBills = bills.map((b) => ({
      id: b.id,
      holdNo: b.holdNo,
      registerId: b.registerId,
      registerName: b.registerName,
      cashierName: b.cashierName,
      customerPhone: b.customerPhone,
      customerName: b.customerName,
      note: b.note,
      totalAmountPaise: b.totalAmountPaise,
      createdAt: b.createdAt,
      items: JSON.parse(b.cartJson),
    }));
    return res.json({ heldBills: parsedBills });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch store-wide held bills' });
  }
});

// POST /api/v1/pos/held-bills - Hold a bill across store terminals
router.post('/held-bills', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items, customerPhone, customerName, note, registerId, registerName, totalAmountPaise } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty. Cannot hold empty bill.' });
    }

    const count = await prisma.heldBill.count();
    const holdNo = `HOLD-${String(count + 1).padStart(4, '0')}`;

    const heldBill = await prisma.heldBill.create({
      data: {
        holdNo,
        registerId: registerId || null,
        registerName: registerName || 'Till-01',
        cashierName: req.user?.fullName || 'Cashier',
        customerPhone: customerPhone || null,
        customerName: customerName || null,
        note: note || null,
        totalAmountPaise: totalAmountPaise || items.reduce((sum: number, i: any) => sum + (i.finalTotal || 0), 0),
        cartJson: JSON.stringify(items),
      },
    });

    return res.status(201).json({
      message: `Bill ${holdNo} held successfully on server (synced across all store terminals)!`,
      heldBill: {
        ...heldBill,
        items,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to hold bill on server' });
  }
});

// DELETE /api/v1/pos/held-bills/:id - Recall & remove a held bill
router.delete('/held-bills/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const bill = await prisma.heldBill.findUnique({ where: { id } });

    if (!bill) {
      return res.status(404).json({ error: 'Held bill not found' });
    }

    await prisma.heldBill.delete({ where: { id } });
    return res.json({ message: `Held bill ${bill.holdNo} recalled and removed from server.` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to recall held bill' });
  }
});
router.get('/registers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const registers = await prisma.register.findMany({
      where: { isActive: true },
      orderBy: { posNumber: 'asc' },
    });
    return res.json({ registers });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch registers' });
  }
});

// GET /api/v1/pos/product/:barcode - Fast barcode scan lookup with weighted scale support
router.get('/product/:barcode', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let { barcode } = req.params;
    let weighedQty: number | null = null;

    // Check EAN-13 / UPC scale-weighed embedded barcode (Prefix 20 or 21, length 12 or 13)
    if ((barcode.startsWith('20') || barcode.startsWith('21')) && (barcode.length === 12 || barcode.length === 13)) {
      const itemCode = barcode.substring(2, 7); // 5 digit product code
      const weightVal = parseInt(barcode.substring(7, 12), 10); // weight in grams
      weighedQty = weightVal / 1000; // e.g. 500g -> 0.5 kg

      const weightedMatch = await prisma.product.findFirst({
        where: {
          OR: [
            { barcode: { contains: itemCode } },
            { barcode },
          ],
        },
        include: { category: true, unit: true, taxRate: true, hsnCode: true, inventory: true },
      });

      if (weightedMatch) {
        const mrp = weightedMatch.mrp;
        const rate = weightedMatch.saleRate;
        const discountAmt = Math.round(mrp * (weightedMatch.discountPct / 100));
        const gstPct = weightedMatch.taxRate.rate;
        const netRate = Math.round(rate * (1 + gstPct / 100));

        return res.json({
          product: {
            id: weightedMatch.id,
            barcode: weightedMatch.barcode,
            name: weightedMatch.name,
            description: weightedMatch.description,
            mrp,
            rate,
            discountPercent: weightedMatch.discountPct,
            discountAmount: discountAmt,
            gstPercent: gstPct,
            netRate,
            value: netRate,
            unit: weightedMatch.unit.name,
            hsnCode: weightedMatch.hsnCode?.code || '1905',
            stock: weightedMatch.inventory?.currentStock || 0,
            weighedQty,
          },
        });
      }
    }

    const product: any = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode: { equals: barcode, mode: 'insensitive' } },
          { name: { contains: barcode, mode: 'insensitive' } },
        ],
      },
      include: {
        category: true,
        unit: true,
        taxRate: true,
        hsnCode: true,
        inventory: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        notFound: true,
        error: `No product found with barcode or name matching '${barcode}'`,
      });
    }

    // Convert values to paise representation & calculate net rate
    const mrp = product.mrp || 0; // paise
    const rate = product.saleRate || 0; // paise
    const discountPct = product.discountPct || 0;
    const discountAmt = Math.round(mrp * (discountPct / 100));
    const gstPct = product.taxRate?.rate || 0;
    const netRate = Math.round(rate * (1 + gstPct / 100));

    return res.json({
      product: {
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        description: product.description || '',
        mrp,
        rate,
        discountPercent: discountPct,
        discountAmount: discountAmt,
        gstPercent: gstPct,
        netRate,
        value: netRate,
        unit: product.unit?.name || 'PCS',
        hsnCode: product.hsnCode?.code || '1905',
        stock: product.inventory?.currentStock || 0,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error looking up barcode' });
  }
});

// POST /api/v1/pos/invoice - Save Invoice / Sale Return inside DB transaction
router.post('/invoice', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      registerId,
      saleType,
      paymentMode,
      items,
      paidCash = 0,
      paidCard = 0,
      paidUPI = 0,
      customerPhone,
      customerName,
      isReturn = false,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invoice must contain at least one item' });
    }

    const register = await prisma.register.findUnique({ where: { id: registerId || 'reg-01' } });
    const regId = register ? register.id : (await prisma.register.findFirst())?.id;

    if (!regId) {
      return res.status(400).json({ error: 'Invalid POS register' });
    }

    // Calculate total quantity, total discount, and total bill amount
    let totalQty = 0;
    let totalDiscount = 0;
    let totalAmount = 0;

    for (const item of items) {
      totalQty += item.qty;
      totalDiscount += (item.discountAmount || 0) * item.qty;
      totalAmount += (item.netRate || item.rate) * item.qty;
    }

    const totalPaid = paidCash + paidCard + paidUPI;
    const changeDue = totalPaid > totalAmount ? totalPaid - totalAmount : 0;

    // Run inside database transaction for stock atomicity & accounting ledger creation
    const result = await prisma.$transaction(async (tx: any) => {
      // Generate sequential invoice number: AFM-2026-XXXXXX
      const year = new Date().getFullYear();
      const totalCount = await tx.sale.count();
      const invoiceNo = `AFM-${year}-${(totalCount + 1).toString().padStart(6, '0')}`;

      // Create Sale Record
      const sale = await tx.sale.create({
        data: {
          invoiceNo,
          registerId: regId,
          saleType: (saleType as SaleType) || SaleType.RETAIL,
          cashierStaffId: req.user!.staffId,
          cashierName: req.user!.fullName,
          paymentMode: (paymentMode as PaymentMode) || PaymentMode.CASH,
          totalQty,
          totalDiscount,
          totalAmount,
          paidCash,
          paidCard,
          paidUPI,
          changeDue,
          customerPhone,
          customerName,
          status: isReturn ? 'RETURNED' : 'COMPLETED',
          items: {
            create: items.map((item: any) => ({
              productId: item.id,
              qty: item.qty,
              mrp: item.mrp,
              rate: item.rate,
              discountPct: item.discountPercent || 0,
              discountAmt: item.discountAmount || 0,
              gstPct: item.gstPercent || 0,
              netRate: item.netRate || item.rate,
              totalValue: (item.netRate || item.rate) * item.qty,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      // Update Inventory & Record StockMovement
      for (const item of items) {
        const inventory = await tx.inventory.findUnique({ where: { productId: item.id } });
        if (inventory) {
          const qtyChange = isReturn ? item.qty : -item.qty;
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { currentStock: { increment: qtyChange } },
          });

          await tx.stockMovement.create({
            data: {
              inventoryId: inventory.id,
              type: isReturn ? 'SALE_RETURN' : 'SALE',
              quantity: qtyChange,
              referenceId: sale.id,
              notes: `POS Invoice ${invoiceNo}`,
            },
          });
        }
      }

      // If customer phone exists, add loyalty points (1 point per ₹100 spent)
      if (customerPhone) {
        const pointsEarned = Math.floor(totalAmount / 10000); // 10000 paise = ₹100
        await tx.customer.upsert({
          where: { phone: customerPhone },
          update: {
            loyaltyPoints: { increment: pointsEarned },
            lastVisit: new Date(),
          },
          create: {
            phone: customerPhone,
            fullName: customerName || 'Valued Shopper',
            loyaltyPoints: pointsEarned,
          },
        });
      }

      return sale;
    }, { timeout: 30000, maxWait: 10000 });

    const luckyDrawTicket = result.totalAmount >= 100000
      ? `\n----------------------------------------\n🎉 LUCKY DRAW CAMPAIGN ELIGIBLE!\nLucky Draw Ticket: LD-2026-${Math.floor(100000 + Math.random() * 900000)}\nKeep this receipt for Mega Draw!`
      : '';

    // Generate formatted thermal receipt string with embedded barcode string
    const formattedReceipt = `
========================================
             AFREEN MALL
     City Center, Sector 4, Main Hub
         GSTIN: 27AAAAA0000A1Z5
========================================
Invoice No : ${result.invoiceNo}
Date       : ${new Date(result.createdAt).toLocaleString()}
Cashier    : ${result.cashierName} (ID: ${result.cashierStaffId})
Type       : ${result.saleType}
----------------------------------------
${result.items
  .map(
    (i: any) =>
      `${i.product.name.slice(0, 20).padEnd(20)} x${i.qty}  ₹${(i.totalValue / 100).toFixed(2)}`
  )
  .join('\n')}
----------------------------------------
Total Qty  : ${result.totalQty} pcs
Total Disc : ₹${(result.totalDiscount / 100).toFixed(2)}
TOTAL BILL : ₹${(result.totalAmount / 100).toFixed(2)}
Paid Cash  : ₹${(result.paidCash / 100).toFixed(2)}
Paid Card  : ₹${(result.paidCard / 100).toFixed(2)}
Paid UPI   : ₹${(result.paidUPI / 100).toFixed(2)}
Change Due : ₹${(result.changeDue / 100).toFixed(2)}${luckyDrawTicket}
========================================
[ BARCODE: *${result.invoiceNo}* ]
Software by Gous Khan · Mobile: 8625076618
gousk2004@gmail.com
========================================
    `;

    return res.status(201).json({
      invoice: result,
      receiptPrintContent: formattedReceipt,
      message: 'Invoice processed successfully',
    });
  } catch (err: any) {
    console.error('Invoice error:', err);
    return res.status(500).json({ error: 'Failed to save invoice' });
  }
});

// GET /api/v1/pos/invoices - Recent sales history
router.get('/invoices', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sales = await prisma.sale.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } } },
    });
    return res.json({ sales });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET /api/v1/pos/next-invoice-number - Sequential invoice number for next sale
router.get('/next-invoice-number', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = await prisma.sale.count();
    const nextNum = (count + 1).toString().padStart(6, '0');
    return res.json({ invoice_number: `INV-${nextNum}` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate invoice number' });
  }
});

// GET /api/v1/pos/last-invoice - Most recent completed sale for this cashier
router.get('/last-invoice', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const last = await prisma.sale.findFirst({
      where: { cashierStaffId: req.user!.staffId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNo: true, totalAmount: true },
    });
    if (!last) return res.json(null);
    return res.json({ invoice_number: last.invoiceNo, total_paise: last.totalAmount });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch last invoice' });
  }
});

// GET /api/v1/pos/check-transaction-id/:transactionId - Check if transaction ID was already used
router.get('/check-transaction-id/:transactionId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { transactionId } = req.params;
    if (!transactionId || !transactionId.trim()) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const existingSale = await prisma.sale.findFirst({
      where: { transactionId: transactionId.trim() },
    });

    if (existingSale) {
      return res.json({
        exists: true,
        invoiceNo: existingSale.invoiceNo,
        amount: existingSale.totalAmount,
        createdAt: existingSale.createdAt,
        message: `Transaction ID '${transactionId}' has already been used to generate bill ${existingSale.invoiceNo}.`,
      });
    }

    return res.json({ exists: false });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to check transaction ID' });
  }
});

// POST /api/v1/pos/recover-bill - Manual bill recovery (Shift + F8)
router.post('/recover-bill', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const allowedRoles = ['CASH_OFFICER', 'STORE_MANAGER', 'REGIONAL_MANAGER', 'SUPER_ADMIN', 'ACCOUNTANT', 'AUDITOR'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Access Restricted: Manual bill recovery requires Cash Officer role or higher.',
      });
    }

    const {
      transactionId,
      amount, // in paise
      paymentMode,
      registerId,
      customerPhone,
      customerName,
      cartItems = [],
    } = req.body;

    const cleanTxId = (transactionId || '').trim();
    if (!cleanTxId) {
      return res.status(400).json({ error: 'Transaction ID is required.' });
    }

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount paid must be greater than 0.' });
    }

    if (paymentMode !== PaymentMode.CARD && paymentMode !== PaymentMode.UPI) {
      return res.status(400).json({ error: 'Payment mode must be either Card or UPI.' });
    }

    // Check duplicate Transaction ID
    const duplicate = await prisma.sale.findFirst({
      where: { transactionId: cleanTxId },
    });

    if (duplicate) {
      return res.status(400).json({
        error: `Duplicate Blocked: Transaction ID '${cleanTxId}' has already been used to generate bill ${duplicate.invoiceNo}.`,
      });
    }

    const register = await prisma.register.findUnique({ where: { id: registerId || 'reg-01' } });
    const regId = register ? register.id : (await prisma.register.findFirst())?.id || 'reg-01';

    const paidCard = paymentMode === PaymentMode.CARD ? numAmount : 0;
    const paidUPI = paymentMode === PaymentMode.UPI ? numAmount : 0;

    const result = await prisma.$transaction(async (tx: any) => {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const countToday = await tx.sale.count();
      const invoiceNo = `INV-${dateStr}-${(countToday + 1).toString().padStart(4, '0')}`;

      // Handle items array
      const itemsToCreate = Array.isArray(cartItems) && cartItems.length > 0
        ? cartItems
        : [{
            productId: (await tx.product.findFirst())?.id || 'manual-item',
            qty: 1,
            mrp: numAmount,
            rate: numAmount,
            discountPct: 0,
            discountAmt: 0,
            gstPct: 0,
            netRate: numAmount,
            totalValue: numAmount,
          }];

      const totalQty = itemsToCreate.reduce((sum: number, i: any) => sum + (i.qty || 1), 0);

      const sale = await tx.sale.create({
        data: {
          invoiceNo,
          registerId: regId,
          saleType: SaleType.RETAIL,
          cashierStaffId: req.user!.staffId,
          cashierName: req.user!.fullName,
          paymentMode,
          totalQty,
          totalDiscount: 0,
          totalAmount: numAmount,
          paidCash: 0,
          paidCard,
          paidUPI,
          changeDue: 0,
          customerPhone,
          customerName,
          transactionId: cleanTxId,
          isManuallyRecovered: true,
          recoveredByStaffId: req.user!.staffId,
          recoveredAt: new Date(),
          status: 'COMPLETED',
          items: {
            create: itemsToCreate.map((item: any) => ({
              productId: item.id || item.productId,
              qty: item.qty || 1,
              mrp: item.mrp || numAmount,
              rate: item.rate || numAmount,
              discountPct: item.discountPercent || item.discountPct || 0,
              discountAmt: item.discountAmount || item.discountAmt || 0,
              gstPct: item.gstPercent || item.gstPct || 0,
              netRate: item.netRate || item.rate || numAmount,
              totalValue: (item.netRate || item.rate || numAmount) * (item.qty || 1),
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      // Log Audit Entry for manual recovery
      await tx.auditLog.create({
        data: {
          staffId: req.user!.staffId,
          userName: req.user!.fullName,
          userRole: req.user!.role,
          action: 'MANUAL_BILL_RECOVERY',
          entityName: 'Sale',
          entityId: sale.id,
          reason: `Manual bill recovery for ${paymentMode} payment with Transaction ID ${cleanTxId}`,
          afterValue: {
            transactionId: cleanTxId,
            amount: numAmount,
            paymentMode,
            invoiceNo,
            recoveredBy: req.user!.fullName,
          },
        },
      });

      return sale;
    }, { timeout: 30000, maxWait: 10000 });

    const formattedReceipt = `
========================================
             AFREEN MALL
     City Center, Sector 4, Main Hub
         GSTIN: 27AAAAA0000A1Z5
========================================
Invoice No : ${result.invoiceNo} [RECOVERED]
Date       : ${new Date(result.createdAt).toLocaleString()}
Cashier    : ${result.cashierName} (ID: ${result.cashierStaffId})
Type       : ${result.saleType}
----------------------------------------
Txn ID     : ${result.transactionId}
Mode       : ${result.paymentMode} (MANUAL RECOVERY)
----------------------------------------
${result.items
  .map(
    (i: any) =>
      `${(i.product?.name || 'Manual Item').slice(0, 20).padEnd(20)} x${i.qty}  ₹${(i.totalValue / 100).toFixed(2)}`
  )
  .join('\n')}
----------------------------------------
TOTAL BILL : ₹${(result.totalAmount / 100).toFixed(2)}
Paid ${result.paymentMode}  : ₹${(result.totalAmount / 100).toFixed(2)}
Status     : Complete (Verified & Recovered)
========================================
[ BARCODE: *${result.invoiceNo}* ]
Recovered By Cash Officer (ID: ${req.user!.staffId})
Software by Gous Khan · Mobile: 8625076618
========================================
    `;

    return res.status(201).json({
      invoice: result,
      receiptPrintContent: formattedReceipt,
      message: 'Bill recovered successfully',
    });
  } catch (err: any) {
    console.error('Bill recovery error:', err);
    return res.status(500).json({ error: err.message || 'Failed to recover bill' });
  }
});

// GET /api/v1/pos/invoice-by-number/:invoiceNo - Search invoice by number
router.get('/invoice-by-number/:invoiceNo', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { invoiceNo } = req.params;
    const sale = await prisma.sale.findFirst({
      where: { invoiceNo: invoiceNo.trim() },
      include: { items: { include: { product: true } } },
    });

    if (!sale) {
      return res.status(404).json({ error: `Invoice '${invoiceNo}' not found.` });
    }

    return res.json({ sale });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// POST /api/v1/pos/reprint-duplicate - Reprint duplicate bill (Ctrl + F5)
router.post('/reprint-duplicate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const allowedRoles = ['CASH_OFFICER', 'STORE_MANAGER', 'REGIONAL_MANAGER', 'SUPER_ADMIN', 'ACCOUNTANT', 'AUDITOR'];

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Access Denied: Duplicate bill printing requires Cash Officer or Manager authorization.',
      });
    }

    const { invoiceNo, reason } = req.body;
    const cleanInvoiceNo = (invoiceNo || '').trim();

    if (!cleanInvoiceNo) {
      return res.status(400).json({ error: 'Invoice number is required.' });
    }

    const sale = await prisma.sale.findFirst({
      where: { invoiceNo: cleanInvoiceNo },
      include: { items: { include: { product: true } } },
    });

    if (!sale) {
      return res.status(404).json({ error: `Invoice '${cleanInvoiceNo}' not found.` });
    }

    const nextReprintCount = (sale.reprintCount || 0) + 1;

    // Update sale reprint count and log audit inside transaction
    const updatedSale = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.sale.update({
        where: { id: sale.id },
        data: { reprintCount: nextReprintCount },
        include: { items: { include: { product: true } } },
      });

      await tx.auditLog.create({
        data: {
          staffId: req.user!.staffId,
          userName: req.user!.fullName,
          userRole: req.user!.role,
          action: 'DUPLICATE_BILL_REPRINT',
          entityName: 'Sale',
          entityId: sale.id,
          reason: reason || 'Duplicate bill print requested',
          afterValue: {
            invoiceNo: cleanInvoiceNo,
            reprintCount: nextReprintCount,
            reprintedBy: req.user!.fullName,
            reprintedAt: new Date().toISOString(),
          },
        },
      });

      return updated;
    });

    const formattedDuplicateReceipt = `
========================================
         *** DUPLICATE COPY ***
        (NOT AN ORIGINAL RECEIPT)
========================================
             AFREEN MALL
     City Center, Sector 4, Main Hub
         GSTIN: 27AAAAA0000A1Z5
========================================
Invoice No : ${updatedSale.invoiceNo}
Reprint #  : ${nextReprintCount}
Date       : ${new Date(updatedSale.createdAt).toLocaleString()}
Original   : ${updatedSale.cashierName} (ID: ${updatedSale.cashierStaffId})
Type       : ${updatedSale.saleType}
----------------------------------------
${updatedSale.items
  .map(
    (i: any) =>
      `${(i.product?.name || 'Item').slice(0, 20).padEnd(20)} x${i.qty}  ₹${(i.totalValue / 100).toFixed(2)}`
  )
  .join('\n')}
----------------------------------------
TOTAL BILL : ₹${(updatedSale.totalAmount / 100).toFixed(2)}
Payment    : ${updatedSale.paymentMode}
----------------------------------------
Reason     : ${reason || 'Customer / Printer Reprint Request'}
Reprinted  : ${req.user!.fullName} (Staff ID: ${req.user!.staffId})
Timestamp  : ${new Date().toLocaleString()}
========================================
[ BARCODE: *${updatedSale.invoiceNo}* ]
         *** DUPLICATE COPY ***
Software by Gous Khan · Mobile: 8625076618
========================================
    `;

    return res.status(200).json({
      invoice: updatedSale,
      receiptPrintContent: formattedDuplicateReceipt,
      message: 'Duplicate bill prepared for printing.',
    });
  } catch (err: any) {
    console.error('Duplicate reprint error:', err);
    return res.status(500).json({ error: err.message || 'Failed to reprint duplicate bill' });
  }
});

// POST /api/v1/pos/void - Manager Authorized Invoice Void
router.post('/void', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { invoiceNo, managerPin, reason } = req.body;

    if (!invoiceNo || !reason) {
      return res.status(400).json({ error: 'Invoice Number and Void Reason are required' });
    }

    let isAuthorized =
      req.user!.role === RoleName.SUPER_ADMIN ||
      req.user!.role === RoleName.STORE_MANAGER ||
      req.user!.role === RoleName.REGIONAL_MANAGER ||
      req.user!.role === RoleName.COMPANY_ADMIN;

    if (!isAuthorized && managerPin) {
      const managers = await prisma.user.findMany({
        where: {
          role: { in: [RoleName.SUPER_ADMIN, RoleName.STORE_MANAGER, RoleName.REGIONAL_MANAGER, RoleName.COMPANY_ADMIN] },
          isDeactivated: false,
          deletedAt: null,
        },
      });

      for (const mgr of managers) {
        if (await bcrypt.compare(String(managerPin), mgr.passwordHash)) {
          isAuthorized = true;
          break;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Permission Denied: Invoice Void requires valid Store Manager credentials.' });
    }

    const sale = await prisma.sale.findUnique({
      where: { invoiceNo },
      include: { items: true },
    });

    if (!sale) {
      return res.status(404).json({ error: `Invoice '${invoiceNo}' not found` });
    }

    if (sale.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Invoice is already voided / cancelled' });
    }

    const voidedSale = await prisma.$transaction(async (tx) => {
      const updated = await tx.sale.update({
        where: { id: sale.id },
        data: { status: 'CANCELLED' },
      });

      for (const item of sale.items) {
        const inventory = await tx.inventory.findUnique({ where: { productId: item.productId } });
        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { currentStock: { increment: item.qty } },
          });

          await tx.stockMovement.create({
            data: {
              inventoryId: inventory.id,
              type: 'STOCK_IN',
              quantity: item.qty,
              referenceId: sale.id,
              notes: `Voided Invoice ${invoiceNo} - Reason: ${reason}`,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          staffId: req.user!.staffId,
          userName: req.user!.fullName,
          userRole: req.user!.role,
          action: 'VOID_INVOICE',
          entityName: 'Sale',
          entityId: sale.id,
          reason: `Invoice ${invoiceNo} voided by Manager ${req.user!.fullName}. Reason: ${reason}`,
          beforeValue: { status: sale.status, totalAmount: sale.totalAmount },
          afterValue: { status: 'CANCELLED' },
        },
      });

      return updated;
    });

    return res.json({
      sale: voidedSale,
      message: `Invoice ${invoiceNo} voided successfully. Stock restored.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to void invoice' });
  }
});

// POST /api/v1/pos/sync-offline-queue - Upload queued offline sales idempotently
router.post('/sync-offline-queue', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { offlineSales } = req.body;

    if (!Array.isArray(offlineSales) || offlineSales.length === 0) {
      return res.status(400).json({ error: 'offlineSales array is required and cannot be empty' });
    }

    const syncedInvoices: string[] = [];

    for (const draft of offlineSales) {
      const existing = await prisma.sale.findUnique({ where: { invoiceNo: draft.invoiceNo } });
      if (existing) {
        syncedInvoices.push(existing.invoiceNo);
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.create({
          data: {
            invoiceNo: draft.invoiceNo,
            registerId: draft.registerId || 'reg-01',
            saleType: (draft.saleType as any) || SaleType.RETAIL,
            cashierStaffId: req.user!.staffId,
            cashierName: req.user!.fullName,
            paymentMode: (draft.paymentMode as any) || PaymentMode.CASH,
            totalQty: draft.totalQty || 1,
            totalDiscount: draft.totalDiscount || 0,
            totalAmount: draft.totalAmount,
            paidCash: draft.paidCash || 0,
            paidCard: draft.paidCard || 0,
            paidUPI: draft.paidUPI || 0,
            changeDue: draft.changeDue || 0,
            customerPhone: draft.customerPhone,
            customerName: draft.customerName,
            status: 'COMPLETED',
          },
        });

        for (const item of (draft.items || [])) {
          const inventory = await tx.inventory.findUnique({ where: { productId: item.id } });
          if (inventory) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: { currentStock: { decrement: item.qty } },
            });
          }
        }

        syncedInvoices.push(sale.invoiceNo);
      });
    }

    return res.json({
      syncedCount: syncedInvoices.length,
      syncedInvoices,
      message: `Successfully synchronized ${syncedInvoices.length} offline transactions.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to sync offline queue' });
  }
});

export default router;

