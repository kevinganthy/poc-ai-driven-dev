import { prisma } from '../lib/prisma';

export async function getAll() {
  return prisma.category.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, name: true },
  });
}
