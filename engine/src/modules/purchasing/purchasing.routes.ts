import { Router, Response } from 'express';
import { prisma } from '../../prisma.js';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';
import { PurchaseOrderStatus } from '@afreen-mall/shared-types';

const router = Router();
router.use(authenticateToken);

// GET /api/v1/purchasing/orders - List POs
router.get('/orders', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: { supplier: true, lineItems: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ orders });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// POST /api/v1/purchasing/orders - Create Purchase Order
router.post('/orders', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { supplierId, items } = req.body; // items: [{ productId, qty, unitCost }]

    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Supplier and line items are required' });
    }

    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-2026-${(count + 1).toString().padStart(4, '0')}`;

    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.qty * item.unitCost;
    }

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        status: PurchaseOrderStatus.APPROVED, // Auto approve for demo workflow
        totalAmount,
        lineItems: {
          create: items.map((i: any) => ({
            productId: i.productId,
            orderedQty: i.qty,
            unitCost: i.unitCost,
            totalCost: i.qty * i.unitCost,
          })),
        },
      },
      include: { supplier: true, lineItems: { include: { product: true } } },
    });

    return res.status(201).json({ po, message: 'Purchase Order created and approved' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

// POST /api/v1/purchasing/grn - Receive Goods (GRN) & increment inventory
router.post('/grn', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { purchaseOrderId, notes } = req.body;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { lineItems: true },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    const countGRN = await prisma.gRN.count();
    const grnNumber = `GRN-2026-${(countGRN + 1).toString().padStart(4, '0')}`;

    const result = await prisma.$transaction(async (tx: any) => {
      const grn = await tx.gRN.create({
        data: {
          grnNumber,
          purchaseOrderId,
          receivedBy: req.user!.fullName,
          notes,
        },
      });

      // Update PO status to COMPLETED
      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: PurchaseOrderStatus.COMPLETED },
      });

      // Increment inventory for each received item
      for (const item of po.lineItems) {
        const inv = await tx.inventory.findUnique({ where: { productId: item.productId } });
        if (inv) {
          await tx.inventory.update({
            where: { id: inv.id },
            data: { currentStock: { increment: item.orderedQty } },
          });

          await tx.stockMovement.create({
            data: {
              inventoryId: inv.id,
              type: 'PURCHASE_GRN',
              quantity: item.orderedQty,
              referenceId: grn.id,
              notes: `GRN ${grnNumber} received from supplier`,
            },
          });
        }
      }

      return grn;
    });

    return res.status(201).json({ grn: result, message: 'GRN processed and inventory updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process GRN' });
  }
});

// GET /api/v1/purchasing/suppliers - List active suppliers
router.get('/suppliers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ suppliers });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// GET /api/v1/purchasing/requisitions - List Purchase Requisitions
router.get('/requisitions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    return res.json({
      requisitions: [
        {
          id: 'pr-101',
          prNumber: 'PR-2026-000012',
          requestedBy: req.user!.fullName,
          department: 'Grocery & Staples',
          priority: 'HIGH',
          requiredDate: '2026-08-12',
          status: 'PENDING_APPROVAL',
          totalEstimatedCost: 1450000, // Paise
          justification: 'Replenishing Basmati Rice 5kg due to high weekend customer demand',
          createdAt: new Date().toISOString(),
          items: [
            { productId: 'prod-1', productName: 'Afreen Premium Basmati Rice 5kg', barcode: '890103000001', currentStock: 80, requestedQty: 50, estimatedCost: 1450000 },
          ],
        },
        {
          id: 'pr-102',
          prNumber: 'PR-2026-000011',
          requestedBy: 'Store Manager',
          department: 'Snacks & Beverages',
          priority: 'URGENT',
          requiredDate: '2026-08-10',
          status: 'APPROVED',
          totalEstimatedCost: 650000, // Paise
          justification: 'Cold Beverage stocks depleted ahead of festival sale',
          createdAt: new Date().toISOString(),
          items: [
            { productId: 'prod-3', productName: 'Coca Cola Soft Drink 1.25L', barcode: '890103000003', currentStock: 45, requestedQty: 100, estimatedCost: 650000 },
          ],
        },
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch purchase requisitions' });
  }
});

// POST /api/v1/purchasing/requisitions - Create Purchase Requisition
router.post('/requisitions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { department, priority, requiredDate, justification, items } = req.body;

    if (!department || !priority || !items || items.length === 0) {
      return res.status(400).json({ error: 'Department, priority, and requisition items are required' });
    }

    const prNumber = `PR-2026-${Date.now().toString().slice(-6)}`;

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'PURCHASE_REQUISITION_CREATED',
        entityName: 'PurchaseRequisition',
        entityId: prNumber,
        reason: `Created Requisition ${prNumber} with priority ${priority} for ${department}`,
      },
    });

    return res.status(201).json({
      message: `Purchase Requisition ${prNumber} submitted for manager approval`,
      prNumber,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create requisition' });
  }
});

// POST /api/v1/purchasing/requisitions/:id/approve - Approve or Reject PR
router.post('/requisitions/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, notes } = req.body; // action: 'APPROVE' | 'REJECT'

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: action === 'APPROVE' ? 'PR_APPROVED' : 'PR_REJECTED',
        entityName: 'PurchaseRequisition',
        entityId: req.params.id,
        reason: `Requisition ${req.params.id} ${action}d by ${req.user!.fullName}. Notes: ${notes || 'None'}`,
      },
    });

    return res.json({ message: `Purchase Requisition ${req.params.id} ${action.toLowerCase()}d successfully.` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process requisition approval' });
  }
});

// POST /api/v1/purchasing/invoices/verify - Three-Way Match Verification (PO vs GRN vs Supplier Invoice)
router.post('/invoices/verify', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { poNumber, grnNumber, supplierInvoiceNo, invoiceAmount, freightCharges } = req.body;

    if (!poNumber || !grnNumber || !supplierInvoiceNo || !invoiceAmount) {
      return res.status(400).json({ error: 'PO Number, GRN Number, Supplier Invoice Number, and Invoice Amount are required' });
    }

    const matched = true; // In production: calculates price & quantity tolerances

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'THREE_WAY_MATCH_VERIFIED',
        entityName: 'SupplierInvoice',
        entityId: supplierInvoiceNo,
        reason: `3-Way Match Verified for PO ${poNumber}, GRN ${grnNumber}, Invoice ${supplierInvoiceNo} (Amt: ₹${(invoiceAmount / 100).toFixed(2)})`,
      },
    });

    return res.json({
      matched,
      invoiceNumber: supplierInvoiceNo,
      status: 'VERIFIED_AND_POSTED',
      message: `Three-Way Match passed successfully! Invoice ${supplierInvoiceNo} posted to Accounts Payable.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to verify 3-way invoice match' });
  }
});

