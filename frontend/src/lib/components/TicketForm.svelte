<script lang="ts">
	import { untrack } from 'svelte';
	import type { Ticket } from '$lib/types.ts';

	type SubmitData = { title: string; description: string; status?: string };

	interface Props {
		initialValues?: Partial<Ticket>;
		isAdmin: boolean;
		loading: boolean;
		onsubmit: (data: SubmitData) => void;
	}

	const { initialValues, isAdmin, loading, onsubmit }: Props = $props();

	// untrack: form fields are initialized once from props — no reactive dependency desired
	let title = $state(untrack(() => initialValues?.title ?? ''));
	let description = $state(untrack(() => initialValues?.description ?? ''));
	let status = $state(untrack(() => initialValues?.status ?? 'open'));
	let titleError = $state('');
	let descriptionError = $state('');

	function validate(): boolean {
		titleError = '';
		descriptionError = '';
		let valid = true;
		if (title.length < 3 || title.length > 100) {
			titleError = 'Le titre doit contenir entre 3 et 100 caractères.';
			valid = false;
		}
		if (description.length < 10 || description.length > 1000) {
			descriptionError = 'La description doit contenir entre 10 et 1000 caractères.';
			valid = false;
		}
		return valid;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!validate()) return;
		const data: SubmitData = { title, description };
		if (isAdmin) data.status = status;
		onsubmit(data);
	}
</script>

<form onsubmit={handleSubmit}>
	<label>
		Titre
		<input type="text" bind:value={title} required />
	</label>
	{#if titleError}
		<p class="error">{titleError}</p>
	{/if}
	<label>
		Description
		<textarea bind:value={description} required></textarea>
	</label>
	{#if descriptionError}
		<p class="error">{descriptionError}</p>
	{/if}
	{#if isAdmin}
		<label>
			Statut
			<select bind:value={status}>
				<option value="open">Open</option>
				<option value="in-progress">In Progress</option>
				<option value="closed">Closed</option>
			</select>
		</label>
	{/if}
	<button type="submit" disabled={loading}>
		{loading ? 'Enregistrement...' : 'Enregistrer'}
	</button>
</form>
