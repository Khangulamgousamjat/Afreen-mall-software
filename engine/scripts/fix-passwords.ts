import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to production database...');
  
  const hash = await bcrypt.hash('Pass@123', 12);
  console.log('Generated hash for Pass@123');

  const result = await prisma.user.updateMany({
    where: {
      staffId: { not: 300000 },
    },
    data: {
      passwordHash: hash,
      isLocked: false,
      failedAttempts: 0,
      lockoutUntil: null,
      mustChangePassword: true,
    },
  });

  console.log(`✅ Updated ${result.count} staff accounts → password set to Pass@123`);

  // List all staff so we can confirm
  const allStaff = await prisma.user.findMany({
    select: { staffId: true, username: true, fullName: true, role: true, isLocked: true },
    orderBy: { staffId: 'asc' },
  });

  console.log('\nAll staff accounts:');
  allStaff.forEach((s) => {
    console.log(`  [${s.staffId}] ${s.username} — ${s.fullName} (${s.role}) locked=${s.isLocked}`);
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
