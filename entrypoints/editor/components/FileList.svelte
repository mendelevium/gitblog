<script lang="ts">
  interface FileItem {
    filename: string;
    path: string;
    title: string;
    date?: string;
    isDraft?: boolean;
  }

  let { items, onEdit, onDelete }: {
    items: FileItem[];
    onEdit: (path: string) => void;
    onDelete: (item: FileItem) => void;
  } = $props();

  let search = $state('');
  let filtered = $derived(
    search
      ? items.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()))
      : items,
  );
</script>

<div class="space-y-3">
  <input
    type="text"
    bind:value={search}
    placeholder="Search..."
    class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
  />

  {#if filtered.length === 0}
    <p class="text-sm text-text-muted py-4 text-center">No items found.</p>
  {:else}
    <div class="border border-border rounded-md divide-y divide-border bg-surface">
      {#each filtered as item}
        <div class="flex items-center justify-between px-4 py-3 hover:bg-surface-alt">
          <div class="min-w-0 flex-1">
            <button onclick={() => onEdit(item.path)} class="text-sm font-medium text-text hover:text-primary truncate block text-left">
              {item.title}
            </button>
            <div class="flex items-center gap-2 mt-0.5">
              {#if item.date}
                <span class="text-xs text-text-muted">{item.date}</span>
              {/if}
              {#if item.isDraft}
                <span class="text-xs px-1.5 py-0.5 bg-warning-light text-warning rounded">Draft</span>
              {/if}
            </div>
          </div>
          <div class="flex items-center gap-2 ml-4 shrink-0">
            <button onclick={() => onEdit(item.path)} class="text-xs text-primary hover:text-primary-hover">Edit</button>
            <button onclick={() => onDelete(item)} class="text-xs text-error hover:text-error/80">Delete</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
