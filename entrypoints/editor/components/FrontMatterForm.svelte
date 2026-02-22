<script lang="ts">
  type Mode = 'post' | 'section';

  let {
    mode,
    title = $bindable(''),
    date = $bindable(''),
    tags = $bindable(''),
    category = $bindable(''),
    permalink = $bindable(''),
    layout = $bindable('page'),
  }: {
    mode: Mode;
    title: string;
    date: string;
    tags: string;
    category: string;
    permalink: string;
    layout: string;
  } = $props();
</script>

<div class="space-y-2 px-4 py-2 border-b border-border bg-surface">
  {#if mode === 'post'}
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="block text-xs font-medium text-text-muted mb-1">
          Title
          <input
            type="text"
            bind:value={title}
            placeholder="Enter title..."
            class="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
          />
        </label>
      </div>
      <div>
        <label class="block text-xs font-medium text-text-muted mb-1">
          Date
          <input
            type="date"
            bind:value={date}
            class="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
          />
        </label>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="block text-xs font-medium text-text-muted mb-1">
          Category
          <input
            type="text"
            bind:value={category}
            placeholder="general"
            class="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
          />
        </label>
      </div>
      <div>
        <label class="block text-xs font-medium text-text-muted mb-1">
          Tags (comma-separated)
          <input
            type="text"
            bind:value={tags}
            placeholder="tag1, tag2, tag3"
            class="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
          />
        </label>
      </div>
    </div>
  {:else}
    <div class="flex gap-2">
      <div class="flex-1 min-w-0">
        <label class="block text-xs font-medium text-text-muted mb-1">
          Title
          <input
            type="text"
            bind:value={title}
            placeholder="Enter title..."
            class="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
          />
        </label>
      </div>
      <div class="w-40 shrink-0">
        <label class="block text-xs font-medium text-text-muted mb-1">
          Permalink
          <input
            type="text"
            bind:value={permalink}
            placeholder="/about/"
            class="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
          />
        </label>
      </div>
      <div class="w-40 shrink-0">
        <label class="block text-xs font-medium text-text-muted mb-1">
          Layout
          <select
            bind:value={layout}
            class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary mt-1"
          >
            <option value="page">page</option>
            <option value="default">default</option>
          </select>
        </label>
      </div>
    </div>
  {/if}
</div>
