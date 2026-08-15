import { Router, Response } from 'express';
import { prisma } from '../../prisma.js';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// GET /api/v1/warehouse - List racks and bins
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        racks: {
          include: { bins: true },
        },
      },
    });
    return res.json({ warehouses });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch warehouse layout' });
  }
});

export default router;
