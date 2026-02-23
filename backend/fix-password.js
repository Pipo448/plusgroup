const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Moncoeur2024!', 10);
  const result = await prisma.user.updateMany({ where: { email: 'moncoeur@gmail.com' }, data: { passwordHash: hash } });
  console.log('Done:', result);
  await prisma.$disconnect();
}

main();