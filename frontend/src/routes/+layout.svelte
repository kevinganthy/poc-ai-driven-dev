<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getToken } from '$lib/stores/auth.svelte.ts';

	const { children } = $props();

	const publicRoutes = ['/login', '/register'];

	onMount(() => {
		if (!getToken() && !publicRoutes.includes($page.url.pathname)) {
			goto('/login');
		}
	});
</script>

{@render children()}
