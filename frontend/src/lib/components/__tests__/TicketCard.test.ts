import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import TicketCard from '../TicketCard.svelte';
import type { Ticket } from '$lib/types.ts';

const ticket: Ticket = {
	id: 't1',
	title: 'Bug critique',
	description: 'Le bouton de connexion ne fonctionne pas correctement.',
	status: 'open',
	authorId: 'u1',
	createdAt: '2026-03-01T10:00:00.000Z',
	updatedAt: '2026-03-01T10:00:00.000Z'
};

describe('TicketCard', () => {
	it('renders title, description excerpt and status badge', () => {
		render(TicketCard, { ticket, currentUserId: 'u1', isAdmin: false, ondelete: vi.fn() });

		expect(screen.getByText('Bug critique')).toBeInTheDocument();
		expect(screen.getByText(/Le bouton de connexion/)).toBeInTheDocument();
		expect(screen.getByText('Open')).toBeInTheDocument();
	});

	it('shows edit link and delete button for the ticket owner', () => {
		render(TicketCard, { ticket, currentUserId: 'u1', isAdmin: false, ondelete: vi.fn() });

		expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
			'href',
			'/tickets/t1/edit'
		);
		expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
	});

	it('hides edit and delete controls for a non-owner non-admin', () => {
		render(TicketCard, { ticket, currentUserId: 'u2', isAdmin: false, ondelete: vi.fn() });

		expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
	});

	it('shows edit and delete for admin regardless of ownership', () => {
		render(TicketCard, { ticket, currentUserId: 'u2', isAdmin: true, ondelete: vi.fn() });

		expect(screen.getByRole('link', { name: 'Edit' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
	});

	it('calls ondelete with the ticket id when delete button is clicked', async () => {
		const mockDelete = vi.fn();
		const user = userEvent.setup();
		render(TicketCard, { ticket, currentUserId: 'u1', isAdmin: false, ondelete: mockDelete });

		await user.click(screen.getByRole('button', { name: 'Delete' }));

		expect(mockDelete).toHaveBeenCalledWith('t1');
	});

	it('displays "In Progress" label for in-progress status', () => {
		const inProgressTicket = { ...ticket, status: 'in-progress' };
		render(TicketCard, {
			ticket: inProgressTicket,
			currentUserId: 'u1',
			isAdmin: false,
			ondelete: vi.fn()
		});

		expect(screen.getByText('In Progress')).toBeInTheDocument();
	});
});
