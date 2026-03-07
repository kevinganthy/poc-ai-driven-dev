<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getToken } from '$lib/stores/auth.svelte.ts';

	onMount(() => {
		if (getToken()) {
			goto('/tickets');
		} else {
			goto('/login');
		}
	});
</script>
