<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getToken } from '$lib/stores/auth.svelte.ts';
	import { getAll, remove } from '$lib/api/tickets.ts';
	import { decodeTokenPayload } from '$lib/utils.ts';
	import TicketCard from '$lib/components/TicketCard.svelte';
	import StatusFilter from '$lib/components/StatusFilter.svelte';
	import type { Ticket } from '$lib/types.ts';

	let tickets = $state<Ticket[]>([]);
	let statusFilter = $state<string | undefined>(undefined);
	let error = $state('');
	let loading = $state(false);
	let currentUserId = $state('');
	let isAdmin = $state(false);

	async function fetchTickets() {
		const token = getToken();
		if (!token) return;
		loading = true;
		error = '';
		try {
			tickets = await getAll(token, statusFilter);
		} catch (err: unknown) {
			const e = err as { error?: string };
			error = e.error ?? 'Une erreur est survenue.';
		} finally {
			loading = false;
		}
	}

	async function handleDelete(id: string) {
		const token = getToken();
		if (!token) return;
		const prev = tickets;
		tickets = tickets.filter((t) => t.id !== id);
		try {
			await remove(token, id);
		} catch {
			tickets = prev;
		}
	}

	onMount(() => {
		const token = getToken();
		if (!token) {
			goto('/login');
			return;
		}
		const payload = decodeTokenPayload(token);
		currentUserId = payload?.id ?? '';
		isAdmin = payload?.role === 'admin';
		fetchTickets();
	});
</script>

<main>
	<header>
		<h1>Tickets</h1>
		<a href="/tickets/new">Nouveau ticket</a>
	</header>
	<StatusFilter value={statusFilter} onchange={(v) => { statusFilter = v; fetchTickets(); }} />
	{#if loading}
		<p>Chargement...</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if tickets.length === 0}
		<p>Aucun ticket.</p>
	{:else}
		{#each tickets as ticket (ticket.id)}
			<TicketCard {ticket} {currentUserId} {isAdmin} ondelete={handleDelete} />
		{/each}
	{/if}
</main>
