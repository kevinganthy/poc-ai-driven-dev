import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { CreateCategoryInput, UpdateCategoryInput } from '../validators/category.validator';

export async function getAll() {
  return prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: { id: 'asc' },
    select: { id: true, name: true },
  });
}

export async function getAllIncludingDeleted() {
  return prisma.category.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, name: true, deletedAt: true },
  });
}

export async function create(input: CreateCategoryInput) {
  try {
    return await prisma.category.create({
      data: { name: input.name },
      select: { id: true, name: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw Object.assign(new Error('Category name already exists'), { status: 409 });
    }
    throw err;
  }
}

export async function update(id: number, input: UpdateCategoryInput) {
  try {
    return await prisma.category.update({
      where: { id },
      data: { name: input.name },
      select: { id: true, name: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        throw Object.assign(new Error('Category name already exists'), { status: 409 });
      }
      if (err.code === 'P2025') {
        throw Object.assign(new Error('Category not found'), { status: 404 });
      }
    }
    throw err;
  }
}

/**
 * Soft-deletes a category by setting `deletedAt` to the current timestamp.
 *
 * The category record is NOT removed from the database. Tickets that reference
 * this category via `TicketCategory` keep their association intact — they will
 * still display the category name in detail views. However, `getAll()` filters
 * out soft-deleted categories (`WHERE deletedAt IS NULL`), so the category will
 * no longer appear in public selectors (CategorySelect, CategoryFilter).
 *
 * To undo this operation, call `restore(id)`.
 */
export async function remove(id: number) {
  try {
    await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw Object.assign(new Error('Category not found'), { status: 404 });
    }
    throw err;
  }
}

/**
 * Restores a soft-deleted category by setting `deletedAt` back to `null`.
 *
 * After restoration, the category becomes active again: it reappears in
 * `getAll()` results and in the frontend selectors. Tickets that kept their
 * association during the soft-delete period are automatically re-linked with
 * no additional action required.
 *
 * Throws 404 if no category with the given `id` exists.
 */
export async function restore(id: number) {
  try {
    return await prisma.category.update({
      where: { id },
      data: { deletedAt: null },
      select: { id: true, name: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw Object.assign(new Error('Category not found'), { status: 404 });
    }
    throw err;
  }
}
