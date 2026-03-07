let _token = $state<string | null>(
	typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
);

export function getToken(): string | null {
	return _token;
}

export function setToken(t: string): void {
	_token = t;
	window.localStorage.setItem('token', t);
}

export function clearToken(): void {
	_token = null;
	window.localStorage.removeItem('token');
}

export function isAuthenticated(): boolean {
	return _token !== null;
}
