import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate'; // Se usar acelerador

export const prisma = new PrismaClient({
  // O Prisma 7 busca a conexão automaticamente do config ou adapter
});

export default prisma;