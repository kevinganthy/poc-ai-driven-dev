<script lang="ts">
	interface Props {
		value: string | undefined;
		onchange: (value: string | undefined) => void;
	}

	const { value, onchange }: Props = $props();

	const filters: { label: string; value: string | undefined }[] = [
		{ label: 'All', value: undefined },
		{ label: 'Open', value: 'open' },
		{ label: 'In Progress', value: 'in-progress' },
		{ label: 'Closed', value: 'closed' }
	];
</script>

<nav aria-label="Filter by status">
	{#each filters as filter}
		<button
			type="button"
			class:active={value === filter.value}
			onclick={() => onchange(filter.value)}
		>
			{filter.label}
		</button>
	{/each}
</nav>
