<script lang="ts">
  import { getConfig, updateConfig } from '../../../lib/github';
  import { storage } from '../../../lib/storage';
  import { applyColorMode } from '../../../lib/color-mode';
  import type { RepoInfo, JekyllConfig, ColorMode } from '../../../lib/types';

  let { repo }: { repo: RepoInfo } = $props();

  // Site settings
  let title = $state('');
  let description = $state('');
  let permalink = $state('/:title/');
  let configSha = $state('');
  let fullConfig = $state<JekyllConfig | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let saveStatus = $state<'idle' | 'saved' | 'error'>('idle');
  let errorMsg = $state('');

  // Appearance
  let colorMode = $state<ColorMode>('system');

  const permalinkOptions = [
    { value: '/:title/', label: '/:title/' },
    { value: '/:year/:month/:title/', label: '/:year/:month/:title/' },
    { value: '/blog/:title/', label: '/blog/:title/' },
  ];

  async function loadConfig() {
    loading = true;
    try {
      const { config, sha } = await getConfig(repo.owner, repo.name);
      title = config.title ?? '';
      description = config.description ?? '';
      permalink = (config as any).permalink ?? '/:title/';
      configSha = sha;
      fullConfig = config;
    } catch (e: any) {
      errorMsg = e.message;
    } finally {
      loading = false;
    }
  }

  async function loadColorMode() {
    const stored = await storage.getColorMode();
    colorMode = stored ?? 'system';
  }

  loadConfig();
  loadColorMode();

  async function saveConfig() {
    if (!fullConfig) return;
    saving = true;
    saveStatus = 'idle';
    errorMsg = '';
    try {
      const updated = { ...fullConfig, title, description, permalink };
      configSha = await updateConfig(repo.owner, repo.name, updated, configSha);
      fullConfig = updated;
      saveStatus = 'saved';
      setTimeout(() => { if (saveStatus === 'saved') saveStatus = 'idle'; }, 2000);
    } catch (e: any) {
      saveStatus = 'error';
      errorMsg = e.message;
    } finally {
      saving = false;
    }
  }

  function setColorMode(mode: ColorMode) {
    colorMode = mode;
    storage.setColorMode(mode);
    applyColorMode(mode);
  }
</script>

<div class="max-w-lg mx-auto p-6">
  <h2 class="text-xl font-bold text-text mb-6">Settings</h2>

  <!-- Site Settings -->
  <section class="mb-8">
    <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4">Site Settings</h3>
    {#if loading}
      <p class="text-sm text-text-muted">Loading configuration...</p>
    {:else if errorMsg && !fullConfig}
      <p class="text-sm text-error">{errorMsg}</p>
    {:else}
      <div class="space-y-4">
        <div>
          <label for="site-title" class="block text-sm font-medium text-text mb-1">Blog Title</label>
          <input
            id="site-title"
            type="text"
            bind:value={title}
            class="w-full px-3 py-2 text-sm bg-surface border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
        <div>
          <label for="site-desc" class="block text-sm font-medium text-text mb-1">Description</label>
          <input
            id="site-desc"
            type="text"
            bind:value={description}
            class="w-full px-3 py-2 text-sm bg-surface border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
        <div>
          <label for="permalink" class="block text-sm font-medium text-text mb-1">Permalink Format</label>
          <select
            id="permalink"
            bind:value={permalink}
            class="w-full px-3 py-2 text-sm bg-surface border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          >
            {#each permalinkOptions as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
        <div class="flex items-center gap-3">
          <button
            onclick={saveConfig}
            disabled={saving}
            class="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {#if saveStatus === 'saved'}
            <span class="text-sm text-success">Saved</span>
          {:else if saveStatus === 'error'}
            <span class="text-sm text-error">{errorMsg}</span>
          {/if}
        </div>
      </div>
    {/if}
  </section>

  <!-- Appearance -->
  <section>
    <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4">Appearance</h3>
    <div>
      <span class="block text-sm font-medium text-text mb-2">Color Mode</span>
      <div class="inline-flex rounded-md border border-border overflow-hidden">
        {#each (['light', 'system', 'dark'] as const) as mode}
          <button
            onclick={() => setColorMode(mode)}
            class="px-4 py-1.5 text-sm font-medium capitalize {colorMode === mode ? 'bg-primary-light text-primary' : 'bg-surface text-text-muted hover:text-text hover:bg-surface-alt'} {mode !== 'light' ? 'border-l border-border' : ''}"
          >
            {mode}
          </button>
        {/each}
      </div>
    </div>
  </section>
</div>
