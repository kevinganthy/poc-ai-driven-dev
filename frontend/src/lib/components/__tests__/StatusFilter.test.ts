import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import StatusFilter from '../StatusFilter.svelte';

describe('StatusFilter', () => {
	it('renders all filter buttons', () => {
		render(StatusFilter, { value: undefined, onchange: vi.fn() });

		expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'In Progress' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Closed' })).toBeInTheDocument();
	});

	it('calls onchange with undefined when "All" is clicked', async () => {
		const mockChange = vi.fn();
		const user = userEvent.setup();
		render(StatusFilter, { value: 'open', onchange: mockChange });

		await user.click(screen.getByRole('button', { name: 'All' }));

		expect(mockChange).toHaveBeenCalledWith(undefined);
	});

	it('calls onchange with "open" when "Open" is clicked', async () => {
		const mockChange = vi.fn();
		const user = userEvent.setup();
		render(StatusFilter, { value: undefined, onchange: mockChange });

		await user.click(screen.getByRole('button', { name: 'Open' }));

		expect(mockChange).toHaveBeenCalledWith('open');
	});

	it('calls onchange with "in-progress" when "In Progress" is clicked', async () => {
		const mockChange = vi.fn();
		const user = userEvent.setup();
		render(StatusFilter, { value: undefined, onchange: mockChange });

		await user.click(screen.getByRole('button', { name: 'In Progress' }));

		expect(mockChange).toHaveBeenCalledWith('in-progress');
	});

	it('calls onchange with "closed" when "Closed" is clicked', async () => {
		const mockChange = vi.fn();
		const user = userEvent.setup();
		render(StatusFilter, { value: undefined, onchange: mockChange });

		await user.click(screen.getByRole('button', { name: 'Closed' }));

		expect(mockChange).toHaveBeenCalledWith('closed');
	});
});
