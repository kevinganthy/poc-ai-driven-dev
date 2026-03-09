<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getToken } from '$lib/stores/auth.svelte.ts';
	import { create } from '$lib/api/tickets.ts';
	import { decodeTokenPayload } from '$lib/utils.ts';
	import TicketForm from '$lib/components/TicketForm.svelte';

	let loading = $state(false);
	let error = $state('');
	let isAdmin = $state(false);

	async function handleSubmit(data: { title: string; description: string; status?: string; categoryId?: number }) {
		const token = getToken();
		if (!token) {
			goto('/login');
			return;
		}
		loading = true;
		error = '';
		try {
			await create(token, data);
			goto('/tickets');
		} catch (err: unknown) {
			const e = err as { error?: string };
			error = e.error ?? 'Une erreur est survenue.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		const token = getToken();
		if (!token) {
			goto('/login');
			return;
		}
		const payload = decodeTokenPayload(token);
		isAdmin = payload?.role === 'admin';
	});
</script>

<main>
	<h1>Nouveau ticket</h1>
	<a href="/tickets">← Retour</a>
	{#if error}
		<p class="error">{error}</p>
	{/if}
	<TicketForm {isAdmin} {loading} onsubmit={handleSubmit} />
</main>
