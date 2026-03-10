<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getToken } from '$lib/stores/auth.svelte.ts';
	import { decodeTokenPayload } from '$lib/utils.ts';

	const { children } = $props();

	const publicRoutes = ['/login', '/register'];

	let isAdmin = $state(false);

	onMount(() => {
		const token = getToken();
		if (!token && !publicRoutes.includes($page.url.pathname)) {
			goto('/login');
			return;
		}
		if (token) {
			const payload = decodeTokenPayload(token);
			isAdmin = payload?.role === 'admin';
		}
	});
</script>

{#if isAdmin}
	<nav>
		<a href="/admin/categories">Gérer les catégories</a>
	</nav>
{/if}

{@render children()}
