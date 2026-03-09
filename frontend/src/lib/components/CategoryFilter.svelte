<script lang="ts">
  import { onMount } from 'svelte';
  import { getAllCategories, type Category } from '../api/categories';

  interface Props {
    selectedIds?: number[];
    onchange?: (categoryIds: number[]) => void;
  }

  let { selectedIds = [], onchange }: Props = $props();

  let categories = $state<Category[]>([]);

  onMount(async () => {
    categories = await getAllCategories();
  });

  let selected: Record<number, boolean> = $derived.by(() => {
    const map: Record<number, boolean> = {};
    categories.forEach(cat => {
      map[cat.id] = selectedIds.includes(cat.id);
    });
    return map;
  });

  function handleChange(categoryId: number, checked: boolean) {
    const newIds = checked
      ? [...selectedIds, categoryId]
      : selectedIds.filter(id => id !== categoryId);
    onchange?.(newIds);
  }
</script>

<fieldset>
  <legend>Categories</legend>
  <div class="checkbox-group">
    {#each categories as category (category.id)}
      <label>
        <input
          type="checkbox"
          checked={selected[category.id]}
          onchange={(e) => handleChange(category.id, e.currentTarget.checked)}
        />
        {category.name}
      </label>
    {/each}
  </div>
</fieldset>

<style>
  fieldset {
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  legend {
    font-weight: 500;
  }

  .checkbox-group {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  input[type='checkbox'] {
    cursor: pointer;
  }
</style>
