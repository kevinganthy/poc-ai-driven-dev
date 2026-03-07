import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import TicketsPage from '../+page.svelte';
import * as authStore from '$lib/stores/auth.svelte.ts';
import * as ticketsApi from '$lib/api/tickets.ts';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/stores/auth.svelte.ts', () => ({ getToken: vi.fn() }));
vi.mock('$lib/api/tickets.ts', () => ({ getAll: vi.fn(), remove: vi.fn() }));

const USER_TOKEN = `h.${btoa(JSON.stringify({ id: 'u1', role: 'user' }))}.s`;

const mockTickets = [
	{
		id: 't1',
		title: 'Bug critique',
		description: 'Description suffisamment longue.',
		status: 'open',
		authorId: 'u1',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z'
	},
	{
		id: 't2',
		title: 'Nouvelle feature',
		description: 'Une autre description longue.',
		status: 'in-progress',
		authorId: 'u2',
		createdAt: '2026-01-02T00:00:00.000Z',
		updatedAt: '2026-01-02T00:00:00.000Z'
	}
];

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(authStore.getToken).mockReturnValue(USER_TOKEN);
	vi.mocked(ticketsApi.getAll).mockResolvedValue([]);
	vi.mocked(ticketsApi.remove).mockResolvedValue(undefined);
});

describe('Tickets page', () => {
	it('renders the ticket list after fetching', async () => {
		vi.mocked(ticketsApi.getAll).mockResolvedValue(mockTickets);

		render(TicketsPage);

		await vi.waitFor(() => {
			expect(screen.getByText('Bug critique')).toBeInTheDocument();
			expect(screen.getByText('Nouvelle feature')).toBeInTheDocument();
		});
	});

	it('shows "Aucun ticket." when the list is empty', async () => {
		render(TicketsPage);

		await vi.waitFor(() => {
			expect(screen.getByText('Aucun ticket.')).toBeInTheDocument();
		});
	});

	it('calls getAll with the status filter value when filter changes', async () => {
		const user = userEvent.setup();
		render(TicketsPage);

		await vi.waitFor(() => {
			expect(ticketsApi.getAll).toHaveBeenCalledTimes(1);
		});

		await user.click(screen.getByRole('button', { name: 'Open' }));

		await vi.waitFor(() => {
			expect(ticketsApi.getAll).toHaveBeenCalledWith(USER_TOKEN, 'open');
		});
	});

	it('removes a ticket optimistically on delete', async () => {
		vi.mocked(ticketsApi.getAll).mockResolvedValue([mockTickets[0]]);
		const user = userEvent.setup();

		render(TicketsPage);

		await vi.waitFor(() => {
			expect(screen.getByText('Bug critique')).toBeInTheDocument();
		});

		await user.click(screen.getByRole('button', { name: 'Delete' }));

		await vi.waitFor(() => {
			expect(screen.queryByText('Bug critique')).not.toBeInTheDocument();
		});
		expect(ticketsApi.remove).toHaveBeenCalledWith(USER_TOKEN, 't1');
	});

	it('restores the list if delete API call fails', async () => {
		vi.mocked(ticketsApi.getAll).mockResolvedValue([mockTickets[0]]);
		vi.mocked(ticketsApi.remove).mockRejectedValue({ status: 500 });
		const user = userEvent.setup();

		render(TicketsPage);

		await vi.waitFor(() => {
			expect(screen.getByText('Bug critique')).toBeInTheDocument();
		});

		await user.click(screen.getByRole('button', { name: 'Delete' }));

		await vi.waitFor(() => {
			expect(screen.getByText('Bug critique')).toBeInTheDocument();
		});
	});

	it('redirects to /login when no token is available', async () => {
		const { goto } = await import('$app/navigation');
		vi.mocked(authStore.getToken).mockReturnValue(null);

		render(TicketsPage);

		await vi.waitFor(() => {
			expect(goto).toHaveBeenCalledWith('/login');
		});
	});
});
