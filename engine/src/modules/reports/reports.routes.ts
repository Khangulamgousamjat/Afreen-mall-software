import { Router, Response } from 'express';
import { prisma } from '../../prisma.js';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';

import { generateExcel, generateCSV, generatePDF } from '../../services/exportService.js';

const router = Router();
router.use(authenticateToken);

// GET /api/v1/reports/export - Export Sales, GST, or Audit Reports
router.get('/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const type = String(req.query.type || 'sales').toLowerCase();
    const format = String(req.query.format || 'xlsx').toLowerCase();

    if (type === 'sales') {
      const sales = await prisma.sale.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
      const rows = sales.map((s) => ({
        invoiceNo: s.invoiceNo,
        date: s.createdAt.toISOString().slice(0, 10),
        cashier: s.cashierName,
        paymentMode: s.paymentMode,
        totalQty: s.totalQty,
        totalAmount: (s.totalAmount / 100).toFixed(2),
        customerName: s.customerName || 'Walk-in',
      }));

      const columns = [
        { header: 'Invoice No', key: 'invoiceNo', width: 20 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Cashier', key: 'cashier', width: 20 },
        { header: 'Payment Mode', key: 'paymentMode', width: 15 },
        { header: 'Qty', key: 'totalQty', width: 10 },
        { header: 'Total Amount (Rs)', key: 'totalAmount', width: 18 },
        { header: 'Customer', key: 'customerName', width: 22 },
      ];

      if (format === 'csv') {
        const buffer = generateCSV(columns, rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.csv"');
        return res.send(buffer);
      } else if (format === 'pdf') {
        const pdfHeaders = columns.map((c) => c.header);
        const pdfRows = rows.map((r: Record<string, any>) => columns.map((c) => String(r[c.key])));
        const buffer = await generatePDF('Daily Sales Report', 'Store Summary', pdfHeaders, pdfRows);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');
        return res.send(buffer);
      } else {
        const buffer = await generateExcel('Daily Sales Report', columns, rows);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');
        return res.send(buffer);
      }
    } else if (type === 'audit') {
      const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
      const rows = logs.map((l) => ({
        id: l.id,
        date: l.createdAt.toISOString().slice(0, 19).replace('T', ' '),
        userName: l.userName,
        userRole: l.userRole,
        action: l.action,
        entityName: l.entityName,
        reason: l.reason || '',
      }));

      const columns = [
        { header: 'Log ID', key: 'id', width: 25 },
        { header: 'Date & Time', key: 'date', width: 20 },
        { header: 'User', key: 'userName', width: 20 },
        { header: 'Role', key: 'userRole', width: 15 },
        { header: 'Action', key: 'action', width: 25 },
        { header: 'Module', key: 'entityName', width: 20 },
        { header: 'Details', key: 'reason', width: 35 },
      ];

      if (format === 'csv') {
        const buffer = generateCSV(columns, rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="audit_log.csv"');
        return res.send(buffer);
      } else if (format === 'pdf') {
        const pdfHeaders = columns.map((c) => c.header);
        const pdfRows = rows.map((r: Record<string, any>) => columns.map((c) => String(r[c.key])));
        const buffer = await generatePDF('Audit Log Report', 'System Security Audit Trail', pdfHeaders, pdfRows);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="audit_log.pdf"');
        return res.send(buffer);
      } else {
        const buffer = await generateExcel('Audit Log Report', columns, rows);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="audit_log.xlsx"');
        return res.send(buffer);
      }
    } else {
      const sales = await prisma.sale.findMany({ where: { status: 'COMPLETED' }, take: 200 });
      const rows = sales.map((s) => {
        const total = (s.totalAmount / 100);
        const taxable = parseFloat((total / 1.18).toFixed(2));
        const gst = parseFloat((total - taxable).toFixed(2));
        return {
          invoiceNo: s.invoiceNo,
          date: s.createdAt.toISOString().slice(0, 10),
          taxableValue: taxable.toFixed(2),
          cgst: (gst / 2).toFixed(2),
          sgst: (gst / 2).toFixed(2),
          totalAmount: total.toFixed(2),
        };
      });

      const columns = [
        { header: 'Invoice No', key: 'invoiceNo', width: 20 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Taxable Value (Rs)', key: 'taxableValue', width: 18 },
        { header: 'CGST (9%)', key: 'cgst', width: 15 },
        { header: 'SGST (9%)', key: 'sgst', width: 15 },
        { header: 'Total Invoice Amount (Rs)', key: 'totalAmount', width: 22 },
      ];

      if (format === 'csv') {
        const buffer = generateCSV(columns, rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="gst_summary.csv"');
        return res.send(buffer);
      } else if (format === 'pdf') {
        const pdfHeaders = columns.map((c) => c.header);
        const pdfRows = rows.map((r: Record<string, any>) => columns.map((c) => String(r[c.key])));
        const buffer = await generatePDF('Statutory GST Tax Summary', 'GSTR Monthly Tax Report', pdfHeaders, pdfRows);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="gst_summary.pdf"');
        return res.send(buffer);
      } else {
        const buffer = await generateExcel('GST Tax Summary', columns, rows);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="gst_summary.xlsx"');
        return res.send(buffer);
      }
    }
  } catch (err: any) {
    console.error('Report export error:', err);
    return res.status(500).json({ error: 'Failed to export report' });
  }
});

// GET /api/v1/reports/dashboard - Key performance metrics for Department 2 Dashboard
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const startOfToday = new Date(`${todayStr}T00:00:00.000Z`);

    const yesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const startOfYesterday = new Date(yesterday.toISOString().slice(0, 10) + 'T00:00:00.000Z');

    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's Sales Aggregations
    const todaySales = await prisma.sale.aggregate({
      where: { createdAt: { gte: startOfToday }, status: 'COMPLETED' },
      _sum: { totalAmount: true, totalDiscount: true },
      _count: { id: true },
    });

    // Yesterday's Sales Aggregations
    const yesterdaySales = await prisma.sale.aggregate({
      where: {
        createdAt: { gte: startOfYesterday, lt: startOfToday },
        status: 'COMPLETED',
      },
      _sum: { totalAmount: true },
    });

    // Week & Month Sales
    const weekSales = await prisma.sale.aggregate({
      where: { createdAt: { gte: startOfWeek }, status: 'COMPLETED' },
      _sum: { totalAmount: true },
    });

    const monthSales = await prisma.sale.aggregate({
      where: { createdAt: { gte: startOfMonth }, status: 'COMPLETED' },
      _sum: { totalAmount: true },
    });

    const todayRev = todaySales._sum.totalAmount || 0;
    const yestRev = yesterdaySales._sum.totalAmount || 0;
    const countToday = todaySales._count.id || 0;
    const weekRev = weekSales._sum.totalAmount || 0;
    const monthRev = monthSales._sum.totalAmount || 0;

    const growthPct = yestRev > 0 ? Math.round(((todayRev - yestRev) / yestRev) * 1000) / 10 : 100;
    const avgBillValue = countToday > 0 ? Math.round(todayRev / countToday) : 0;

    // Total Items Sold Today
    const todayItemsCount = await prisma.saleItem.aggregate({
      where: { sale: { createdAt: { gte: startOfToday }, status: 'COMPLETED' } },
      _sum: { qty: true },
    });
    const totalItemsSold = todayItemsCount._sum.qty || 0;
    const avgItemsPerBill = countToday > 0 ? Math.round((totalItemsSold / countToday) * 10) / 10 : 0;

    // Payment Mode Breakdown
    const cashSales = await prisma.sale.aggregate({
      where: { createdAt: { gte: startOfToday }, status: 'COMPLETED', paymentMode: 'CASH' },
      _sum: { totalAmount: true },
    });
    const cardSales = await prisma.sale.aggregate({
      where: { createdAt: { gte: startOfToday }, status: 'COMPLETED', paymentMode: 'CARD' },
      _sum: { totalAmount: true },
    });
    const upiSales = await prisma.sale.aggregate({
      where: { createdAt: { gte: startOfToday }, status: 'COMPLETED', paymentMode: 'UPI' },
      _sum: { totalAmount: true },
    });
    const splitSales = await prisma.sale.aggregate({
      where: { createdAt: { gte: startOfToday }, status: 'COMPLETED', paymentMode: 'SPLIT' },
      _sum: { totalAmount: true },
    });

    // Inventory Status
    const totalProducts = await prisma.product.count({ where: { deletedAt: null } });
    const lowStockItems = await prisma.inventory.findMany({
      where: { currentStock: { lte: 25 } },
      include: { product: { include: { category: true } } },
      take: 10,
    });
    const lowStockCount = lowStockItems.length;
    const outOfStockCount = lowStockItems.filter((i) => i.currentStock === 0).length;

    // Shift & Cash Control
    const pendingCashReports = await prisma.managerCashReport.count({
      where: { accountantApproved: false },
    });
    const openRegistersCount = await prisma.register.count({ where: { isActive: true } });
    const activeUsersCount = await prisma.user.count({ where: { isDeactivated: false, deletedAt: null } });

    // Purchase Orders
    const pendingPurchaseOrders = await prisma.purchaseOrder.count({ where: { status: 'SUBMITTED' } });
    const approvedPurchaseOrders = await prisma.purchaseOrder.count({ where: { status: 'APPROVED' } });

    // Customers & Suppliers
    const totalCustomers = await prisma.customer.count();
    const totalSuppliers = await prisma.supplier.count();

    // 7-Day Revenue Trend Data Points
    const trendDays: { date: string; label: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = d.toISOString().slice(0, 10);
      const dStart = new Date(`${dStr}T00:00:00.000Z`);
      const dEnd = new Date(`${dStr}T23:59:59.999Z`);

      const agg = await prisma.sale.aggregate({
        where: { createdAt: { gte: dStart, lte: dEnd }, status: 'COMPLETED' },
        _sum: { totalAmount: true },
      });

      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      trendDays.push({
        date: dStr,
        label: dayLabel,
        revenue: Math.round((agg._sum.totalAmount || 0) / 100), // in ₹
      });
    }

    // Recent Sales Activity
    const recentSales = await prisma.sale.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        invoiceNo: true,
        totalAmount: true,
        paymentMode: true,
        cashierName: true,
        createdAt: true,
      },
    });

    // Recent Audit Activity Feed
    const recentAuditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        action: true,
        userName: true,
        userRole: true,
        reason: true,
        createdAt: true,
      },
    });

    return res.json({
      todayRevenue: todayRev,
      todayTransactionCount: countToday,
      yesterdayRevenue: yestRev,
      thisWeekRevenue: weekRev,
      thisMonthRevenue: monthRev,
      growthPct,
      avgBillValue,
      avgItemsPerBill,

      grossRevenue: todayRev,
      netRevenue: Math.max(0, todayRev - (todaySales._sum.totalDiscount || 0)),
      discountsGiven: todaySales._sum.totalDiscount || 0,
      taxCollected: Math.round(todayRev * 0.05), // Estimated GST
      estimatedProfit: Math.round(todayRev * 0.18), // Estimated Margin

      paymentBreakdown: {
        cash: cashSales._sum.totalAmount || 0,
        card: cardSales._sum.totalAmount || 0,
        upi: upiSales._sum.totalAmount || 0,
        split: splitSales._sum.totalAmount || 0,
      },

      totalProducts,
      lowStockCount,
      outOfStockCount,
      lowStockItemsList: lowStockItems.map((i) => ({
        id: i.id,
        barcode: i.product.barcode,
        name: i.product.name,
        category: i.product.category.name,
        currentStock: i.currentStock,
        minStockLevel: i.product.minStockLevel,
        mrp: i.product.mrp,
      })),

      pendingCashReports,
      openRegistersCount,
      activeCashiersCount: activeUsersCount,

      pendingPurchaseOrders,
      approvedPurchaseOrders,

      totalCustomers,
      totalSuppliers,

      salesTrend: trendDays,
      recentSales,
      recentAuditLogs,
    });
  } catch (err: any) {
    console.error('Dashboard aggregation error:', err);
    return res.status(500).json({ error: 'Failed to generate dashboard metrics' });
  }
});

// GET /api/v1/reports/gst - GST Summary report
router.get('/gst', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sales = await prisma.sale.findMany({
      where: { status: 'COMPLETED' },
      include: { items: true },
    });

    let totalTaxableValue = 0;
    let totalCGST = 0;
    let totalSGST = 0;

    for (const s of sales) {
      for (const item of s.items) {
        const itemTaxable = item.netRate * item.qty;
        totalTaxableValue += itemTaxable;
        const taxAmt = Math.round(itemTaxable * (item.gstPct / 100));
        totalCGST += Math.round(taxAmt / 2);
        totalSGST += Math.round(taxAmt / 2);
      }
    }

    return res.json({
      totalTaxableValue,
      totalCGST,
      totalSGST,
      totalGST: totalCGST + totalSGST,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate GST report' });
  }
});

// GET /api/v1/reports/audit - Audit logs
router.get('/audit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({ logs });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
