import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getToken, setToken, clearToken, isAuthenticated } from '../auth.svelte.ts';

// Reset state and localStorage between tests
beforeEach(() => {
	clearToken();
	vi.clearAllMocks();
});

describe('initial state', () => {
	it('returns null when no token has been set', () => {
		expect(getToken()).toBeNull();
	});

	it('returns false for isAuthenticated when no token has been set', () => {
		expect(isAuthenticated()).toBe(false);
	});
});

describe('setToken()', () => {
	it('stores the token so getToken() returns it', () => {
		setToken('my.jwt.token');
		expect(getToken()).toBe('my.jwt.token');
	});

	it('persists the token to localStorage', () => {
		setToken('my.jwt.token');
		expect(localStorage.setItem).toHaveBeenCalledWith('token', 'my.jwt.token');
	});

	it('makes isAuthenticated() return true', () => {
		setToken('my.jwt.token');
		expect(isAuthenticated()).toBe(true);
	});
});

describe('clearToken()', () => {
	it('removes the token so getToken() returns null', () => {
		setToken('my.jwt.token');
		clearToken();
		expect(getToken()).toBeNull();
	});

	it('removes the token from localStorage', () => {
		clearToken();
		expect(localStorage.removeItem).toHaveBeenCalledWith('token');
	});

	it('makes isAuthenticated() return false', () => {
		setToken('my.jwt.token');
		clearToken();
		expect(isAuthenticated()).toBe(false);
	});
});
