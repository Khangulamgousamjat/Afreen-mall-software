import { Router, Response } from 'express';
import { prisma } from '../../prisma.js';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

const DEFAULT_EMPLOYEES = [
  {
    empCode: 'EMP-2026-000101',
    fullName: 'Rahul Sharma',
    department: 'POS & Sales',
    branch: 'Afreen Mall Main Store',
    role: 'Senior Cashier',
    employmentType: 'FULL_TIME',
    pan: 'ABCPS1234F',
    aadhaar: 'XXXX-XXXX-4829',
    bankName: 'HDFC Bank',
    bankAccountNo: '5020001928374',
  },
  {
    empCode: 'EMP-2026-000102',
    fullName: 'Ayesha Khan',
    department: 'Operations',
    branch: 'Afreen Mall Main Store',
    role: 'Store Manager',
    employmentType: 'FULL_TIME',
    pan: 'BKPSK5678G',
    aadhaar: 'XXXX-XXXX-9102',
    bankName: 'ICICI Bank',
    bankAccountNo: '001105009182',
  },
  {
    empCode: 'EMP-2026-000103',
    fullName: 'Vikram Singh',
    department: 'Inventory & Warehouse',
    branch: 'Main Warehouse Godown',
    role: 'Inventory Executive',
    employmentType: 'FULL_TIME',
    pan: 'CLPSV9102H',
    aadhaar: 'XXXX-XXXX-3341',
    bankName: 'Axis Bank',
    bankAccountNo: '918020038471',
  },
];

async function ensureDefaultEmployees() {
  const count = await prisma.employee.count();
  if (count === 0) {
    for (const emp of DEFAULT_EMPLOYEES) {
      await prisma.employee.create({ data: emp });
    }
  }
}

// GET /api/v1/hrms/employees - Employee Directory List from DB
router.get('/employees', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureDefaultEmployees();
    const employeeRecords = await prisma.employee.findMany({
      orderBy: { empCode: 'asc' },
    });

    const employees = employeeRecords.map((e) => ({
      id: e.id,
      empCode: e.empCode,
      fullName: e.fullName,
      designation: e.role,
      department: e.department,
      branch: e.branch,
      email: `${e.empCode.toLowerCase()}@afreenmall.com`,
      phone: '+91 98765 11223',
      employmentType: e.employmentType,
      status: e.isDeactivated ? 'DEACTIVATED' : 'ACTIVE',
      dateOfJoining: e.createdAt.toISOString().slice(0, 10),
      pan: e.pan || 'N/A',
      aadhaar: e.aadhaar || 'N/A',
      bankName: e.bankName || 'N/A',
      bankAccountNo: e.bankAccountNo || 'N/A',
    }));

    return res.json({ employees });
  } catch (err: any) {
    console.error('Error fetching employees:', err);
    return res.status(500).json({ error: 'Failed to fetch employee directory' });
  }
});

// POST /api/v1/hrms/employees - Onboard New Employee in DB
router.post('/employees', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, designation, department, branch, employmentType, pan, aadhaar, bankName, bankAccountNo } = req.body;

    if (!fullName || !department) {
      return res.status(400).json({ error: 'Full Name and Department are required' });
    }

    await ensureDefaultEmployees();
    const count = await prisma.employee.count();
    const empCode = `EMP-2026-${String(count + 101).padStart(6, '0')}`;

    const newEmp = await prisma.employee.create({
      data: {
        empCode,
        fullName,
        department,
        branch: branch || 'Afreen Mall Main Store',
        role: designation || 'CASHIER',
        employmentType: employmentType || 'FULL_TIME',
        pan,
        aadhaar,
        bankName,
        bankAccountNo,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'EMPLOYEE_ONBOARDED',
        entityName: 'EmployeeMaster',
        entityId: newEmp.id,
        reason: `Onboarded Employee ${fullName} (${empCode}) in ${department}`,
      },
    });

    return res.status(201).json({
      empCode,
      employee: newEmp,
      message: `Employee "${fullName}" (${empCode}) onboarded successfully! Profile activated in database.`,
    });
  } catch (err: any) {
    console.error('Error onboarding employee:', err);
    return res.status(500).json({ error: err.message || 'Failed to onboard employee' });
  }
});

// GET /api/v1/hrms/attendance - Attendance Logs from DB
router.get('/attendance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.attendanceLog.findMany({
      orderBy: { punchTime: 'desc' },
    });

    const attendanceLogs = logs.map((l) => ({
      id: l.id,
      empCode: l.empCode,
      employeeName: l.empCode,
      date: l.punchTime.toISOString().slice(0, 10),
      checkInTime: l.punchTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      checkOutTime: '-',
      totalHours: '8.0 hrs',
      status: 'PRESENT',
      deviceId: l.deviceId,
    }));

    return res.json({ attendanceLogs });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch attendance logs' });
  }
});

// POST /api/v1/hrms/attendance/check-in - Attendance Check-In in DB
router.post('/attendance/check-in', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { empCode, punchType, deviceId, remarks } = req.body;

    if (!empCode) {
      return res.status(400).json({ error: 'Employee Code is required' });
    }

    const count = await prisma.attendanceLog.count();
    const punchNo = `PUNCH-2026-${String(count + 1).padStart(6, '0')}`;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const attendanceRecord = await prisma.attendanceLog.create({
      data: {
        punchNo,
        empCode,
        punchType: punchType || 'CHECK_IN',
        deviceId: deviceId || 'BIO-POS-TERMINAL-01',
        remarks,
        punchTime: now,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'ATTENDANCE_PUNCH_LOGGED',
        entityName: 'AttendanceRegister',
        entityId: attendanceRecord.id,
        reason: `Logged ${punchType || 'CHECK_IN'} punch for ${empCode} at ${timeStr}`,
      },
    });

    return res.status(201).json({
      punchNo,
      timeStr,
      attendanceRecord,
      message: `Attendance Check-In Punch ${punchNo} logged for ${empCode} at ${timeStr}!`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to log attendance punch' });
  }
});

