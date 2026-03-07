import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import EditPage from '../+page.svelte';
import * as authStore from '$lib/stores/auth.svelte.ts';
import * as ticketsApi from '$lib/api/tickets.ts';
import { goto } from '$app/navigation';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/stores', () => ({
	page: {
		subscribe: (fn: (v: unknown) => void) => {
			fn({ params: { id: 'ticket-123' } });
			return () => {};
		}
	}
}));
vi.mock('$lib/stores/auth.svelte.ts', () => ({ getToken: vi.fn() }));
vi.mock('$lib/api/tickets.ts', () => ({ getOne: vi.fn(), update: vi.fn() }));

const USER_TOKEN = `h.${btoa(JSON.stringify({ id: 'u1', role: 'user' }))}.s`;
const ADMIN_TOKEN = `h.${btoa(JSON.stringify({ id: 'a1', role: 'admin' }))}.s`;

const mockTicket = {
	id: 'ticket-123',
	title: 'Ticket existant',
	description: 'Description qui est suffisamment longue.',
	status: 'open',
	authorId: 'u1',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z'
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(authStore.getToken).mockReturnValue(USER_TOKEN);
	vi.mocked(ticketsApi.getOne).mockResolvedValue(mockTicket);
	vi.mocked(ticketsApi.update).mockResolvedValue(mockTicket);
});

describe('Edit ticket page', () => {
	it('pre-fills the form with the loaded ticket data', async () => {
		render(EditPage);

		await vi.waitFor(() => {
			expect(screen.getByDisplayValue('Ticket existant')).toBeInTheDocument();
		});
	});

	it('does not show status field for a non-admin user', async () => {
		render(EditPage);

		await vi.waitFor(() => {
			expect(screen.getByDisplayValue('Ticket existant')).toBeInTheDocument();
		});

		expect(screen.queryByLabelText('Statut')).not.toBeInTheDocument();
	});

	it('shows status field for admin', async () => {
		vi.mocked(authStore.getToken).mockReturnValue(ADMIN_TOKEN);

		render(EditPage);

		await vi.waitFor(() => {
			expect(screen.getByDisplayValue('Ticket existant')).toBeInTheDocument();
		});

		expect(screen.getByLabelText('Statut')).toBeInTheDocument();
	});

	it('calls update and redirects to /tickets on success', async () => {
		const user = userEvent.setup();

		render(EditPage);

		await vi.waitFor(() => {
			expect(screen.getByDisplayValue('Ticket existant')).toBeInTheDocument();
		});

		const titleInput = screen.getByLabelText('Titre');
		await user.clear(titleInput);
		await user.type(titleInput, 'Titre modifié');
		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		await vi.waitFor(() => {
			expect(ticketsApi.update).toHaveBeenCalledWith(
				USER_TOKEN,
				'ticket-123',
				expect.objectContaining({ title: 'Titre modifié' })
			);
			expect(goto).toHaveBeenCalledWith('/tickets');
		});
	});

	it('shows a 403 error message when user lacks permission', async () => {
		vi.mocked(ticketsApi.update).mockRejectedValue({ status: 403, error: 'Forbidden' });
		const user = userEvent.setup();

		render(EditPage);

		await vi.waitFor(() => {
			expect(screen.getByDisplayValue('Ticket existant')).toBeInTheDocument();
		});

		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		await vi.waitFor(() => {
			expect(screen.getByText(/permission de modifier ce ticket/i)).toBeInTheDocument();
		});
	});

	it('redirects to /login when no token is available', async () => {
		vi.mocked(authStore.getToken).mockReturnValue(null);

		render(EditPage);

		await vi.waitFor(() => {
			expect(goto).toHaveBeenCalledWith('/login');
		});
	});
});
