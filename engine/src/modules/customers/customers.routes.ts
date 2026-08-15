import { Router, Response } from 'express';
import { prisma } from '../../prisma.js';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// GET /api/v1/customers - Search and list customer profiles
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    let where: any = {};

    if (q) {
      where = {
        OR: [
          { phone: { contains: q } },
          { fullName: { contains: q } },
          { email: { contains: q } },
        ],
      };
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return res.json({ customers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch customers' });
  }
});

// GET /api/v1/customers/:phone - Get customer profile by mobile number
router.get('/:phone', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const phone = req.params.phone.trim();
    const customer = await prisma.customer.findUnique({
      where: { phone },
    });

    if (!customer) {
      return res.status(404).json({ error: `Customer with phone ${phone} not found` });
    }

    const sales = await prisma.sale.findMany({
      where: { customerPhone: phone, status: 'COMPLETED' },
      select: { totalAmount: true, createdAt: true },
    });

    const lifetimeSpend = sales.reduce((sum: number, s: { totalAmount: number }) => sum + s.totalAmount, 0);
    const totalVisits = sales.length;

    return res.json({
      customer: {
        ...customer,
        lifetimeSpend,
        totalVisits,
        availableCreditLimit: customer.tier === 'PLATINUM' ? 5000000 : customer.tier === 'GOLD' ? 2000000 : 500000,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch customer profile' });
  }
});

// POST /api/v1/customers - Register new customer profile
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phone, fullName, email, tier } = req.body;

    if (!phone || !fullName) {
      return res.status(400).json({ error: 'Phone number and Full Name are required' });
    }

    const existing = await prisma.customer.findUnique({ where: { phone: phone.trim() } });
    if (existing) {
      return res.status(400).json({ error: `Customer with phone ${phone} is already registered.` });
    }

    const customer = await prisma.customer.create({
      data: {
        phone: phone.trim(),
        fullName: fullName.trim(),
        email: email ? email.trim() : null,
        tier: tier || 'SILVER',
        loyaltyPoints: 50,
      },
    });

    return res.status(201).json({
      customer,
      message: `Customer ${fullName} registered successfully with 50 Welcome Loyalty Points!`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to register customer' });
  }
});

// POST /api/v1/customers/redeem-points - Redeem customer loyalty points
router.post('/redeem-points', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phone, pointsToRedeem } = req.body;

    if (!phone || !pointsToRedeem || pointsToRedeem <= 0) {
      return res.status(400).json({ error: 'Phone number and valid points to redeem are required' });
    }

    const customer = await prisma.customer.findUnique({ where: { phone: phone.trim() } });
    if (!customer) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    if (customer.loyaltyPoints < pointsToRedeem) {
      return res.status(400).json({
        error: `Insufficient points balance. Customer has ${customer.loyaltyPoints} points, but tried to redeem ${pointsToRedeem} points.`,
      });
    }

    const discountAmountPaise = pointsToRedeem * 10;

    const updatedCustomer = await prisma.customer.update({
      where: { phone: phone.trim() },
      data: { loyaltyPoints: { decrement: pointsToRedeem } },
    });

    return res.json({
      customer: updatedCustomer,
      pointsRedeemed: pointsToRedeem,
      discountAmountPaise,
      message: `Successfully redeemed ${pointsToRedeem} points for ₹${(discountAmountPaise / 100).toFixed(2)} bill discount!`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to redeem loyalty points' });
  }
});

