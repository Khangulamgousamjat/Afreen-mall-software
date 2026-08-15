import { Router, Response } from 'express';
import { prisma } from '../../prisma.js';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../../middleware/auth.js';
import { CashVarianceStatus, RoleName } from '@afreen-mall/shared-types';

const router = Router();
router.use(authenticateToken);

// 1. POST /api/v1/cash/day-close - Cashier End-of-Shift Day Close
router.post('/day-close', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      registerId,
      systemCash,
      systemCard,
      systemUPI,
      countedCash,
      denominations,
      useBNACount = false,
      bnaDepositAmount,
      bnaSlipNumber,
      isCloseReturn,
    } = req.body;

    if (countedCash === undefined || !denominations) {
      return res.status(400).json({ error: 'Counted cash and denomination breakdown are required' });
    }

    const variance = countedCash - systemCash; // paise: positive = excess, negative = short
    let status: CashVarianceStatus = CashVarianceStatus.MATCHED;
    if (variance < 0) status = CashVarianceStatus.SHORT;
    if (variance > 0) status = CashVarianceStatus.EXCESS;

    const dateStr = new Date().toISOString().slice(0, 10);

    const closeRecord = await prisma.registerClose.create({
      data: {
        registerId: registerId || 'reg-01',
        date: dateStr,
        cashierStaffId: req.user!.staffId,
        cashierName: req.user!.fullName,
        systemCash: systemCash || 0,
        systemCard: systemCard || 0,
        systemUPI: systemUPI || 0,
        countedCash: countedCash || 0,
        denominations,
        useBNACount: Boolean(useBNACount),
        bnaDepositAmount: bnaDepositAmount || null,
        bnaSlipNumber: bnaSlipNumber || null,
        variance,
        status,
        isCloseReturn: Boolean(isCloseReturn),
      },
    });

    return res.status(201).json({
      closeRecord,
      message: 'Day Close submitted successfully and routed to Cash Officer.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to submit Day Close report' });
  }
});

// 2. GET /api/v1/cash/day-close/list - Cash Officer Handover View
router.get('/day-close/list', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);

    const closes = await prisma.registerClose.findMany({
      where: { date: dateStr },
      include: { register: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ date: dateStr, closes });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch Day Close entries' });
  }
});

// 3. POST /api/v1/cash/manager-report - Manager Cash Collection & BNA Deposit Report
router.post('/manager-report', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      registerId,
      posNumber,
      cashOfficerStaffId,
      cashOfficerName,
      denominations,
      cashTotal,
      upiTotal,
      cardTotal,
      bnaReportedAmount,
      systemTotalSales,
    } = req.body;

    if (bnaReportedAmount === undefined || cashTotal === undefined) {
      return res.status(400).json({ error: 'BNA reported amount and cash total are required' });
    }

    const finalVariance = bnaReportedAmount + upiTotal + cardTotal - systemTotalSales;
    let varianceStatus: CashVarianceStatus = CashVarianceStatus.MATCHED;
    if (finalVariance < 0) varianceStatus = CashVarianceStatus.SHORT;
    if (finalVariance > 0) varianceStatus = CashVarianceStatus.EXCESS;

    const dateStr = new Date().toISOString().slice(0, 10);

    const report = await prisma.managerCashReport.create({
      data: {
        date: dateStr,
        registerId: registerId || 'reg-01',
        posNumber: posNumber || 'POS-01',
        cashOfficerStaffId: cashOfficerStaffId || 300004,
        cashOfficerName: cashOfficerName || 'Sanjay Gupta',
        managerStaffId: req.user!.staffId,
        managerName: req.user!.fullName,
        denominations: denominations || {},
        cashTotal: cashTotal || 0,
        upiTotal: upiTotal || 0,
        cardTotal: cardTotal || 0,
        bnaReportedAmount: bnaReportedAmount || 0,
        systemTotalSales: systemTotalSales || 0,
        finalVariance,
        varianceStatus,
        accountantApproved: false,
      },
    });

    return res.status(201).json({
      report,
      message: 'Manager Cash Reconciliation Report submitted. Pending Accountant approval.',
    });
  } catch (err: any) {
    console.error('Error submitting manager report:', err);
    return res.status(500).json({ error: 'Failed to submit Manager Cash Report' });
  }
});

// 4. PATCH /api/v1/cash/report/:id/override - Store Manager, Accountant, or Super Admin Edit Override
router.patch(
  '/report/:id/override',
  requireRole([RoleName.STORE_MANAGER, RoleName.ACCOUNTANT, RoleName.SUPER_ADMIN]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { bnaReportedAmount, cashTotal, reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          error: 'A mandatory reason is required for editing a submitted closing report.',
        });
      }

      const existingReport = await prisma.managerCashReport.findUnique({ where: { id } });
      if (!existingReport) {
        return res.status(404).json({ error: 'Cash report not found' });
      }

      const newBnaAmount = bnaReportedAmount !== undefined ? bnaReportedAmount : existingReport.bnaReportedAmount;
      const newCashTotal = cashTotal !== undefined ? cashTotal : existingReport.cashTotal;
      const newVariance = newBnaAmount + existingReport.upiTotal + existingReport.cardTotal - existingReport.systemTotalSales;

      let newStatus: CashVarianceStatus = CashVarianceStatus.MATCHED;
      if (newVariance < 0) newStatus = CashVarianceStatus.SHORT;
      if (newVariance > 0) newStatus = CashVarianceStatus.EXCESS;

      const updatedReport = await prisma.managerCashReport.update({
        where: { id },
        data: {
          bnaReportedAmount: newBnaAmount,
          cashTotal: newCashTotal,
          finalVariance: newVariance,
          varianceStatus: newStatus,
        },
      });

      // Write immutable Audit Log with before/after diffs & mandatory reason
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          staffId: req.user!.staffId,
          userName: req.user!.fullName,
          userRole: req.user!.role,
          action: 'OVERRIDE_CASH_REPORT',
          entityName: 'ManagerCashReport',
          entityId: id,
          beforeValue: {
            bnaReportedAmount: existingReport.bnaReportedAmount,
            cashTotal: existingReport.cashTotal,
            finalVariance: existingReport.finalVariance,
          },
          afterValue: {
            bnaReportedAmount: updatedReport.bnaReportedAmount,
            cashTotal: updatedReport.cashTotal,
            finalVariance: updatedReport.finalVariance,
          },
          reason,
        },
      });

      return res.json({
        report: updatedReport,
        message: 'Closing report overridden and audit logged successfully.',
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to edit closing report' });
    }
  }
);

// 5. POST /api/v1/cash/manager-report/:id/approve - Accountant Final Day Close Approval
router.post(
  '/manager-report/:id/approve',
  requireRole([RoleName.ACCOUNTANT, RoleName.SUPER_ADMIN]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const report = await prisma.managerCashReport.update({
        where: { id },
        data: {
          accountantApproved: true,
          accountantApprovedBy: req.user!.fullName,
          accountantApprovedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          staffId: req.user!.staffId,
          userName: req.user!.fullName,
          userRole: req.user!.role,
          action: 'ACCOUNTANT_APPROVE_DAY_CLOSE',
          entityName: 'ManagerCashReport',
          entityId: id,
          reason: 'Daily consolidated cash report officially approved by Accountant.',
        },
      });

      return res.json({
        report,
        message: 'Day-end cash report approved. Day is officially closed.',
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to approve cash report' });
    }
  }
);

// 6. GET /api/v1/cash/reports - List manager reconciliation reports
router.get('/reports', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reports = await prisma.managerCashReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return res.json({ reports });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch cash reports' });
  }
});

export default router;
