<script lang="ts">
  import { listSections, deleteFile, getConfig, updateConfig } from '../../../lib/github';
  import type { RepoInfo, SiteSection } from '../../../lib/types';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  let { repo, onEdit, onNew }: {
    repo: RepoInfo;
    onEdit: (path: string) => void;
    onNew: () => void;
  } = $props();

  let sections = $state<SiteSection[]>([]);
  let loading = $state(true);
  let error = $state('');
  let deleteTarget = $state<SiteSection | null>(null);
  let confirmOpen = $state(false);
  let dragIdx = $state<number | null>(null);

  async function load() {
    loading = true;
    error = '';
    try {
      sections = await listSections(repo.owner, repo.name);
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  load();

  function requestDelete(section: SiteSection) {
    deleteTarget = section;
    confirmOpen = true;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteFile(repo.owner, repo.name, deleteTarget.path, deleteTarget.sha, `Delete section: ${deleteTarget.title}`);
      // Also remove from _config.yml header_pages
      try {
        const { config, sha } = await getConfig(repo.owner, repo.name);
        config.header_pages = config.header_pages.filter((p) => p !== deleteTarget!.filename);
        await updateConfig(repo.owner, repo.name, config, sha);
      } catch {
        // Config update is best-effort
      }
      sections = sections.filter((s) => s.path !== deleteTarget!.path);
    } catch (e: any) {
      error = e.message;
    }
    deleteTarget = null;
  }

  function handleDragStart(idx: number) {
    dragIdx = idx;
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    sections = reordered;
    dragIdx = null;

    // Update _config.yml header_pages order
    try {
      const { config, sha } = await getConfig(repo.owner, repo.name);
      config.header_pages = sections.map((s) => s.filename);
      await updateConfig(repo.owner, repo.name, config, sha);
    } catch (e: any) {
      error = e.message;
    }
  }
</script>

<div class="max-w-4xl mx-auto p-6">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-xl font-bold text-text">Sections</h2>
    <button
      onclick={onNew}
      class="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md"
    >
      Add Section
    </button>
  </div>

  {#if loading}
    <p class="text-sm text-text-muted">Loading sections...</p>
  {:else if error}
    <p class="text-sm text-error">{error}</p>
  {:else if sections.length === 0}
    <p class="text-sm text-text-muted">No sections found. Add one to get started.</p>
  {:else}
    <div class="border border-border rounded-md divide-y divide-border bg-surface">
      {#each sections as section, idx}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          role="listitem"
          draggable="true"
          ondragstart={() => handleDragStart(idx)}
          ondragover={handleDragOver}
          ondrop={() => handleDrop(idx)}
          class="flex items-center justify-between px-4 py-3 hover:bg-surface-alt cursor-grab active:cursor-grabbing"
        >
          <div class="flex items-center gap-3">
            <span class="text-text-muted">&#x2630;</span>
            <div>
              <button onclick={() => onEdit(section.path)} class="text-sm font-medium text-text hover:text-primary">
                {section.title}
              </button>
              <p class="text-xs text-text-muted">{section.permalink}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            {#if section.visible}
              <span class="text-xs px-1.5 py-0.5 bg-success-light text-success rounded">In nav</span>
            {:else}
              <span class="text-xs px-1.5 py-0.5 bg-surface-alt text-text-muted rounded">Hidden</span>
            {/if}
            <button onclick={() => onEdit(section.path)} class="text-xs text-primary hover:text-primary-hover">Edit</button>
            <button onclick={() => requestDelete(section)} class="text-xs text-error hover:text-error/80">Delete</button>
          </div>
        </div>
      {/each}
    </div>
    <p class="text-xs text-text-muted mt-2">Drag to reorder. Order is saved to _config.yml header_pages.</p>
  {/if}

  <ConfirmDialog
    bind:open={confirmOpen}
    title="Delete Section"
    message={`Are you sure you want to delete "${deleteTarget?.title}"? This will remove the file and its navigation entry.`}
    confirmLabel="Delete"
    onConfirm={confirmDelete}
  />
</div>
