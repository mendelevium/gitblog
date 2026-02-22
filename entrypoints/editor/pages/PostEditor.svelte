<script lang="ts">
  import { getPost, createFile, updateFile, ConflictError } from '../../../lib/github';
  import { serializeFrontMatter, generatePostFilename } from '../../../lib/jekyll';
  import type { RepoInfo } from '../../../lib/types';
  import FrontMatterForm from '../components/FrontMatterForm.svelte';
  import MarkdownEditor from '../components/MarkdownEditor.svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  let { repo, path, onBack, syncStatus = $bindable('idle') }: {
    repo: RepoInfo;
    path?: string;
    onBack: () => void;
    syncStatus: 'idle' | 'saving' | 'error' | 'conflict';
  } = $props();

  let title = $state('');
  let date = $state(new Date().toISOString().slice(0, 10));
  let tags = $state('');
  let category = $state('');
  let content = $state('');
  let sha = $state('');
  let loading = $state(false);
  let conflictOpen = $state(false);
  let isDraft = $state(false);
  let loaded = false;

  async function load() {
    if (!path) return;
    loading = true;
    try {
      const post = await getPost(repo.owner, repo.name, path);
      title = post.title;
      date = post.date;
      tags = post.tags.join(', ');
      category = post.category;
      content = post.content;
      sha = post.sha;
      isDraft = post.isDraft;
    } catch (e: any) {
      syncStatus = 'error';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (path && !loaded) {
      loaded = true;
      load();
    }
  });

  function buildFileContent() {
    const fm: Record<string, unknown> = {
      layout: 'post',
      title,
      date,
    };
    const parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (parsedTags.length) fm.tags = parsedTags;
    if (category) fm.category = category;
    return serializeFrontMatter(fm, content);
  }

  async function save(asDraft = false) {
    syncStatus = 'saving';
    try {
      const dir = asDraft ? '_drafts' : '_posts';
      const filename = generatePostFilename(title, date);
      const filePath = `${dir}/${filename}`;
      const fileContent = buildFileContent();
      const message = sha ? `Update post: ${title}` : `Add post: ${title}`;

      if (sha && path) {
        // If moving between drafts/posts, we need to create+delete
        if ((asDraft && !path.startsWith('_drafts/')) || (!asDraft && path.startsWith('_drafts/'))) {
          // Create in new location, keeping old sha for the delete
          const newSha = await createFile(repo.owner, repo.name, filePath, fileContent, message);
          await import('../../../lib/github').then((gh) =>
            gh.deleteFile(repo.owner, repo.name, path!, sha, `Move post: ${title}`),
          );
          sha = newSha;
          path = filePath;
        } else {
          sha = await updateFile(repo.owner, repo.name, path, sha, fileContent, message);
        }
      } else {
        sha = await createFile(repo.owner, repo.name, filePath, fileContent, message);
        path = filePath;
      }
      isDraft = asDraft;
      syncStatus = 'idle';
    } catch (e: any) {
      if (e instanceof ConflictError) {
        syncStatus = 'conflict';
        conflictOpen = true;
      } else {
        syncStatus = 'error';
      }
    }
  }

  async function handleConflictOverwrite() {
    // Re-fetch to get current sha, then save
    if (!path) return;
    const post = await getPost(repo.owner, repo.name, path);
    sha = post.sha;
    await save(isDraft);
  }

  async function handleConflictReload() {
    if (!path) return;
    await load();
    syncStatus = 'idle';
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="flex items-center gap-3 px-4 py-2 border-b border-border bg-surface shrink-0">
    <button onclick={onBack} class="text-sm text-text-muted hover:text-text">&larr; Back</button>
    <div class="ml-auto flex items-center gap-2">
      <button
        onclick={() => save(true)}
        disabled={!title || syncStatus === 'saving'}
        class="px-3 py-1.5 text-sm border border-border rounded-md text-text-muted hover:text-text disabled:opacity-50"
      >
        Save Draft
      </button>
      <button
        onclick={() => save(false)}
        disabled={!title || syncStatus === 'saving'}
        class="px-3 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md disabled:opacity-50"
      >
        {syncStatus === 'saving' ? 'Saving...' : 'Publish'}
      </button>
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center flex-1">
      <p class="text-sm text-text-muted">Loading...</p>
    </div>
  {:else}
    <!-- Front matter -->
    <FrontMatterForm mode="post" bind:title bind:date bind:tags bind:category permalink="" layout="post" />

    <!-- Editor -->
    <div class="flex-1 min-h-0">
      <MarkdownEditor bind:value={content} {repo} />
    </div>
  {/if}

  <ConfirmDialog
    bind:open={conflictOpen}
    title="Conflict Detected"
    message="This file was modified externally. What would you like to do?"
    confirmLabel="Overwrite"
    cancelLabel="Reload"
    variant="warning"
    onConfirm={handleConflictOverwrite}
    onCancel={handleConflictReload}
  />
</div>