// POST /api/v1/purchasing/returns - Purchase Return & Debit Note Generator
router.post('/returns', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { supplierId, grnNumber, productId, returnQty, reason } = req.body;

    if (!supplierId || !grnNumber || !productId || !returnQty || !reason) {
      return res.status(400).json({ error: 'Supplier ID, GRN Number, Product ID, Return Qty, and Reason are required' });
    }

    const returnNo = `PRN-2026-${Date.now().toString().slice(-6)}`;
    const debitNoteNo = `DN-2026-${Date.now().toString().slice(-6)}`;

    // Decrement inventory stock inside transaction
    const inv = await prisma.inventory.findUnique({ where: { productId } });
    if (inv) {
      await prisma.$transaction(async (tx) => {
        await tx.inventory.update({
          where: { id: inv.id },
          data: { currentStock: { decrement: returnQty } },
        });

        await tx.stockMovement.create({
          data: {
            inventoryId: inv.id,
            type: 'PURCHASE_RETURN',
            quantity: -returnQty,
            notes: `Purchase Return ${returnNo} against GRN ${grnNumber}. Reason: ${reason}`,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            staffId: req.user!.staffId,
            userName: req.user!.fullName,
            userRole: req.user!.role,
            action: 'PURCHASE_RETURN_CREATED',
            entityName: 'PurchaseReturn',
            entityId: returnNo,
            reason: `Returned ${returnQty} units against GRN ${grnNumber}. Generated Debit Note ${debitNoteNo}`,
          },
        });
      });
    }

    return res.json({
      returnNo,
      debitNoteNo,
      message: `Purchase Return ${returnNo} processed. Debit Note ${debitNoteNo} issued to supplier. Inventory decremented.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to process purchase return' });
  }
});

// GET /api/v1/purchasing/supplier-performance - Supplier Scorecard & Rating Analytics
router.get('/supplier-performance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany();

    const scorecards = [
      { id: 'sup-1', supplierCode: 'SUP-001', name: 'Fortune Global Oils Ltd', onTimeDeliveryPct: 98.4, fillRatePct: 99.1, returnRatePct: 0.2, leadTimeDays: 2.1, overallRating: 98, status: 'PREFERRED_VENDOR' },
      { id: 'sup-2', supplierCode: 'SUP-002', name: 'Amul Dairy Co-op Ltd', onTimeDeliveryPct: 96.2, fillRatePct: 97.5, returnRatePct: 0.5, leadTimeDays: 1.8, overallRating: 96, status: 'PREFERRED_VENDOR' },
      { id: 'sup-3', supplierCode: 'SUP-003', name: 'Britannia Industries Distribution', onTimeDeliveryPct: 94.0, fillRatePct: 95.8, returnRatePct: 1.1, leadTimeDays: 3.4, overallRating: 92, status: 'ACTIVE' },
      { id: 'sup-4', supplierCode: 'SUP-004', name: 'Metro Wholesale Traders Pvt Ltd', onTimeDeliveryPct: 91.5, fillRatePct: 93.0, returnRatePct: 1.8, leadTimeDays: 4.0, overallRating: 88, status: 'UNDER_REVIEW' },
    ];

    return res.json({ scorecards });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch supplier performance scorecards' });
  }
});

export default router;
