import { z } from 'zod';

// API-facing values (in-progress with dash) — converted to/from Prisma's in_progress in ticket.service.ts
export const ticketStatusValues = ['open', 'in-progress', 'closed'] as const;

export const createTicketSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
});

export const updateTicketSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  status: z.enum(ticketStatusValues).optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketStatus = (typeof ticketStatusValues)[number];
