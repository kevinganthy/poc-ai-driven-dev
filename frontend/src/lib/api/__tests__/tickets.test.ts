import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAll, getOne, create, update, remove } from '../tickets';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const TOKEN = 'header.payload.sig';

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

describe('getAll()', () => {
	it('sends GET /tickets with Authorization header', async () => {
		mockFetch.mockReturnValue(mockResponse([]));

		await getAll(TOKEN);

		expect(mockFetch).toHaveBeenCalledWith(
			'http://localhost:3000/tickets',
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` })
			})
		);
	});

	it('appends ?status= to the URL when a filter is provided', async () => {
		mockFetch.mockReturnValue(mockResponse([]));

		await getAll(TOKEN, 'in-progress');

		expect(mockFetch).toHaveBeenCalledWith(
			'http://localhost:3000/tickets?status=in-progress',
			expect.any(Object)
		);
	});

	it('returns the tickets array', async () => {
		const tickets = [{ id: 't1', title: 'Bug', status: 'open' }];
		mockFetch.mockReturnValue(mockResponse(tickets));

		const result = await getAll(TOKEN);

		expect(result).toEqual(tickets);
	});

	it('throws with status 401 when token is missing/invalid', async () => {
		mockFetch.mockReturnValue(mockResponse({ error: 'Unauthorized' }, 401));

		await expect(getAll('bad-token')).rejects.toMatchObject({ status: 401 });
	});
});

describe('getOne()', () => {
	it('sends GET /tickets/:id with auth header and returns the ticket', async () => {
		const ticket = { id: 't1', title: 'Bug', status: 'open' };
		mockFetch.mockReturnValue(mockResponse(ticket));

		const result = await getOne(TOKEN, 't1');

		expect(mockFetch).toHaveBeenCalledWith(
			'http://localhost:3000/tickets/t1',
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` })
			})
		);
		expect(result).toEqual(ticket);
	});
});

describe('create()', () => {
	it('sends POST /tickets with body and auth header', async () => {
		const created = { id: 't2', title: 'Login broken', description: 'Shows 500', status: 'open' };
		mockFetch.mockReturnValue(mockResponse(created, 201));

		const result = await create(TOKEN, { title: 'Login broken', description: 'Shows 500' });

		expect(mockFetch).toHaveBeenCalledWith(
			'http://localhost:3000/tickets',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
				body: JSON.stringify({ title: 'Login broken', description: 'Shows 500' })
			})
		);
		expect(result).toEqual(created);
	});
});

describe('update()', () => {
	it('sends PUT /tickets/:id with body and auth header', async () => {
		mockFetch.mockReturnValue(mockResponse({ id: 't1', status: 'in-progress' }));

		await update(TOKEN, 't1', { status: 'in-progress' });

		expect(mockFetch).toHaveBeenCalledWith(
			'http://localhost:3000/tickets/t1',
			expect.objectContaining({
				method: 'PUT',
				headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
				body: JSON.stringify({ status: 'in-progress' })
			})
		);
	});

	it('throws with status 403 when a user tries to update status', async () => {
		mockFetch.mockReturnValue(mockResponse({ error: 'Forbidden' }, 403));

		await expect(update(TOKEN, 't1', { status: 'in-progress' })).rejects.toMatchObject({
			status: 403
		});
	});
});

describe('remove()', () => {
	it('sends DELETE /tickets/:id and resolves to undefined on 204', async () => {
		mockFetch.mockReturnValue(Promise.resolve({ status: 204, ok: true }));

		await expect(remove(TOKEN, 't1')).resolves.toBeUndefined();

		expect(mockFetch).toHaveBeenCalledWith(
			'http://localhost:3000/tickets/t1',
			expect.objectContaining({
				method: 'DELETE',
				headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` })
			})
		);
	});

	it('throws with status 403 when deleting another user\'s ticket', async () => {
		mockFetch.mockReturnValue(
			Promise.resolve({
				status: 403,
				ok: false,
				json: () => Promise.resolve({ error: 'Forbidden' })
			})
		);

		await expect(remove(TOKEN, 't2')).rejects.toMatchObject({ status: 403 });
	});
});
