import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CategoryTag from '../CategoryTag.svelte';

describe('CategoryTag', () => {
	it('renders the category name', () => {
		render(CategoryTag, { name: 'Bug' });

		expect(screen.getByText('Bug')).toBeInTheDocument();
	});

	it('applies the "tag" CSS class to the element', () => {
		const { container } = render(CategoryTag, { name: 'Security' });

		expect(container.querySelector('.tag')).toBeInTheDocument();
		expect(container.querySelector('.tag')).toHaveTextContent('Security');
	});

	it('renders different category names correctly', () => {
		render(CategoryTag, { name: 'Performance' });

		expect(screen.getByText('Performance')).toBeInTheDocument();
	});
});