// GET /api/v1/hrms/shifts - Shift Rosters
router.get('/shifts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shifts = [
      { id: 'sh-1', name: 'Morning Retail Shift', code: 'SHIFT-AM', timing: '08:00 AM - 04:00 PM', gracePeriodMins: 15, assignedEmployeesCount: 14 },
      { id: 'sh-2', name: 'Evening Retail Shift', code: 'SHIFT-PM', timing: '02:00 PM - 10:00 PM', gracePeriodMins: 15, assignedEmployeesCount: 12 },
      { id: 'sh-3', name: 'General Manager Shift', code: 'SHIFT-GEN', timing: '09:30 AM - 06:30 PM', gracePeriodMins: 15, assignedEmployeesCount: 6 },
    ];

    return res.json({ shifts });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch shift rosters' });
  }
});

// GET /api/v1/hrms/recruitment - Recruitment Vacancies & Candidate Pipeline
router.get('/recruitment', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const vacancies = [
      { id: 'vac-1', title: 'POS Billing Cashier', department: 'POS & Sales', positions: 3, applicants: 18, status: 'INTERVIEWING' },
      { id: 'vac-2', title: 'Warehouse Inventory Inspector', department: 'Inventory', positions: 1, applicants: 7, status: 'OPEN' },
    ];

    return res.json({ vacancies });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch recruitment pipeline' });
  }
});

// GET /api/v1/hrms/leaves - Leave Applications from DB
router.get('/leaves', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leaveRecords = await prisma.leaveApplication.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const leaves = leaveRecords.map((l) => ({
      id: l.id,
      leaveNo: l.leaveNo,
      empCode: l.empCode,
      employeeName: l.empCode,
      leaveType: l.leaveType,
      startDate: l.startDate,
      endDate: l.endDate,
      days: 1,
      reason: l.reason,
      status: l.status,
    }));

    return res.json({ leaves });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch leave applications' });
  }
});

// POST /api/v1/hrms/leaves - Apply Employee Leave in DB
router.post('/leaves', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { empCode, leaveType, startDate, endDate, reason } = req.body;

    if (!empCode || !leaveType || !startDate || !endDate) {
      return res.status(400).json({ error: 'Employee Code, Leave Type, Start Date, and End Date are required' });
    }

    const count = await prisma.leaveApplication.count();
    const leaveNo = `LV-2026-${String(count + 1).padStart(6, '0')}`;

    const leave = await prisma.leaveApplication.create({
      data: {
        leaveNo,
        empCode,
        leaveType,
        startDate,
        endDate,
        reason: reason || 'Leave application',
        status: 'PENDING',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'LEAVE_APPLICATION_SUBMITTED',
        entityName: 'LeaveApplication',
        entityId: leave.id,
        reason: `Applied ${leaveType} leave ${leaveNo} for ${empCode}`,
      },
    });

    return res.status(201).json({
      leaveNo,
      leave,
      message: `Leave Application ${leaveNo} submitted successfully for ${empCode}! Pending approval.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to submit leave application' });
  }
});

// GET /api/v1/hrms/payroll - Monthly Store Payroll & Payslips from DB
router.get('/payroll', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batches = await prisma.payrollBatch.findMany({
      include: { payslips: true },
      orderBy: { createdAt: 'desc' },
    });

    const payroll: any[] = [];
    batches.forEach((b) => {
      b.payslips.forEach((p) => {
        payroll.push({
          id: p.id,
          empCode: p.empCode,
          employeeName: p.employeeName,
          designation: 'Staff',
          monthYear: b.monthYear,
          grossSalaryPaise: p.netPayable,
          netSalaryPaise: p.netPayable,
          status: 'DISBURSED',
          payslipNo: `PSL-${b.batchNo}`,
        });
      });
    });

    return res.json({ payroll });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch payroll register' });
  }
});

// POST /api/v1/hrms/payroll/run - Run Monthly Store Payroll Processing in DB
router.post('/payroll/run', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { monthYear, remarks } = req.body;

    if (!monthYear) {
      return res.status(400).json({ error: 'Payroll Month (YYYY-MM) is required' });
    }

    await ensureDefaultEmployees();
    const employees = await prisma.employee.findMany();

    const count = await prisma.payrollBatch.count();
    const batchNo = `PAYROLL-BATCH-2026-${String(count + 1).padStart(6, '0')}`;

    const batch = await prisma.payrollBatch.create({
      data: {
        batchNo,
        monthYear,
        remarks,
        totalAmount: employees.length * 3500000,
        status: 'COMPLETED',
        payslips: {
          create: employees.map((e) => ({
            empCode: e.empCode,
            employeeName: e.fullName,
            netPayable: 3500000,
          })),
        },
      },
      include: { payslips: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'PAYROLL_BATCH_EXECUTED',
        entityName: 'PayrollRegister',
        entityId: batch.id,
        reason: `Executed Monthly Payroll Batch ${batchNo} for ${monthYear}.`,
      },
    });

    return res.status(201).json({
      batchNo,
      batch,
      message: `Monthly Payroll Batch ${batchNo} executed for ${monthYear}! Payslips generated in database.`,
    });
  } catch (err: any) {
    console.error('Error running payroll:', err);
    return res.status(500).json({ error: err.message || 'Failed to run payroll batch' });
  }
});

export default router;
