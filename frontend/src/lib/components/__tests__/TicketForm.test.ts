import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import TicketForm from '../TicketForm.svelte';

beforeEach(() => {
	vi.clearAllMocks();
});

describe('TicketForm', () => {
	it('renders title and description fields', () => {
		render(TicketForm, { isAdmin: false, loading: false, onsubmit: vi.fn() });

		expect(screen.getByLabelText('Titre')).toBeInTheDocument();
		expect(screen.getByLabelText('Description')).toBeInTheDocument();
	});

	it('does not show status field for non-admin', () => {
		render(TicketForm, { isAdmin: false, loading: false, onsubmit: vi.fn() });

		expect(screen.queryByLabelText('Statut')).not.toBeInTheDocument();
	});

	it('shows status field with all options for admin', () => {
		render(TicketForm, { isAdmin: true, loading: false, onsubmit: vi.fn() });

		expect(screen.getByLabelText('Statut')).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Open' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'In Progress' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Closed' })).toBeInTheDocument();
	});

	it('pre-fills fields from initialValues', () => {
		render(TicketForm, {
			isAdmin: false,
			loading: false,
			onsubmit: vi.fn(),
			initialValues: { title: 'Mon titre', description: 'Ma description longue et valide.' }
		});

		expect(screen.getByLabelText('Titre')).toHaveValue('Mon titre');
		expect(screen.getByLabelText('Description')).toHaveValue('Ma description longue et valide.');
	});

	it('shows validation error when title is too short', async () => {
		const user = userEvent.setup();
		render(TicketForm, { isAdmin: false, loading: false, onsubmit: vi.fn() });

		await user.type(screen.getByLabelText('Titre'), 'AB');
		await user.type(screen.getByLabelText('Description'), 'Description suffisamment longue.');
		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		expect(screen.getByText(/entre 3 et 100 caractères/i)).toBeInTheDocument();
	});

	it('shows validation error when description is too short', async () => {
		const user = userEvent.setup();
		render(TicketForm, { isAdmin: false, loading: false, onsubmit: vi.fn() });

		await user.type(screen.getByLabelText('Titre'), 'Titre valide');
		await user.type(screen.getByLabelText('Description'), 'Court');
		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		expect(screen.getByText(/entre 10 et 1000 caractères/i)).toBeInTheDocument();
	});

	it('calls onsubmit with title and description for non-admin', async () => {
		const mockSubmit = vi.fn();
		const user = userEvent.setup();
		render(TicketForm, { isAdmin: false, loading: false, onsubmit: mockSubmit });

		await user.type(screen.getByLabelText('Titre'), 'Mon ticket');
		await user.type(screen.getByLabelText('Description'), 'Description suffisamment longue.');
		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		expect(mockSubmit).toHaveBeenCalledWith({
			title: 'Mon ticket',
			description: 'Description suffisamment longue.'
		});
	});

	it('includes status in submit data when admin', async () => {
		const mockSubmit = vi.fn();
		const user = userEvent.setup();
		render(TicketForm, { isAdmin: true, loading: false, onsubmit: mockSubmit });

		await user.type(screen.getByLabelText('Titre'), 'Mon ticket');
		await user.type(screen.getByLabelText('Description'), 'Description suffisamment longue.');
		await user.selectOptions(screen.getByLabelText('Statut'), 'in-progress');
		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		expect(mockSubmit).toHaveBeenCalledWith({
			title: 'Mon ticket',
			description: 'Description suffisamment longue.',
			status: 'in-progress'
		});
	});

	it('disables the submit button and shows loading text when loading', () => {
		render(TicketForm, { isAdmin: false, loading: true, onsubmit: vi.fn() });

		const btn = screen.getByRole('button');
		expect(btn).toBeDisabled();
		expect(btn).toHaveTextContent('Enregistrement...');
	});

	it('renders the category select field', () => {
		render(TicketForm, { isAdmin: false, loading: false, onsubmit: vi.fn() });

		expect(screen.getByLabelText('Catégorie')).toBeInTheDocument();
	});

	it('includes categoryId in submit data when a category is selected', async () => {
		const mockSubmit = vi.fn();
		const user = userEvent.setup();
		render(TicketForm, { isAdmin: false, loading: false, onsubmit: mockSubmit });

		await user.type(screen.getByLabelText('Titre'), 'Mon ticket');
		await user.type(screen.getByLabelText('Description'), 'Description suffisamment longue.');
		await user.selectOptions(screen.getByLabelText('Catégorie'), '1'); // Bug = id 1

		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		expect(mockSubmit).toHaveBeenCalledWith({
			title: 'Mon ticket',
			description: 'Description suffisamment longue.',
			categoryId: 1
		});
	});

	it('does not include categoryId when no category is selected', async () => {
		const mockSubmit = vi.fn();
		const user = userEvent.setup();
		render(TicketForm, { isAdmin: false, loading: false, onsubmit: mockSubmit });

		await user.type(screen.getByLabelText('Titre'), 'Mon ticket');
		await user.type(screen.getByLabelText('Description'), 'Description suffisamment longue.');
		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		expect(mockSubmit).toHaveBeenCalledWith({
			title: 'Mon ticket',
			description: 'Description suffisamment longue.'
		});
		expect(mockSubmit.mock.calls[0][0]).not.toHaveProperty('categoryId');
	});
});
