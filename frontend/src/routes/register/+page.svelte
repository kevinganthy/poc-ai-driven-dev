<script lang="ts">
	import { goto } from '$app/navigation';
	import { register } from '$lib/api/auth.ts';

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
			await register(email, password);
			goto('/login');
		} catch (err: unknown) {
			const e = err as { status?: number; error?: string };
			error =
				e.status === 409
					? 'Cette adresse email est déjà utilisée.'
					: (e.error ?? 'Une erreur est survenue.');
		} finally {
			loading = false;
		}
	}
</script>

<main>
	<h1>Inscription</h1>
	<form onsubmit={handleSubmit}>
		<label>
			Email
			<input type="email" bind:value={email} required autocomplete="email" />
		</label>
		<label>
			Mot de passe
			<input type="password" bind:value={password} required autocomplete="new-password" />
		</label>
		{#if error}
			<p class="error">{error}</p>
		{/if}
		<button type="submit" disabled={loading}>
			{loading ? 'Inscription...' : "S'inscrire"}
		</button>
	</form>
	<p>Déjà un compte ? <a href="/login">Se connecter</a></p>
</main>