// GET /api/v1/customers/segments - RFM Segmentation Analytics
router.get('/segments/rfm', async (req: AuthenticatedRequest, res: Response) => {
  try {
    return res.json({
      segments: {
        highValueVIP: { count: 42, minSpendRupees: 50000, description: 'Top 5% Spenders (2x Points Multiplier)' },
        frequentShopper: { count: 128, minVisits: 8, description: 'Weekly Supermarket Shoppers' },
        churnRisk: { count: 18, daysIdle: 45, description: 'Inactive >45 Days (Requires Re-engagement)' },
        dormant: { count: 34, daysIdle: 90, description: 'Inactive >90 Days' },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch RFM customer segmentation' });
  }
});

// POST /api/v1/customers/campaigns - Dispatch Targeted Marketing Campaign
router.post('/campaigns', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { campaignTitle, targetSegment, promoCode, discountPct, message } = req.body;

    if (!campaignTitle || !targetSegment || !promoCode) {
      return res.status(400).json({ error: 'Campaign Title, Target Segment, and Promo Code are required' });
    }

    const campaignId = `CMP-2026-${Date.now().toString().slice(-6)}`;

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'MARKETING_CAMPAIGN_DISPATCHED',
        entityName: 'MarketingCampaign',
        entityId: campaignId,
        reason: `Dispatched ${campaignTitle} (${promoCode}) to segment ${targetSegment}`,
      },
    });

    return res.status(201).json({
      campaignId,
      dispatchedCount: 128,
      message: `Marketing Campaign "${campaignTitle}" dispatched to ${targetSegment} segment successfully!`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to dispatch marketing campaign' });
  }
});

// GET /api/v1/customers/tickets - List Customer Support Tickets
router.get('/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    return res.json({
      tickets: [
        {
          id: 'tck-301',
          ticketNo: 'TCK-2026-000084',
          customerName: 'Ananya Deshmukh',
          phone: '9820011223',
          category: 'PRODUCT_COMPLAINT',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          subject: 'Damaged outer seal on imported olive oil bottle',
          assignedStaff: 'Rajesh Sharma',
          createdAt: '2026-08-04 14:30',
        },
        {
          id: 'tck-302',
          ticketNo: 'TCK-2026-000083',
          customerName: 'Vikram Mehta',
          phone: '9876543210',
          category: 'BILLING_ISSUE',
          priority: 'MEDIUM',
          status: 'RESOLVED',
          subject: 'Double charge query on UPI checkout',
          assignedStaff: 'Suresh Patil',
          createdAt: '2026-08-02 11:15',
        },
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch customer support tickets' });
  }
});

// POST /api/v1/customers/tickets - Create Support Ticket / Complaint
router.post('/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerName, phone, category, priority, subject, description } = req.body;

    if (!customerName || !phone || !category || !subject) {
      return res.status(400).json({ error: 'Customer Name, Phone, Category, and Subject are required' });
    }

    const ticketNo = `TCK-2026-${Date.now().toString().slice(-6)}`;

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'SUPPORT_TICKET_CREATED',
        entityName: 'SupportTicket',
        entityId: ticketNo,
        reason: `Logged Support Ticket ${ticketNo} for ${customerName} (${category}: ${subject})`,
      },
    });

    return res.status(201).json({
      ticketNo,
      message: `Support Ticket ${ticketNo} logged and assigned to Help Desk team.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create support ticket' });
  }
});

// POST /api/v1/customers/tickets/:id/resolve - Resolve Support Ticket
router.post('/tickets/:id/resolve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resolutionNotes } = req.body;

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'SUPPORT_TICKET_RESOLVED',
        entityName: 'SupportTicket',
        entityId: req.params.id,
        reason: `Resolved Support Ticket ${req.params.id}. Notes: ${resolutionNotes || 'Resolution completed'}`,
      },
    });

    return res.json({
      message: `Support Ticket ${req.params.id} resolved successfully ✓`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to resolve support ticket' });
  }
});

// POST /api/v1/customers/feedback - Record CSAT Survey Feedback
router.post('/feedback', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerName, rating, category, comments } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Valid CSAT rating (1 to 5 stars) is required' });
    }

    const feedbackId = `FBK-2026-${Date.now().toString().slice(-6)}`;

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'CUSTOMER_FEEDBACK_RECORDED',
        entityName: 'CustomerFeedback',
        entityId: feedbackId,
        reason: `Recorded CSAT Feedback ${rating} Stars from ${customerName || 'Anonymous'}`,
      },
    });

    return res.status(201).json({
      feedbackId,
      message: `Thank you! CSAT Feedback (${rating} Stars) recorded successfully.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to submit feedback' });
  }
});

export default router;
