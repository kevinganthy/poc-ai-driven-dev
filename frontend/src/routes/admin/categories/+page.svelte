<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getToken } from '$lib/stores/auth.svelte.ts';
	import { decodeTokenPayload } from '$lib/utils.ts';
	import {
		getAllCategoriesAdmin,
		createCategory,
		updateCategory,
		deleteCategory,
		restoreCategory,
	} from '$lib/api/categories.ts';
	import type { Category } from '$lib/api/categories.ts';

	let categories = $state<Category[]>([]);
	let loading = $state(false);
	let error = $state('');
	let editingId = $state<number | null>(null);
	let editName = $state('');
	let newName = $state('');
	let submitting = $state(false);

	let activeCategories = $derived(categories.filter((c) => !c.deletedAt));
	let deletedCategories = $derived(categories.filter((c) => !!c.deletedAt));

	async function fetchCategories() {
		const token = getToken();
		if (!token) return;
		loading = true;
		error = '';
		try {
			categories = await getAllCategoriesAdmin(token);
		} catch (err: unknown) {
			const e = err as { message?: string };
			error = e.message ?? 'Erreur lors du chargement des catégories.';
		} finally {
			loading = false;
		}
	}

	async function handleCreate() {
		const token = getToken();
		if (!token || !newName.trim()) return;
		submitting = true;
		error = '';
		try {
			await createCategory(token, newName.trim());
			newName = '';
			await fetchCategories();
		} catch (err: unknown) {
			const e = err as { message?: string };
			error = e.message ?? 'Erreur lors de la création.';
		} finally {
			submitting = false;
		}
	}

	function startEdit(category: Category) {
		editingId = category.id;
		editName = category.name;
	}

	function cancelEdit() {
		editingId = null;
		editName = '';
	}

	async function handleUpdate() {
		const token = getToken();
		if (!token || editingId === null || !editName.trim()) return;
		submitting = true;
		error = '';
		try {
			await updateCategory(token, editingId, editName.trim());
			editingId = null;
			editName = '';
			await fetchCategories();
		} catch (err: unknown) {
			const e = err as { message?: string };
			error = e.message ?? 'Erreur lors de la modification.';
		} finally {
			submitting = false;
		}
	}

	async function handleDelete(id: number) {
		const token = getToken();
		if (!token) return;
		error = '';
		try {
			await deleteCategory(token, id);
			await fetchCategories();
		} catch (err: unknown) {
			const e = err as { message?: string };
			error = e.message ?? 'Erreur lors de la suppression.';
		}
	}

	async function handleRestore(id: number) {
		const token = getToken();
		if (!token) return;
		error = '';
		try {
			await restoreCategory(token, id);
			await fetchCategories();
		} catch (err: unknown) {
			const e = err as { message?: string };
			error = e.message ?? 'Erreur lors de la restauration.';
		}
	}

	onMount(() => {
		const token = getToken();
		if (!token) {
			goto('/login');
			return;
		}
		const payload = decodeTokenPayload(token);
		if (payload?.role !== 'admin') {
			goto('/tickets');
			return;
		}
		fetchCategories();
	});
</script>

<main>
	<h1>Gestion des catégories</h1>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	<section>
		<h2>Créer une catégorie</h2>
		<form onsubmit={(e) => { e.preventDefault(); handleCreate(); }}>
			<input
				type="text"
				bind:value={newName}
				placeholder="Nom de la catégorie"
				maxlength="50"
				disabled={submitting}
			/>
			<button type="submit" disabled={submitting || !newName.trim()}>Créer</button>
		</form>
	</section>

	{#if loading}
		<p>Chargement...</p>
	{:else}
		<section>
			<h2>Catégories actives ({activeCategories.length})</h2>
			{#if activeCategories.length === 0}
				<p>Aucune catégorie active.</p>
			{:else}
				<ul>
					{#each activeCategories as category (category.id)}
						<li>
							{#if editingId === category.id}
								<input
									type="text"
									bind:value={editName}
									maxlength="50"
									disabled={submitting}
								/>
								<button onclick={handleUpdate} disabled={submitting || !editName.trim()}>Valider</button>
								<button onclick={cancelEdit} disabled={submitting}>Annuler</button>
							{:else}
								<span>{category.name}</span>
								<button onclick={() => startEdit(category)}>Renommer</button>
								<button onclick={() => handleDelete(category.id)}>Supprimer</button>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		{#if deletedCategories.length > 0}
			<section>
				<h2>Catégories supprimées ({deletedCategories.length})</h2>
				<ul class="deleted">
					{#each deletedCategories as category (category.id)}
						<li>
							<span>{category.name}</span>
							<button onclick={() => handleRestore(category.id)}>Restaurer</button>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}
</main>

<style>
	.error {
		color: red;
	}

	.deleted {
		opacity: 0.5;
	}
</style>
