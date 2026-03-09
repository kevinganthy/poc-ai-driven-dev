<script lang="ts">
  import { onMount } from 'svelte';
  import { getAllCategories, type Category } from '../api/categories';

  interface Props {
    value?: number;
    onchange?: (categoryId: number | undefined) => void;
  }

  let { value, onchange }: Props = $props();

  let categories = $state<Category[]>([]);

  onMount(async () => {
    categories = await getAllCategories();
  });

  function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newValue = target.value === '' ? undefined : parseInt(target.value, 10);
    onchange?.(newValue);
  }
</script>

<select value={value?.toString() ?? ''} onchange={handleChange}>
  <option value="">— No category</option>
  {#each categories as category (category.id)}
    <option value={category.id}>{category.name}</option>
  {/each}
</select>

<style>
  select {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    font-size: 1rem;
  }
</style>
