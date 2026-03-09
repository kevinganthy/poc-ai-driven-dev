<script lang="ts">
	import type { Ticket } from '$lib/types.ts';
	import CategoryTag from './CategoryTag.svelte';

	interface Props {
		ticket: Ticket;
		currentUserId: string;
		isAdmin: boolean;
		ondelete: (id: string) => void;
	}

	const { ticket, currentUserId, isAdmin, ondelete }: Props = $props();

	const canManage = $derived(isAdmin || ticket.authorId === currentUserId);

	const STATUS_LABELS: Record<string, string> = {
		open: 'Open',
		'in-progress': 'In Progress',
		closed: 'Closed'
	};
</script>

<article>
	<header>
		<h3>{ticket.title}</h3>
		<div class="badges">
			<span class="badge status-{ticket.status}">
				{STATUS_LABELS[ticket.status] ?? ticket.status}
			</span>
			{#if ticket.category}
				<CategoryTag name={ticket.category.name} />
			{/if}
		</div>
	</header>
	<p>{ticket.description.slice(0, 150)}{ticket.description.length > 150 ? '…' : ''}</p>
	<footer>
		<time datetime={ticket.createdAt}>{new Date(ticket.createdAt).toLocaleDateString()}</time>
		{#if canManage}
			<a href="/tickets/{ticket.id}/edit">Edit</a>
			<button type="button" onclick={() => ondelete(ticket.id)}>Delete</button>
		{/if}
	</footer>
</article>

<style>
	.badges {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
</style>
