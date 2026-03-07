const API = 'http://localhost:3000';

export async function register(email: string, password: string) {
	const res = await fetch(`${API}/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password })
	});
	const data = await res.json();
	if (!res.ok) throw { status: res.status, ...data };
	return data;
}

export async function login(email: string, password: string): Promise<{ token: string }> {
	const res = await fetch(`${API}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password })
	});
	const data = await res.json();
	if (!res.ok) throw { status: res.status, ...data };
	return data;
}
