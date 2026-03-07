<script lang="ts">
	import { goto } from '$app/navigation';
	import { login } from '$lib/api/auth.ts';
	import { setToken } from '$lib/stores/auth.svelte.ts';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		if (password.length < 8) {
			error = 'Le mot de passe doit contenir au moins 8 caractères.';
			return;
		}
		loading = true;
		try {
			const { token } = await login(email, password);
			setToken(token);
			goto('/tickets');
		} catch (err: unknown) {
			const e = err as { status?: number; error?: string };
			error = e.status === 401 ? 'Identifiants invalides.' : (e.error ?? 'Une erreur est survenue.');
		} finally {
			loading = false;
		}
	}
</script>

<main>
	<h1>Connexion</h1>
	<form onsubmit={handleSubmit}>
		<label>
			Email
			<input type="email" bind:value={email} required autocomplete="email" />
		</label>
		<label>
			Mot de passe
			<input type="password" bind:value={password} required autocomplete="current-password" />
		</label>
		{#if error}
			<p class="error">{error}</p>
		{/if}
		<button type="submit" disabled={loading}>
			{loading ? 'Connexion...' : 'Se connecter'}
		</button>
	</form>
	<p>Pas de compte ? <a href="/register">S'inscrire</a></p>
</main>
