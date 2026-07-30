export type Category = {
  _id: string;
  name: string;
  slug: string;
};

async function parseJsonResponse(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/categories${path}`, {
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...init,
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data?.error || 'Something went wrong. Please try again.');
  return data as T;
}

export async function fetchCategories(): Promise<Category[]> {
  const data = await request<{ categories: Category[] }>('');
  return data.categories;
}

export async function createCategory(name: string): Promise<Category> {
  const data = await request<{ category: Category }>('', { method: 'POST', body: JSON.stringify({ name }) });
  return data.category;
}

export async function updateCategory(id: string, name: string): Promise<Category> {
  const data = await request<{ category: Category }>(`/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
  return data.category;
}

export async function deleteCategory(id: string): Promise<void> {
  await request<{ ok: true }>(`/${id}`, { method: 'DELETE' });
}
