import { TicketStatus as PrismaTicketStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthUser } from '../types/express';
import { CreateTicketInput, UpdateTicketInput, TicketStatus } from '../validators/ticket.validator';

// Maps API-facing status (in-progress) to Prisma enum (in_progress) and back
function toPrismaStatus(status: TicketStatus): PrismaTicketStatus {
  if (status === 'in-progress') return PrismaTicketStatus.in_progress;
  return status as PrismaTicketStatus;
}

function fromPrismaStatus(status: PrismaTicketStatus): TicketStatus {
  if (status === PrismaTicketStatus.in_progress) return 'in-progress';
  return status as TicketStatus;
}

function mapTicket(ticket: any) {
  const mapped = { ...ticket, status: fromPrismaStatus(ticket.status) };
  // Extract category from ticketCategory junction if present
  if (ticket.ticketCategory?.category) {
    return { ...mapped, category: ticket.ticketCategory.category };
  }
  return { ...mapped, category: null };
}

function forbidden(): never {
  throw Object.assign(new Error('Forbidden'), { status: 403 });
}

function notFound(): never {
  throw Object.assign(new Error('Ticket not found'), { status: 404 });
}

export async function getAll(user: AuthUser, statusFilter?: string, categoriesFilter?: string) {
  const where: Record<string, any> = {};
  if (user.role === 'user') {
    where.authorId = user.id;
  }
  if (statusFilter) {
    const allowed: TicketStatus[] = ['open', 'in-progress', 'closed'];
    if (allowed.includes(statusFilter as TicketStatus)) {
      where.status = toPrismaStatus(statusFilter as TicketStatus);
    }
  }

  // Multi-category filtering (OR logic: tickets with any of the selected categories)
  if (categoriesFilter) {
    const categoryIds = categoriesFilter
      .split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id));
    if (categoryIds.length > 0) {
      where.ticketCategory = {
        category: {
          id: { in: categoryIds },
        },
      };
    }
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: { ticketCategory: { include: { category: true } } } as any,
    orderBy: { createdAt: 'desc' },
  });
  return tickets.map(mapTicket);
}

export async function getOne(id: string, user: AuthUser) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { ticketCategory: { include: { category: true } } } as any,
  });
  if (!ticket) notFound();
  if (user.role !== 'admin' && ticket!.authorId !== user.id) forbidden();
  return mapTicket(ticket);
}

export async function create(data: CreateTicketInput, user: AuthUser) {
  const ticket = await prisma.ticket.create({
    data: {
      title: data.title,
      description: data.description,
      authorId: user.id,
      ...(data.categoryId && {
        ticketCategory: {
          create: {
            categoryId: data.categoryId,
          },
        },
      }),
    },
    include: { ticketCategory: { include: { category: true } } } as any,
  });
  return mapTicket(ticket);
}

export async function update(id: string, data: UpdateTicketInput, user: AuthUser) {
  if (data.status !== undefined && user.role !== 'admin') forbidden();

  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) notFound();
  if (user.role !== 'admin' && existing!.authorId !== user.id) forbidden();

  // Handle category update: delete existing, create new if provided
  const shouldUpdateCategory = data.categoryId !== undefined;
  if (shouldUpdateCategory) {
    await (prisma as any).ticketCategory.deleteMany({ where: { ticketId: id } });
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: toPrismaStatus(data.status) }),
      ...(shouldUpdateCategory &&
        data.categoryId && {
          ticketCategory: {
            create: {
              categoryId: data.categoryId,
            },
          },
        }),
    },
    include: { ticketCategory: { include: { category: true } } } as any,
  });
  return mapTicket(updated);
}

export async function remove(id: string, user: AuthUser) {
  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) notFound();
  if (user.role !== 'admin' && existing!.authorId !== user.id) forbidden();
  await prisma.ticket.delete({ where: { id } });
}
