import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import CategoriesAdminPage from '../+page.svelte';
import * as authStore from '$lib/stores/auth.svelte.ts';
import * as categoriesApi from '$lib/api/categories.ts';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/stores/auth.svelte.ts', () => ({ getToken: vi.fn() }));
vi.mock('$lib/api/categories.ts', () => ({
	getAllCategoriesAdmin: vi.fn(),
	createCategory: vi.fn(),
	updateCategory: vi.fn(),
	deleteCategory: vi.fn(),
	restoreCategory: vi.fn(),
}));

const ADMIN_TOKEN = `h.${btoa(JSON.stringify({ id: 'admin-1', role: 'admin' }))}.s`;
const USER_TOKEN = `h.${btoa(JSON.stringify({ id: 'user-1', role: 'user' }))}.s`;

const mockCategories = [
	{ id: 1, name: 'Bug', deletedAt: null },
	{ id: 2, name: 'Feature', deletedAt: null },
	{ id: 3, name: 'Old Category', deletedAt: '2026-03-01T00:00:00.000Z' },
];

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(authStore.getToken).mockReturnValue(ADMIN_TOKEN);
	vi.mocked(categoriesApi.getAllCategoriesAdmin).mockResolvedValue(mockCategories);
	vi.mocked(categoriesApi.createCategory).mockResolvedValue({ id: 4, name: 'New' });
	vi.mocked(categoriesApi.updateCategory).mockResolvedValue({ id: 1, name: 'Renamed' });
	vi.mocked(categoriesApi.deleteCategory).mockResolvedValue(undefined);
	vi.mocked(categoriesApi.restoreCategory).mockResolvedValue({ id: 3, name: 'Old Category' });
});

describe('Admin categories page', () => {
	it('redirects to /login when no token', async () => {
		const { goto } = await import('$app/navigation');
		vi.mocked(authStore.getToken).mockReturnValue(null);

		render(CategoriesAdminPage);

		await vi.waitFor(() => {
			expect(goto).toHaveBeenCalledWith('/login');
		});
	});

	it('redirects to /tickets when role is user', async () => {
		const { goto } = await import('$app/navigation');
		vi.mocked(authStore.getToken).mockReturnValue(USER_TOKEN);

		render(CategoriesAdminPage);

		await vi.waitFor(() => {
			expect(goto).toHaveBeenCalledWith('/tickets');
		});
	});

	it('displays active and deleted categories after fetching', async () => {
		render(CategoriesAdminPage);

		await vi.waitFor(() => {
			expect(screen.getByText('Bug')).toBeInTheDocument();
			expect(screen.getByText('Feature')).toBeInTheDocument();
			expect(screen.getByText('Old Category')).toBeInTheDocument();
		});
	});

	it('calls createCategory and re-fetches on form submit', async () => {
		const user = userEvent.setup();
		render(CategoriesAdminPage);

		await vi.waitFor(() => {
			expect(screen.getByText('Bug')).toBeInTheDocument();
		});

		const input = screen.getByPlaceholderText('Nom de la catégorie');
		await user.type(input, 'Infra');
		await user.click(screen.getByRole('button', { name: 'Créer' }));

		await vi.waitFor(() => {
			expect(categoriesApi.createCategory).toHaveBeenCalledWith(ADMIN_TOKEN, 'Infra');
			expect(categoriesApi.getAllCategoriesAdmin).toHaveBeenCalledTimes(2);
		});
	});

	it('calls deleteCategory and re-fetches when Supprimer is clicked', async () => {
		const user = userEvent.setup();
		render(CategoriesAdminPage);

		await vi.waitFor(() => {
			expect(screen.getByText('Bug')).toBeInTheDocument();
		});

		const deleteButtons = screen.getAllByRole('button', { name: 'Supprimer' });
		await user.click(deleteButtons[0]);

		await vi.waitFor(() => {
			expect(categoriesApi.deleteCategory).toHaveBeenCalledWith(ADMIN_TOKEN, 1);
			expect(categoriesApi.getAllCategoriesAdmin).toHaveBeenCalledTimes(2);
		});
	});

	it('calls restoreCategory and re-fetches when Restaurer is clicked', async () => {
		const user = userEvent.setup();
		render(CategoriesAdminPage);

		await vi.waitFor(() => {
			expect(screen.getByText('Old Category')).toBeInTheDocument();
		});

		await user.click(screen.getByRole('button', { name: 'Restaurer' }));

		await vi.waitFor(() => {
			expect(categoriesApi.restoreCategory).toHaveBeenCalledWith(ADMIN_TOKEN, 3);
			expect(categoriesApi.getAllCategoriesAdmin).toHaveBeenCalledTimes(2);
		});
	});

	it('shows inline edit on Renommer click, calls updateCategory on Valider', async () => {
		const user = userEvent.setup();
		render(CategoriesAdminPage);

		await vi.waitFor(() => {
			expect(screen.getByText('Bug')).toBeInTheDocument();
		});

		const renameButtons = screen.getAllByRole('button', { name: 'Renommer' });
		await user.click(renameButtons[0]);

		const editInput = screen.getByDisplayValue('Bug');
		await user.clear(editInput);
		await user.type(editInput, 'Bug Renamed');
		await user.click(screen.getByRole('button', { name: 'Valider' }));

		await vi.waitFor(() => {
			expect(categoriesApi.updateCategory).toHaveBeenCalledWith(ADMIN_TOKEN, 1, 'Bug Renamed');
			expect(categoriesApi.getAllCategoriesAdmin).toHaveBeenCalledTimes(2);
		});
	});

	it('cancels inline edit on Annuler click without calling updateCategory', async () => {
		const user = userEvent.setup();
		render(CategoriesAdminPage);

		await vi.waitFor(() => {
			expect(screen.getByText('Bug')).toBeInTheDocument();
		});

		const renameButtons = screen.getAllByRole('button', { name: 'Renommer' });
		await user.click(renameButtons[0]);

		expect(screen.getByDisplayValue('Bug')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Annuler' }));

		await vi.waitFor(() => {
			expect(screen.getByText('Bug')).toBeInTheDocument();
			expect(categoriesApi.updateCategory).not.toHaveBeenCalled();
		});
	});
});
