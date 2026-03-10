import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50).trim(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).trim(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
