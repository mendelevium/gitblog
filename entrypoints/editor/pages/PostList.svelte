<script lang="ts">
  import { listPosts, deleteFile } from '../../../lib/github';
  import type { RepoInfo, BlogPost } from '../../../lib/types';
  import FileList from '../components/FileList.svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  let { repo, onEdit, onNew }: {
    repo: RepoInfo;
    onEdit: (path: string) => void;
    onNew: () => void;
  } = $props();

  let posts = $state<BlogPost[]>([]);
  let loading = $state(true);
  let error = $state('');
  let deleteTarget = $state<BlogPost | null>(null);
  let confirmOpen = $state(false);

  async function load() {
    loading = true;
    error = '';
    try {
      posts = await listPosts(repo.owner, repo.name);
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  load();

  function requestDelete(item: { path: string }) {
    deleteTarget = posts.find((p) => p.path === item.path) ?? null;
    if (deleteTarget) confirmOpen = true;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteFile(repo.owner, repo.name, deleteTarget.path, deleteTarget.sha, `Delete post: ${deleteTarget.title}`);
      posts = posts.filter((p) => p.path !== deleteTarget!.path);
    } catch (e: any) {
      error = e.message;
    }
    deleteTarget = null;
  }
</script>

<div class="max-w-4xl mx-auto p-6">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-xl font-bold text-text">Posts</h2>
    <button
      onclick={onNew}
      class="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md"
    >
      New Post
    </button>
  </div>

  {#if loading}
    <p class="text-sm text-text-muted">Loading posts...</p>
  {:else if error}
    <p class="text-sm text-error">{error}</p>
  {:else}
    <FileList items={posts} {onEdit} onDelete={requestDelete} />
  {/if}

  <ConfirmDialog
    bind:open={confirmOpen}
    title="Delete Post"
    message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
    confirmLabel="Delete"
    onConfirm={confirmDelete}
  />
</div>
