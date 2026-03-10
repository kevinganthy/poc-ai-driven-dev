import { PUBLIC_API_URL } from '$env/static/public';

export interface Category {
  id: number;
  name: string;
  deletedAt?: string | null;
}

async function throwApiError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw Object.assign(new Error((body as { message?: string }).message ?? fallback), { status: res.status });
}

export async function getAllCategories(token?: string): Promise<Category[]> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${PUBLIC_API_URL}/categories`, { headers });
  if (!res.ok) return throwApiError(res, 'Failed to fetch categories');
  return res.json();
}

export async function getAllCategoriesAdmin(token: string): Promise<Category[]> {
  const res = await fetch(`${PUBLIC_API_URL}/categories/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return throwApiError(res, 'Failed to fetch categories');
  return res.json();
}

export async function createCategory(token: string, name: string): Promise<Category> {
  const res = await fetch(`${PUBLIC_API_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) return throwApiError(res, 'Failed to create category');
  return res.json();
}

export async function updateCategory(token: string, id: number, name: string): Promise<Category> {
  const res = await fetch(`${PUBLIC_API_URL}/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) return throwApiError(res, 'Failed to update category');
  return res.json();
}

export async function deleteCategory(token: string, id: number): Promise<void> {
  const res = await fetch(`${PUBLIC_API_URL}/categories/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return throwApiError(res, 'Failed to delete category');
}

export async function restoreCategory(token: string, id: number): Promise<Category> {
  const res = await fetch(`${PUBLIC_API_URL}/categories/${id}/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return throwApiError(res, 'Failed to restore category');
  return res.json();
}
