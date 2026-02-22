<script lang="ts">
  import { storage } from '../../lib/storage';
  import { initColorMode } from '../../lib/color-mode';
  import type { RepoInfo, View } from '../../lib/types';
  import PostList from './pages/PostList.svelte';
  import PostEditor from './pages/PostEditor.svelte';
  import SectionList from './pages/SectionList.svelte';
  import SectionEditor from './pages/SectionEditor.svelte';
  import Settings from './pages/Settings.svelte';
  import StatusBar from './components/StatusBar.svelte';

  let repo = $state<RepoInfo | null>(null);
  let view = $state<View>({ kind: 'post-list' });
  let syncStatus = $state<'idle' | 'saving' | 'error' | 'conflict'>('idle');
  let errorMessage = $state('');

  async function init() {
    initColorMode();
    repo = (await storage.getRepo()) ?? null;
    if (!repo) {
      errorMessage = 'No repository selected. Use the popup to select one.';
    }
  }

  init();

  // Listen for repo changes from popup
  storage.onChanged((changes, area) => {
    if (area === 'sync' && changes.repo) {
      repo = changes.repo.newValue ?? null;
      view = { kind: 'post-list' };
    }
  });

  function navigate(v: View) {
    view = v;
  }

  let activeTab = $derived(
    view.kind === 'settings' ? 'settings' : view.kind.startsWith('post') ? 'posts' : 'sections',
  );
</script>

<div class="h-screen bg-surface-alt flex flex-col">
  <header class="bg-surface border-b border-border px-6 py-3 flex items-center gap-6 shrink-0">
    <h1 class="text-lg font-bold text-text">GitBlog</h1>
    {#if repo}
      <span class="text-sm text-text-muted">{repo.fullName}</span>
    {/if}
    <nav class="flex gap-1 ml-auto">
      <button
        onclick={() => navigate({ kind: 'post-list' })}
        class="px-3 py-1.5 text-sm font-medium rounded-md {activeTab === 'posts' ? 'bg-primary-light text-primary' : 'text-text-muted hover:text-text hover:bg-surface-alt'}"
      >
        Posts
      </button>
      <button
        onclick={() => navigate({ kind: 'section-list' })}
        class="px-3 py-1.5 text-sm font-medium rounded-md {activeTab === 'sections' ? 'bg-primary-light text-primary' : 'text-text-muted hover:text-text hover:bg-surface-alt'}"
      >
        Sections
      </button>
    </nav>
    <button
      onclick={() => navigate({ kind: 'settings' })}
      class="p-1.5 rounded-md {activeTab === 'settings' ? 'bg-primary-light text-primary' : 'text-text-muted hover:text-text hover:bg-surface-alt'}"
      title="Settings"
    >
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    </button>
  </header>

  <main class="flex-1 overflow-auto">
    {#if !repo}
      <div class="flex items-center justify-center h-full">
        <p class="text-text-muted">{errorMessage || 'Loading...'}</p>
      </div>
    {:else if view.kind === 'post-list'}
      <PostList {repo} onEdit={(path) => navigate({ kind: 'post-editor', path })} onNew={() => navigate({ kind: 'post-editor' })} />
    {:else if view.kind === 'post-editor'}
      <PostEditor {repo} path={view.path} onBack={() => navigate({ kind: 'post-list' })} bind:syncStatus />
    {:else if view.kind === 'section-list'}
      <SectionList {repo} onEdit={(path) => navigate({ kind: 'section-editor', path })} onNew={() => navigate({ kind: 'section-editor' })} />
    {:else if view.kind === 'section-editor'}
      <SectionEditor {repo} path={view.path} onBack={() => navigate({ kind: 'section-list' })} bind:syncStatus />
    {:else if view.kind === 'settings'}
      <Settings {repo} />
    {/if}
  </main>

  <StatusBar {syncStatus} {errorMessage} />
</div>
