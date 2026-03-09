<script lang="ts">
  interface Props {
    name: string;
  }

  let { name }: Props = $props();
</script>

<span class="tag">{name}</span>

<style>
  .tag {
    display: inline-block;
    background-color: #e0e0e0;
    color: #333;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
  }
</style>
