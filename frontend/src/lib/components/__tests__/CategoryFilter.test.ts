import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import CategoryFilter from '../CategoryFilter.svelte';

vi.mock('$lib/api/categories', () => ({
	getAllCategories: vi.fn().mockResolvedValue([
		{ id: 1, name: 'Bug' },
		{ id: 2, name: 'Feature' },
		{ id: 3, name: 'Improvement' },
		{ id: 4, name: 'Question' },
		{ id: 5, name: 'Documentation' },
		{ id: 6, name: 'Security' },
		{ id: 7, name: 'Performance' },
	]),
}));

beforeEach(() => {
	vi.clearAllMocks();
});

describe('CategoryFilter', () => {
	it('renders a checkbox for each predefined category', async () => {
		render(CategoryFilter, { selectedIds: [], onchange: vi.fn() });

		await waitFor(() => expect(screen.getByLabelText('Bug')).toBeInTheDocument());
		expect(screen.getByLabelText('Feature')).toBeInTheDocument();
		expect(screen.getByLabelText('Improvement')).toBeInTheDocument();
		expect(screen.getByLabelText('Question')).toBeInTheDocument();
		expect(screen.getByLabelText('Documentation')).toBeInTheDocument();
		expect(screen.getByLabelText('Security')).toBeInTheDocument();
		expect(screen.getByLabelText('Performance')).toBeInTheDocument();
	});

	it('pre-checks checkboxes matching selectedIds', async () => {
		render(CategoryFilter, { selectedIds: [1, 3], onchange: vi.fn() });

		await waitFor(() => expect(screen.getByLabelText('Bug')).toBeInTheDocument());
		expect(screen.getByLabelText('Bug')).toBeChecked(); // id 1
		expect(screen.getByLabelText('Improvement')).toBeChecked(); // id 3
		expect(screen.getByLabelText('Feature')).not.toBeChecked(); // id 2
		expect(screen.getByLabelText('Security')).not.toBeChecked(); // id 6
	});

	it('calls onchange with added id when an unchecked checkbox is clicked', async () => {
		const mockChange = vi.fn();
		const user = userEvent.setup();
		render(CategoryFilter, { selectedIds: [], onchange: mockChange });

		await waitFor(() => expect(screen.getByLabelText('Bug')).toBeInTheDocument());
		await user.click(screen.getByLabelText('Bug'));

		expect(mockChange).toHaveBeenCalledWith([1]);
	});

	it('calls onchange without the id when a checked checkbox is unchecked', async () => {
		const mockChange = vi.fn();
		const user = userEvent.setup();
		render(CategoryFilter, { selectedIds: [1, 2], onchange: mockChange });

		await waitFor(() => expect(screen.getByLabelText('Bug')).toBeInTheDocument());
		await user.click(screen.getByLabelText('Bug')); // uncheck id 1

		expect(mockChange).toHaveBeenCalledWith([2]);
	});

	it('renders the "Categories" legend', () => {
		render(CategoryFilter, { selectedIds: [], onchange: vi.fn() });

		expect(screen.getByText('Categories')).toBeInTheDocument();
	});
});
