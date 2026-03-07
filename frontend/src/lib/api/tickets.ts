const API = 'http://localhost:3000';

function authHeaders(token: string): Record<string, string> {
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	};
}

export async function getAll(token: string, status?: string) {
	const url = status ? `${API}/tickets?status=${encodeURIComponent(status)}` : `${API}/tickets`;
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

export async function create(token: string, body: { title: string; description: string }) {
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
