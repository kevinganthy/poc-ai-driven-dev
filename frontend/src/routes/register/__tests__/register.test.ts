import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import RegisterPage from '../+page.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/api/auth.ts', () => ({ register: vi.fn() }));

async function getMocks() {
	const { goto } = await import('$app/navigation');
	const { register } = await import('$lib/api/auth.ts');
	return { goto: goto as ReturnType<typeof vi.fn>, register: register as ReturnType<typeof vi.fn> };
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('Register page', () => {
	it('renders the form with email and password fields', () => {
		render(RegisterPage);

		expect(screen.getByLabelText('Email')).toBeInTheDocument();
		expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: "S'inscrire" })).toBeInTheDocument();
	});

	it('shows a validation error without calling the API when password is shorter than 8 chars', async () => {
		const { register } = await getMocks();
		const user = userEvent.setup();

		render(RegisterPage);

		await user.type(screen.getByLabelText('Email'), 'bob@example.com');
		await user.type(screen.getByLabelText('Mot de passe'), 'short');
		await user.click(screen.getByRole('button', { name: "S'inscrire" }));

		expect(screen.getByText(/au moins 8 caractères/i)).toBeInTheDocument();
		expect(register).not.toHaveBeenCalled();
	});

	it('calls register() and redirects to /login on success', async () => {
		const { goto, register } = await getMocks();
		register.mockResolvedValue({ id: 'u1', email: 'bob@example.com', role: 'user' });
		const user = userEvent.setup();

		render(RegisterPage);

		await user.type(screen.getByLabelText('Email'), 'bob@example.com');
		await user.type(screen.getByLabelText('Mot de passe'), 'SecurePass1!');
		await user.click(screen.getByRole('button', { name: "S'inscrire" }));

		await vi.waitFor(() => {
			expect(register).toHaveBeenCalledWith('bob@example.com', 'SecurePass1!');
			expect(goto).toHaveBeenCalledWith('/login');
		});
	});

	it('shows "Cette adresse email est déjà utilisée." on 409', async () => {
		const { register } = await getMocks();
		register.mockRejectedValue({ status: 409, error: 'Email already in use' });
		const user = userEvent.setup();

		render(RegisterPage);

		await user.type(screen.getByLabelText('Email'), 'existing@example.com');
		await user.type(screen.getByLabelText('Mot de passe'), 'SecurePass1!');
		await user.click(screen.getByRole('button', { name: "S'inscrire" }));

		await vi.waitFor(() => {
			expect(
				screen.getByText('Cette adresse email est déjà utilisée.')
			).toBeInTheDocument();
		});
	});
});
