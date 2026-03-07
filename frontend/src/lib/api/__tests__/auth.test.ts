import { describe, it, expect, vi, beforeEach } from 'vitest';
import { register, login } from '../auth';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(body: unknown, status = 200) {
	return Promise.resolve({
		ok: status >= 200 && status < 300,
		status,
		json: () => Promise.resolve(body)
	});
}

beforeEach(() => {
	mockFetch.mockReset();
});

describe('register()', () => {
	it('sends POST /auth/register with email and password', async () => {
		mockFetch.mockReturnValue(
			mockResponse({ id: 'u1', email: 'alice@example.com', role: 'user' }, 201)
		);

		await register('alice@example.com', 'SecurePass1!');

		expect(mockFetch).toHaveBeenCalledWith(
			'http://localhost:3000/auth/register',
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: 'alice@example.com', password: 'SecurePass1!' })
			})
		);
	});

	it('returns the created user object without a password field', async () => {
		const user = { id: 'u1', email: 'alice@example.com', role: 'user', createdAt: '2026-01-01' };
		mockFetch.mockReturnValue(mockResponse(user, 201));

		const result = await register('alice@example.com', 'SecurePass1!');

		expect(result).toEqual(user);
		expect(result).not.toHaveProperty('password');
	});

	it('throws an object with status 409 when the email is already taken', async () => {
		mockFetch.mockReturnValue(mockResponse({ error: 'Email already in use' }, 409));

		await expect(register('existing@example.com', 'SecurePass1!')).rejects.toMatchObject({
			status: 409
		});
	});

	it('throws an object with status 400 on invalid payload', async () => {
		mockFetch.mockReturnValue(
			mockResponse({ error: 'Bad Request', details: { email: ['Invalid email'] } }, 400)
		);

		await expect(register('not-an-email', 'short')).rejects.toMatchObject({ status: 400 });
	});
});

describe('login()', () => {
	it('sends POST /auth/login with email and password', async () => {
		mockFetch.mockReturnValue(mockResponse({ token: 'header.payload.sig' }));

		await login('alice@example.com', 'SecurePass1!');

		expect(mockFetch).toHaveBeenCalledWith(
			'http://localhost:3000/auth/login',
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: 'alice@example.com', password: 'SecurePass1!' })
			})
		);
	});

	it('returns { token } — a string with 3 JWT segments', async () => {
		mockFetch.mockReturnValue(mockResponse({ token: 'header.payload.sig' }));

		const result = await login('alice@example.com', 'SecurePass1!');

		expect(result).toHaveProperty('token');
		expect(result.token.split('.')).toHaveLength(3);
	});

	it('throws an object with status 401 on bad credentials', async () => {
		mockFetch.mockReturnValue(mockResponse({ error: 'Invalid credentials' }, 401));

		await expect(login('alice@example.com', 'WrongPass!')).rejects.toMatchObject({ status: 401 });
	});
});
