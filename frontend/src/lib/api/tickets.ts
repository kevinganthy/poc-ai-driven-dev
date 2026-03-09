const API = 'http://localhost:3000';

function authHeaders(token: string): Record<string, string> {
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	};
}

export async function getAll(token: string, status?: string, categories?: number[]) {
	let url = `${API}/tickets`;
	const params: string[] = [];
	if (status) params.push(`status=${encodeURIComponent(status)}`);
	if (categories && categories.length > 0) params.push(`categories=${categories.join(',')}`);
	if (params.length > 0) url += '?' + params.join('&');
	const res = await fetch(url, { headers: authHeaders(token) });
	const data = await res.json();
	if (!res.ok) throw { status: res.status, ...data };
	return data;
}

export async function getOne(token: string, id: string) {
	const res = await fetch(`${API}/tickets/${id}`, { headers: authHeaders(token) });
	const data = await res.json();
	if (!res.ok) throw { status: res.status, ...data };
	return data;
}

export async function create(token: string, body: { title: string; description: string; categoryId?: number }) {
	const res = await fetch(`${API}/tickets`, {
		method: 'POST',
		headers: authHeaders(token),
		body: JSON.stringify(body)
	});
	const data = await res.json();
	if (!res.ok) throw { status: res.status, ...data };
	return data;
}

export async function update(token: string, id: string, body: Record<string, unknown>) {
	const res = await fetch(`${API}/tickets/${id}`, {
		method: 'PUT',
		headers: authHeaders(token),
		body: JSON.stringify(body)
	});
	const data = await res.json();
	if (!res.ok) throw { status: res.status, ...data };
	return data;
}

export async function remove(token: string, id: string): Promise<void> {
	const res = await fetch(`${API}/tickets/${id}`, {
		method: 'DELETE',
		headers: authHeaders(token)
	});
	if (res.status === 204) return;
	const data = await res.json();
	if (!res.ok) throw { status: res.status, ...data };
}
