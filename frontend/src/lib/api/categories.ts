const API = 'http://localhost:3000';

export interface Category {
  id: number;
  name: string;
}

export async function getAllCategories(token?: string): Promise<Category[]> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}/categories`, { headers });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}
