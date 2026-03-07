import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import LoginPage from '../+page.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/api/auth.ts', () => ({ login: vi.fn() }));
vi.mock('$lib/stores/auth.svelte.ts', () => ({ setToken: vi.fn() }));

// Re-import mocked modules to assert on them
async function getMocks() {
	const { goto } = await import('$app/navigation');
	const { login } = await import('$lib/api/auth.ts');
	const { setToken } = await import('$lib/stores/auth.svelte.ts');
	return { goto: goto as ReturnType<typeof vi.fn>, login: login as ReturnType<typeof vi.fn>, setToken: setToken as ReturnType<typeof vi.fn> };
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('Login page', () => {
	it('renders the form with email and password fields', () => {
		render(LoginPage);

		expect(screen.getByLabelText('Email')).toBeInTheDocument();
		expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
	});

	it('shows a validation error without calling the API when password is shorter than 8 chars', async () => {
		const { login } = await getMocks();
		const user = userEvent.setup();

		render(LoginPage);

		await user.type(screen.getByLabelText('Email'), 'alice@example.com');
		await user.type(screen.getByLabelText('Mot de passe'), 'short');
		await user.click(screen.getByRole('button', { name: 'Se connecter' }));

		expect(screen.getByText(/au moins 8 caractères/i)).toBeInTheDocument();
		expect(login).not.toHaveBeenCalled();
	});

	it('calls setToken and navigates to /tickets on successful login', async () => {
		const { goto, login, setToken } = await getMocks();
		login.mockResolvedValue({ token: 'header.payload.sig' });
		const user = userEvent.setup();

		render(LoginPage);

		await user.type(screen.getByLabelText('Email'), 'alice@example.com');
		await user.type(screen.getByLabelText('Mot de passe'), 'SecurePass1!');
		await user.click(screen.getByRole('button', { name: 'Se connecter' }));

		await vi.waitFor(() => {
			expect(setToken).toHaveBeenCalledWith('header.payload.sig');
			expect(goto).toHaveBeenCalledWith('/tickets');
		});
	});

	it('shows "Identifiants invalides." on 401', async () => {
		const { login } = await getMocks();
		login.mockRejectedValue({ status: 401, error: 'Invalid credentials' });
		const user = userEvent.setup();

		render(LoginPage);

		await user.type(screen.getByLabelText('Email'), 'alice@example.com');
		await user.type(screen.getByLabelText('Mot de passe'), 'WrongPass1!');
		await user.click(screen.getByRole('button', { name: 'Se connecter' }));

		await vi.waitFor(() => {
			expect(screen.getByText('Identifiants invalides.')).toBeInTheDocument();
		});
	});

	it('shows a generic error message on unexpected API errors', async () => {
		const { login } = await getMocks();
		login.mockRejectedValue({ status: 500, error: 'Internal Server Error' });
		const user = userEvent.setup();

		render(LoginPage);

		await user.type(screen.getByLabelText('Email'), 'alice@example.com');
		await user.type(screen.getByLabelText('Mot de passe'), 'SecurePass1!');
		await user.click(screen.getByRole('button', { name: 'Se connecter' }));

		await vi.waitFor(() => {
			expect(screen.getByText('Internal Server Error')).toBeInTheDocument();
		});
	});
});
