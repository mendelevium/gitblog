<script lang="ts">
  import { getSection, createFile, updateFile, getConfig, updateConfig, ConflictError } from '../../../lib/github';
  import { serializeFrontMatter } from '../../../lib/jekyll';
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
  let permalink = $state('');
  let layout = $state('page');
  let content = $state('');
  let sha = $state('');
  let loading = $state(false);
  let conflictOpen = $state(false);
  let loaded = false;

  async function load() {
    if (!path) return;
    loading = true;
    try {
      const section = await getSection(repo.owner, repo.name, path);
      title = section.title;
      permalink = section.permalink;
      layout = section.layout;
      content = section.content;
      sha = section.sha;
    } catch {
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
      layout,
      title,
      permalink: permalink || `/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}/`,
    };
    return serializeFrontMatter(fm, content);
  }

  async function save() {
    syncStatus = 'saving';
    try {
      const fileContent = buildFileContent();
      const filename = path
        ? path.split('/').pop()!
        : `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.md`;
      const filePath = path ?? filename;
      const message = sha ? `Update section: ${title}` : `Add section: ${title}`;

      if (sha && path) {
        sha = await updateFile(repo.owner, repo.name, path, sha, fileContent, message);
      } else {
        sha = await createFile(repo.owner, repo.name, filePath, fileContent, message);
        path = filePath;

        // Add to header_pages in _config.yml
        try {
          const { config, sha: configSha } = await getConfig(repo.owner, repo.name);
          if (!config.header_pages.includes(filename)) {
            config.header_pages.push(filename);
            await updateConfig(repo.owner, repo.name, config, configSha);
          }
        } catch {
          // Config update is best-effort
        }
      }
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
    if (!path) return;
    const section = await getSection(repo.owner, repo.name, path);
    sha = section.sha;
    await save();
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
    <div class="ml-auto">
      <button
        onclick={save}
        disabled={!title || syncStatus === 'saving'}
        class="px-3 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md disabled:opacity-50"
      >
        {syncStatus === 'saving' ? 'Saving...' : 'Save'}
      </button>
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center flex-1">
      <p class="text-sm text-text-muted">Loading...</p>
    </div>
  {:else}
    <!-- Front matter -->
    <FrontMatterForm mode="section" bind:title bind:permalink bind:layout date="" tags="" category="" />

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
