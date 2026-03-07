<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getToken } from '$lib/stores/auth.svelte.ts';
	import { getOne, update } from '$lib/api/tickets.ts';
	import { decodeTokenPayload } from '$lib/utils.ts';
	import TicketForm from '$lib/components/TicketForm.svelte';
	import type { Ticket } from '$lib/types.ts';

	let ticket = $state<Ticket | null>(null);
	let loading = $state(false);
	let submitLoading = $state(false);
	let error = $state('');
	let isAdmin = $state(false);

	async function handleSubmit(data: { title: string; description: string; status?: string }) {
		const token = getToken();
		if (!token || !ticket) return;
		submitLoading = true;
		error = '';
		try {
			await update(token, ticket.id, data);
			goto('/tickets');
		} catch (err: unknown) {
			const e = err as { status?: number; error?: string };
			error =
				e.status === 403
					? "Vous n'avez pas la permission de modifier ce ticket."
					: (e.error ?? 'Une erreur est survenue.');
		} finally {
			submitLoading = false;
		}
	}

	onMount(async () => {
		const token = getToken();
		if (!token) {
			goto('/login');
			return;
		}
		const payload = decodeTokenPayload(token);
		isAdmin = payload?.role === 'admin';
		loading = true;
		try {
			ticket = await getOne(token, $page.params.id);
		} catch (err: unknown) {
			const e = err as { error?: string };
			error = e.error ?? 'Ticket introuvable.';
		} finally {
			loading = false;
		}
	});
</script>

<main>
	<h1>Modifier le ticket</h1>
	<a href="/tickets">← Retour</a>
	{#if loading}
		<p>Chargement...</p>
	{:else if error && !ticket}
		<p class="error">{error}</p>
	{:else if ticket}
		{#if error}
			<p class="error">{error}</p>
		{/if}
		<TicketForm initialValues={ticket} {isAdmin} loading={submitLoading} onsubmit={handleSubmit} />
	{/if}
</main>
