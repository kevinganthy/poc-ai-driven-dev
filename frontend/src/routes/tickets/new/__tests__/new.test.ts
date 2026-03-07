import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import NewTicketPage from '../+page.svelte';
import * as authStore from '$lib/stores/auth.svelte.ts';
import * as ticketsApi from '$lib/api/tickets.ts';
import { goto } from '$app/navigation';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/stores/auth.svelte.ts', () => ({ getToken: vi.fn() }));
vi.mock('$lib/api/tickets.ts', () => ({ create: vi.fn() }));

const USER_TOKEN = `h.${btoa(JSON.stringify({ id: 'u1', role: 'user' }))}.s`;

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(authStore.getToken).mockReturnValue(USER_TOKEN);
});

describe('New ticket page', () => {
	it('renders the ticket form with title and description fields', () => {
		render(NewTicketPage);

		expect(screen.getByLabelText('Titre')).toBeInTheDocument();
		expect(screen.getByLabelText('Description')).toBeInTheDocument();
	});

	it('calls create and redirects to /tickets on success', async () => {
		vi.mocked(ticketsApi.create).mockResolvedValue({ id: 'new-id', title: 'Mon ticket' });
		const user = userEvent.setup();

		render(NewTicketPage);

		await user.type(screen.getByLabelText('Titre'), 'Mon nouveau ticket');
		await user.type(screen.getByLabelText('Description'), 'Description détaillée et valide.');
		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		await vi.waitFor(() => {
			expect(ticketsApi.create).toHaveBeenCalledWith(USER_TOKEN, {
				title: 'Mon nouveau ticket',
				description: 'Description détaillée et valide.'
			});
			expect(goto).toHaveBeenCalledWith('/tickets');
		});
	});

	it('shows an error message when the API call fails', async () => {
		vi.mocked(ticketsApi.create).mockRejectedValue({ error: 'Serveur indisponible.' });
		const user = userEvent.setup();

		render(NewTicketPage);

		await user.type(screen.getByLabelText('Titre'), 'Mon nouveau ticket');
		await user.type(screen.getByLabelText('Description'), 'Description détaillée et valide.');
		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		await vi.waitFor(() => {
			expect(screen.getByText('Serveur indisponible.')).toBeInTheDocument();
		});
	});

	it('redirects to /login when no token is available', async () => {
		vi.mocked(authStore.getToken).mockReturnValue(null);

		render(NewTicketPage);

		await vi.waitFor(() => {
			expect(goto).toHaveBeenCalledWith('/login');
		});
	});

	it('does not show the status field for a non-admin user', () => {
		render(NewTicketPage);

		expect(screen.queryByLabelText('Statut')).not.toBeInTheDocument();
	});
});
